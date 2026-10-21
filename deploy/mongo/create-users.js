// Runs once, on the first start of an empty database (docker-entrypoint-initdb.d), as root.
// Creates a least-privilege user for the app and one for backups. Passwords come from env.
const appDb = process.env.MONGO_APP_DB || 'acet_skillup';
const app = process.env.MONGO_APP_USER;
const backup = process.env.MONGO_BACKUP_USER;

if (!app || !process.env.MONGO_APP_PASSWORD) throw new Error('MONGO_APP_USER/PASSWORD not set');
if (!backup || !process.env.MONGO_BACKUP_PASSWORD)
  throw new Error('MONGO_BACKUP_USER/PASSWORD not set');

db.getSiblingDB(appDb).createUser({
  user: app,
  pwd: process.env.MONGO_APP_PASSWORD,
  roles: [{ role: 'readWrite', db: appDb }],
});
db.getSiblingDB('admin').createUser({
  user: backup,
  pwd: process.env.MONGO_BACKUP_PASSWORD,
  roles: ['backup', 'restore'],
});
print(`created users ${app} (${appDb}) and ${backup} (backup/restore)`);
