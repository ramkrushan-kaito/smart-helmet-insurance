const { spawnSync } = require('child_process');
const { loadEnvFile } = require('./load-env');

loadEnvFile();

const urlValue = process.env.DATABASE_URL;
if (!urlValue) {
  console.error('DATABASE_URL is missing. Copy .env.example to .env first.');
  process.exit(1);
}

if (process.env.CONFIRM_DB_RESET !== 'YES') {
  console.error(`
This deletes EVERY row in the local smart_helmet_insurance database and loads demo data again.
It does not touch hosted databases.

Run this only when you mean to wipe the local demo database:

  CONFIRM_DB_RESET=YES npm run db:reset
`);
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(urlValue);
} catch {
  console.error('DATABASE_URL is not a valid URL.');
  process.exit(1);
}

const database = parsed.pathname.replace(/^\//, '');
if (!['localhost', '127.0.0.1'].includes(parsed.hostname) || database !== 'smart_helmet_insurance') {
  console.error(`Refusing to reset ${parsed.hostname}/${database}. This command only resets local smart_helmet_insurance.`);
  process.exit(1);
}

const result = spawnSync('npx', ['prisma', 'migrate', 'reset', '--force'], {
  stdio: 'inherit',
  env: process.env,
});
process.exit(result.status ?? 1);
