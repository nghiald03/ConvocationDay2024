#!/usr/bin/env bash
# Online backup of the convocation-checkin backend database and compose.yaml (image tags).
# Read-only: safe to run while the system is live. Does not stop or change any container.
#
# Usage (on the server):  sudo /opt/convocation-checkin/scripts/backup.sh [label]
# Output: /opt/convocation-checkin/backups/<label>-<UTC timestamp>/
set -euo pipefail

STACK=${STACK:-/opt/convocation-checkin}
PG=${PG:-convocation-checkin-postgres-1}
DB=${DB:-convocation_checkin}
DBUSER=${DBUSER:-convocation}
LABEL=${1:-manual}

[ "$(id -u)" -eq 0 ] || exec sudo -E "$0" "$@"

row_counts() {
  docker exec -i "$PG" psql -U "$DBUSER" -d "$1" -At -v ON_ERROR_STOP=1 <<'SQL'
select table_schema || '.' || table_name || ' ' ||
       (xpath('/row/c/text()',
              query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text
from information_schema.tables
where table_schema in ('public', 'drizzle') and table_type = 'BASE TABLE'
order by 1;
SQL
}

TS=$(date -u +%Y%m%dT%H%M%SZ)
DEST=$STACK/backups/$LABEL-$TS
TMP=$DEST.partial
umask 077
mkdir -p "$TMP"
trap 'echo "Backup FAILED, partial files left in $TMP" >&2' ERR

echo "Dumping $DB ..."
docker exec "$PG" pg_dump -U "$DBUSER" -d "$DB" -Fc -Z6 > "$TMP/db.dump"
docker exec "$PG" pg_dump -U "$DBUSER" -d "$DB" | gzip -6 > "$TMP/db.sql.gz"
docker exec "$PG" pg_dumpall -U "$DBUSER" --globals-only > "$TMP/globals.sql"
row_counts "$DB" > "$TMP/row-counts.txt"

cp -a "$STACK/compose.yaml" "$TMP/compose.yaml"
docker ps -a --filter label=com.docker.compose.project=convocation-checkin \
  --format '{{.Names}}\t{{.Image}}\t{{.Status}}' > "$TMP/containers.txt"
date -u +%Y-%m-%dT%H:%M:%SZ > "$TMP/created-at.txt"

# Verify the dump is readable before calling it done.
docker exec -i "$PG" pg_restore -l < "$TMP/db.dump" > /dev/null
gzip -t "$TMP/db.sql.gz"

(cd "$TMP" && sha256sum db.dump db.sql.gz globals.sql row-counts.txt compose.yaml > SHA256SUMS)
mv "$TMP" "$DEST"

echo "Backup OK: $DEST"
ls -lh "$DEST"
