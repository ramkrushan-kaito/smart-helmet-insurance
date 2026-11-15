const net = require('net');

const help = `
PostgreSQL is not accepting connections on localhost:5432.
This project requires PostgreSQL. It will not switch to SQLite or another database.

macOS (Homebrew):
  brew install postgresql@17
  brew services start postgresql@17
  createdb smart_helmet_insurance

Windows:
  1. Install PostgreSQL 17 from https://www.postgresql.org/download/windows/
  2. Start the PostgreSQL service.
  3. Create a database named smart_helmet_insurance in pgAdmin or psql.

Linux (Debian/Ubuntu):
  sudo apt update
  sudo apt install postgresql postgresql-contrib
  sudo service postgresql start
  sudo -u postgres createdb smart_helmet_insurance

Docker alternative (uses port 5433 so it does not clash with a local server):
  docker compose up -d
  Then set DATABASE_URL to:
  postgresql://postgres:postgres@localhost:5433/smart_helmet_insurance?schema=public

pgAdmin:
  Host localhost, port 5432 (or 5433 for Docker), database smart_helmet_insurance.
`;

const socket = net.connect({ host: '127.0.0.1', port: 5432 });
socket.setTimeout(2000);
socket.on('connect', () => {
  socket.end();
  process.exit(0);
});
socket.on('timeout', () => {
  console.error(help);
  socket.destroy();
  process.exit(1);
});
socket.on('error', () => {
  console.error(help);
  process.exit(1);
});
