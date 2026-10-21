#!/bin/sh
# ACET SkillUp backups (H1). Runs in the `backup` service (mongo:7 image, which ships the
# database tools). Once a day at BACKUP_TIME (HH:MM, server time) it writes
#   /backups/skillup-<UTC timestamp>.archive.gz   mongodump of the whole database
#   /backups/uploads-<UTC timestamp>.tar.gz       uploaded files (notes, videos, voice)
# checks the dump can be read back, and deletes backups older than BACKUP_RETENTION_DAYS.
#
#   backup.sh          run forever (the service's command)
#   backup.sh --once   take one backup now and exit (manual / CI)
set -eu

: "${MONGO_BACKUP_URI:?MONGO_BACKUP_URI is required}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
UPLOADS_DIR="${UPLOADS_DIR:-/data/uploads}"
BACKUP_TIME="${BACKUP_TIME:-02:30}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) backup: $*"; }

take_backup() {
  stamp="$(date -u +%Y%m%d-%H%M%S)"
  dump="$BACKUP_DIR/skillup-$stamp.archive.gz"
  mkdir -p "$BACKUP_DIR"

  log "dumping database to $dump"
  mongodump --uri="$MONGO_BACKUP_URI" --archive="$dump.part" --gzip --quiet
  # Read the archive back without writing anything, so a corrupt dump is noticed today.
  mongorestore --uri="$MONGO_BACKUP_URI" --archive="$dump.part" --gzip --dryRun --quiet
  mv "$dump.part" "$dump"

  if [ -d "$UPLOADS_DIR" ]; then
    up="$BACKUP_DIR/uploads-$stamp.tar.gz"
    log "archiving uploads to $up"
    tar -czf "$up.part" -C "$UPLOADS_DIR" .
    mv "$up.part" "$up"
  fi

  # Retention: keep RETENTION_DAYS days of backups.
  find "$BACKUP_DIR" -maxdepth 1 -type f \( -name 'skillup-*.archive.gz' -o -name 'uploads-*.tar.gz' \) \
    -mtime +"$((RETENTION_DAYS - 1))" -print -delete | sed 's/^/  removed old backup: /'
  log "done ($(du -sh "$BACKUP_DIR" | cut -f1) in $BACKUP_DIR)"
}

seconds_until() {
  now=$(date +%s)
  next=$(date -d "today $1" +%s)
  [ "$next" -le "$now" ] && next=$(date -d "tomorrow $1" +%s)
  echo $((next - now))
}

if [ "${1:-}" = "--once" ]; then
  take_backup
  exit 0
fi

log "scheduled daily at $BACKUP_TIME, keeping $RETENTION_DAYS days"
while true; do
  sleep "$(seconds_until "$BACKUP_TIME")"
  take_backup || log "BACKUP FAILED (will retry tomorrow)"
done
