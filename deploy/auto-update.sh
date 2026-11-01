#!/bin/sh
# Runs inside the auto-update container. Pulls the watched images on an interval
# and only redeploys when Docker Hub served a new image digest.
set -u

compose() {
    docker compose --project-directory /stack -f /stack/docker-compose.server.yml "$@"
}

app_services='postgres minio-init be-nest-migrate be-nest fe'

image_ids() {
    for image in $WATCHED_IMAGES; do
        docker image inspect --format '{{.Id}}' "$image" 2>/dev/null || echo missing
    done
}

echo "Watching: $WATCHED_IMAGES (every ${UPDATE_INTERVAL_SECONDS}s)"

while true; do
    before=$(image_ids)
    if compose pull --quiet be-nest-migrate be-nest fe; then
        after=$(image_ids)
        if [ "$before" != "$after" ]; then
            echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') new image detected, redeploying"
            if compose up -d $app_services; then
                docker image prune -f >/dev/null
                echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') redeploy finished"
            else
                echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') redeploy failed, will retry on the next change" >&2
            fi
        fi
    else
        echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') pull failed, retrying later" >&2
    fi
    sleep "$UPDATE_INTERVAL_SECONDS"
done
