#!/bin/sh
# Restore an ACET SkillUp backup (H1). Run inside the backup service:
#   docker compose -f docker-compose.prod.yml run --rm backup \
#     /scripts/restore.sh skillup-20261021-023000.archive.gz [uploads-20261021-023000.tar.gz]
# Stop api and worker first so nothing writes during the restore (see docs/deploy.md).
# --drop replaces each collection with the backup's copy; collections not in the backup stay.
set -eu

: "${MONGO_BACKUP_URI:?MONGO_BACKUP_URI is required}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
UPLOADS_DIR="${UPLOADS_DIR:-/data/uploads}"

dump="${1:?usage: restore.sh <skillup-*.archive.gz> [uploads-*.tar.gz]}"
uploads="${2:-}"
case "$dump" in /*) ;; *) dump="$BACKUP_DIR/$dump" ;; esac
[ -f "$dump" ] || { echo "no such backup: $dump" >&2; exit 1; }

echo "restoring database from $dump"
mongorestore --uri="$MONGO_BACKUP_URI" --archive="$dump" --gzip --drop

if [ -n "$uploads" ]; then
  case "$uploads" in /*) ;; *) uploads="$BACKUP_DIR/$uploads" ;; esac
  [ -f "$uploads" ] || { echo "no such uploads archive: $uploads" >&2; exit 1; }
  echo "restoring uploads from $uploads into $UPLOADS_DIR"
  tar -xzf "$uploads" -C "$UPLOADS_DIR"
fi
echo "restore complete"
