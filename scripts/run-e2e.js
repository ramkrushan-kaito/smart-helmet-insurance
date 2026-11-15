const { spawnSync } = require('child_process');
const os = require('os');

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', env: process.env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.includes('smart_helmet_insurance_test')) {
  const user = process.env.PGUSER || os.userInfo().username;
  const password = process.env.PGPASSWORD;
  const auth = password ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}` : encodeURIComponent(user);
  process.env.DATABASE_URL = `postgresql://${auth}@localhost:5432/smart_helmet_insurance_test?schema=public`;
}

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-not-for-production';
process.env.DEMO_OTP_ENABLED = 'true';
process.env.DEMO_OTP_CODE = '123456';
process.env.QR_PUBLIC_BASE_URL = process.env.QR_PUBLIC_BASE_URL || 'http://localhost:3000';
process.env.NODE_ENV = 'test';

const parsed = new URL(process.env.DATABASE_URL);
const database = parsed.pathname.replace(/^\//, '');
if (!database.endsWith('_test')) {
  console.error('Refusing to run e2e unless the database name ends with _test.');
  process.exit(1);
}
if (!['localhost', '127.0.0.1'].includes(parsed.hostname) && process.env.CI !== 'true') {
  console.error('Refusing to run e2e against a remote database.');
  process.exit(1);
}

const psql = spawnSync('psql', ['--version'], { stdio: 'ignore' });
if (psql.status === 0) {
  const admin = new URL(process.env.DATABASE_URL);
  admin.pathname = '/postgres';
  admin.search = '';
  const exists = spawnSync('psql', [admin.toString(), '-tAc', `SELECT 1 FROM pg_database WHERE datname='${database}'`], {
    encoding: 'utf8',
  });
  if (exists.status === 0 && !String(exists.stdout).includes('1')) {
    run('psql', [admin.toString(), '-c', `CREATE DATABASE "${database}"`]);
  }
}

run('npx', ['prisma', 'migrate', 'deploy']);
run('npx', ['tsx', 'scripts/clear-test-db.ts']);
run('npx', ['prisma', 'db', 'seed']);
run('npx', ['jest', '--config', 'jest-e2e.config.js', '--runInBand', '--forceExit']);
