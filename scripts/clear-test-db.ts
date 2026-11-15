import { PrismaClient } from '@prisma/client';

const urlValue = process.env.DATABASE_URL;
if (!urlValue) {
  console.error('DATABASE_URL is missing.');
  process.exit(1);
}

const parsed = new URL(urlValue);
const database = parsed.pathname.replace(/^\//, '');
if (!database.endsWith('_test') || !['localhost', '127.0.0.1'].includes(parsed.hostname)) {
  console.error(`Refusing to clear ${parsed.hostname}/${database}. E2E only clears a local database whose name ends with _test.`);
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (tables.length === 0) return;
  const list = tables.map((table) => `"public"."${table.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
