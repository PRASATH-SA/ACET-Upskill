#!/bin/sh
# H1: proves the backup and restore procedure end to end with the real scripts and the
# production MongoDB setup (auth + keyfile replica set + least-privilege users).
# Needs Docker. Run from the repo root:  sh deploy/backup/test-backup-restore.sh
set -eu

NET=skillup-backup-test
WORK="$(mktemp -d)"
ROOT_PW=rootpw$$; APP_PW=apppw$$; BK_PW=bkpw$$
cleanup() { docker rm -f sbt-mongo >/dev/null 2>&1 || true; docker network rm "$NET" >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup

docker network create "$NET" >/dev/null
mkdir -p "$WORK/keys" "$WORK/backups" "$WORK/uploads/materials"
head -c 756 /dev/urandom | base64 > "$WORK/keys/keyfile"
echo "a lecture note" > "$WORK/uploads/materials/note.txt"

docker run -d --name sbt-mongo --network "$NET" \
  -e MONGO_INITDB_ROOT_USERNAME=root -e MONGO_INITDB_ROOT_PASSWORD="$ROOT_PW" \
  -e MONGO_APP_DB=acet_skillup -e MONGO_APP_USER=skillup -e MONGO_APP_PASSWORD="$APP_PW" \
  -e MONGO_BACKUP_USER=backup -e MONGO_BACKUP_PASSWORD="$BK_PW" \
  -v "$PWD/deploy/mongo/create-users.js:/docker-entrypoint-initdb.d/create-users.js:ro" \
  -v "$WORK/keys:/keys-src:ro" \
  --entrypoint /bin/sh mongo:7 -c \
  'cp /keys-src/keyfile /tmp/keyfile && chmod 400 /tmp/keyfile && chown 999:999 /tmp/keyfile &&
   exec docker-entrypoint.sh mongod --replSet rs0 --bind_ip_all --auth --keyFile /tmp/keyfile' >/dev/null

sh_root() { docker exec sbt-mongo mongosh --quiet -u root -p "$ROOT_PW" --authenticationDatabase admin --eval "$1"; }
echo "waiting for mongo…"
for i in $(seq 1 60); do
  if sh_root "try { rs.status().ok } catch (e) { rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: 'sbt-mongo:27017' }] }).ok }" 2>/dev/null | grep -q 1; then break; fi
  sleep 2
done
sleep 3

APP_URI="mongodb://skillup:$APP_PW@sbt-mongo:27017/acet_skillup?replicaSet=rs0&authSource=acet_skillup"
BK_URI="mongodb://backup:$BK_PW@sbt-mongo:27017/?replicaSet=rs0&authSource=admin"
mongo_run() {
  docker run --rm --network "$NET" -e MONGO_BACKUP_URI="$BK_URI" -e TZ=UTC \
    -v "$PWD/deploy/backup:/scripts:ro" -v "$WORK/backups:/backups" -v "$WORK/uploads:/data/uploads" \
    mongo:7 "$@"
}
app_eval() { docker run --rm --network "$NET" mongo:7 mongosh --quiet "$APP_URI" --eval "$1"; }

echo "1. the app user writes data"
app_eval 'db.users.insertMany([{ name: "A" }, { name: "B" }, { name: "C" }]); db.topics.insertOne({ title: "Keys" })'
echo "2. the app user cannot read other databases (least privilege)"
if app_eval 'db.getSiblingDB("admin").system.users.findOne()' >/dev/null 2>&1; then
  echo "FAIL: app user can read admin.system.users"; exit 1
fi

echo "3. take a backup with the production script"
mongo_run sh /scripts/backup.sh --once
DUMP=$(ls "$WORK/backups" | grep '^skillup-.*\.archive\.gz$' | head -1)
UPS=$(ls "$WORK/backups" | grep '^uploads-.*\.tar\.gz$' | head -1)
[ -n "$DUMP" ] && [ -n "$UPS" ] || { echo "FAIL: backup files missing"; ls -l "$WORK/backups"; exit 1; }

echo "4. disaster: data and uploads are lost"
app_eval 'db.users.drop(); db.topics.drop()'
rm -f "$WORK/uploads/materials/note.txt"

echo "5. restore with the production script"
mongo_run sh /scripts/restore.sh "$DUMP" "$UPS"

echo "6. verify"
USERS=$(app_eval 'db.users.countDocuments()')
TOPICS=$(app_eval 'db.topics.countDocuments()')
[ "$USERS" = "3" ] && [ "$TOPICS" = "1" ] || { echo "FAIL: users=$USERS topics=$TOPICS"; exit 1; }
[ "$(cat "$WORK/uploads/materials/note.txt")" = "a lecture note" ] || { echo "FAIL: uploads not restored"; exit 1; }

echo "7. retention deletes backups older than 30 days, keeps recent ones"
touch -d '40 days ago' "$WORK/backups/skillup-20200101-000000.archive.gz"
touch -d '10 days ago' "$WORK/backups/skillup-20200201-000000.archive.gz"
mongo_run sh /scripts/backup.sh --once >/dev/null
[ ! -e "$WORK/backups/skillup-20200101-000000.archive.gz" ] || { echo "FAIL: old backup kept"; exit 1; }
[ -e "$WORK/backups/skillup-20200201-000000.archive.gz" ] || { echo "FAIL: recent backup deleted"; exit 1; }

echo "BACKUP/RESTORE TEST PASSED"
