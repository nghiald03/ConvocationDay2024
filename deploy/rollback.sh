#!/usr/bin/env bash
# Roll the convocation-checkin stack back to a backup made by backup.sh.
#
# Usage (on the server):
#   sudo /opt/convocation-checkin/scripts/rollback.sh <backup-dir> [all|db|app] [--dry-run] [--yes]
#
#   all  (default) restore the database AND the image tags (compose.yaml) from the backup
#   db   restore only the database; keep the current app images
#   app  restore only compose.yaml (image tags); keep the current database
#
# WARNING: "all" and "db" replace the live database with the backup. Anything written after the
# backup (check-ins, edits) is lost from the live DB. The replaced database is NOT deleted: it is
# renamed to <db>_pre_rollback_<timestamp>, and a fresh backup of it is taken first.
#
# Downtime: be-nest and fe are stopped only while the database is swapped (usually < 1 minute).
set -euo pipefail

STACK=${STACK:-/opt/convocation-checkin}
PROJECT=convocation-checkin
PG=${PG:-convocation-checkin-postgres-1}
DB=${DB:-convocation_checkin}
DBUSER=${DBUSER:-convocation}
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)

BK=""; MODE=all; DRY=0; YES=0
for a in "$@"; do
  case "$a" in
    all|db|app) MODE=$a ;;
    --dry-run) DRY=1 ;;
    --yes) YES=1 ;;
    -h|--help) sed -n '2,17p' "$0"; exit 0 ;;
    *) BK=$a ;;
  esac
done
[ -n "$BK" ] || { echo "Usage: $0 <backup-dir> [all|db|app] [--dry-run] [--yes]" >&2; exit 2; }
[ "$(id -u)" -eq 0 ] || exec sudo -E "$0" "$@"
BK=$(cd "$BK" && pwd)

compose() { docker compose --project-directory "$STACK" -p "$PROJECT" "$@"; }
psql_q() { docker exec -i "$PG" psql -U "$DBUSER" -d "$1" -At -v ON_ERROR_STOP=1; }
row_counts() {
  psql_q "$1" <<'SQL'
select table_schema || '.' || table_name || ' ' ||
       (xpath('/row/c/text()',
              query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text
from information_schema.tables
where table_schema in ('public', 'drizzle') and table_type = 'BASE TABLE'
order by 1;
SQL
}
images_of() { grep -oE 'image: *chalsfptu/[^ ]+' "$1" | sed 's/image: *//'; }

# ---- 1. Checks -------------------------------------------------------------------------------
echo "== Backup: $BK"
(cd "$BK" && sha256sum -c --quiet SHA256SUMS) || { echo "Checksum mismatch, aborting." >&2; exit 1; }
docker exec -i "$PG" pg_restore -l < "$BK/db.dump" > /dev/null
echo "   checksums OK, dump readable, created $(cat "$BK/created-at.txt" 2>/dev/null || echo '?')"
echo "== Mode: $MODE"

echo "== Image tags (current -> backup)"
{ diff <(images_of "$STACK/compose.yaml") <(images_of "$BK/compose.yaml") || true; } | grep -E '^[<>]' || echo "   (no difference)"

if [ "$MODE" != app ]; then
  echo "== Row counts (current live DB vs backup); lines marked < are LOST by the rollback"
  diff <(row_counts "$DB") "$BK/row-counts.txt" || true
fi

if [ "$DRY" -eq 1 ]; then echo "== Dry run: nothing changed."; exit 0; fi

if [ "$YES" -ne 1 ]; then
  read -r -p "Type ROLLBACK to continue: " ans
  [ "$ans" = ROLLBACK ] || { echo "Aborted."; exit 1; }
fi

TS=$(date -u +%Y%m%dT%H%M%SZ)

# ---- 2. Safety backup of the current state ---------------------------------------------------
echo "== Safety backup of current state"
"$SCRIPT_DIR/backup.sh" pre-rollback

# ---- 3. Pre-pull the images we are going to run (before any downtime) ------------------------
if [ "$MODE" != db ]; then
  echo "== Pulling images from backup compose.yaml"
  docker compose --project-directory "$STACK" -p "$PROJECT" -f "$BK/compose.yaml" pull be-nest-migrate be-nest fe
  cp -a "$STACK/compose.yaml" "$STACK/compose.yaml.before-rollback-$TS"
fi

# ---- 4. Database ------------------------------------------------------------------------------
if [ "$MODE" != app ]; then
  TMPDB=${DB}_restore_$TS
  OLDDB=${DB}_pre_rollback_$TS
  echo "== Restoring backup into temporary database $TMPDB (live DB untouched)"
  psql_q postgres <<<"CREATE DATABASE \"$TMPDB\" OWNER \"$DBUSER\";"
  if ! docker exec -i "$PG" pg_restore -U "$DBUSER" -d "$TMPDB" --exit-on-error --single-transaction < "$BK/db.dump"; then
    psql_q postgres <<<"DROP DATABASE IF EXISTS \"$TMPDB\";"
    echo "Restore into temp DB failed; live system untouched." >&2; exit 1
  fi
  diff <(row_counts "$TMPDB") "$BK/row-counts.txt" > /dev/null \
    || { echo "Restored row counts differ from backup, aborting (live system untouched; temp DB $TMPDB kept)." >&2; exit 1; }
  echo "   temp DB verified"

  echo "== Stopping fe and be-nest"
  compose stop fe be-nest
  echo "== Swapping databases: $DB -> $OLDDB, $TMPDB -> $DB"
  psql_q postgres <<SQL
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB' AND pid <> pg_backend_pid();
ALTER DATABASE "$DB" RENAME TO "$OLDDB";
ALTER DATABASE "$TMPDB" RENAME TO "$DB";
SQL
fi

# ---- 5. App -------------------------------------------------------------------------------------
if [ "$MODE" != db ]; then
  echo "== Restoring compose.yaml (old one saved as compose.yaml.before-rollback-$TS)"
  cp -a "$BK/compose.yaml" "$STACK/compose.yaml"
fi

echo "== Starting be-nest and fe"
compose up -d be-nest fe

echo "== Waiting for be-nest to become healthy"
for _ in $(seq 1 60); do
  s=$(docker inspect -f '{{.State.Health.Status}}' "$PROJECT-be-nest-1" 2>/dev/null || echo none)
  [ "$s" = healthy ] && break
  sleep 5
done
docker ps --format '{{.Names}}\t{{.Image}}\t{{.Status}}' | grep "$PROJECT"
echo "fe HTTP: $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/ || true)"
[ "$s" = healthy ] || { echo "be-nest is NOT healthy, check: docker logs $PROJECT-be-nest-1" >&2; exit 1; }

echo
echo "Rollback done."
[ "$MODE" != app ] && echo "Previous live DB kept as $OLDDB. Drop it when no longer needed:
  docker exec $PG psql -U $DBUSER -d postgres -c 'DROP DATABASE \"$OLDDB\";'"
exit 0
