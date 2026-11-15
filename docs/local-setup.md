# Local setup

PostgreSQL is required. The app does not fall back to SQLite or an in-memory database.

## This computer

PostgreSQL 17 from Homebrew is already running:

```bash
brew services list
pg_isready -h localhost -p 5432
```

The local role is `ramkrushna`. `pg_hba.conf` uses `trust` for localhost, so the connection string has no password:

```text
postgresql://ramkrushna@localhost:5432/smart_helmet_insurance?schema=public
```

Databases created for this project:

- `smart_helmet_insurance` — the app you use in the browser
- `smart_helmet_insurance_test` — automated API tests only

Port 3000 was already taken by another Node process (`node src/index.js`). The checked-in local `.env` therefore uses port **3001**. Stop that other process if you want the API on 3000, then change `PORT` and `QR_PUBLIC_BASE_URL`.

## Install PostgreSQL if it is missing

`npm run dev` checks that something accepts TCP connections on `127.0.0.1:5432`. If not, it prints these steps and exits.

### macOS

```bash
brew install postgresql@17
brew services start postgresql@17
createdb smart_helmet_insurance
```

### Windows

1. Install PostgreSQL 17 from https://www.postgresql.org/download/windows/
2. Start the PostgreSQL service.
3. In psql or pgAdmin, create a database named `smart_helmet_insurance`.
4. Put the user and password you chose into `DATABASE_URL`.

### Linux (Debian or Ubuntu)

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo service postgresql start
sudo -u postgres createdb smart_helmet_insurance
```

### Docker, if you do not want a system install

`docker-compose.yml` publishes PostgreSQL 17 on **port 5433** so it does not collide with a server already on 5432.

```bash
docker compose up -d
```

Then set:

```text
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/smart_helmet_insurance?schema=public"
```

## pgAdmin

1. Open pgAdmin and register a server.
2. Host `localhost`, port `5432` (or `5433` if you used Docker).
3. Maintenance database `postgres`.
4. Username `ramkrushna` on this Mac. Leave the password empty because local auth is `trust`. On Windows or Docker, use the password you set.
5. After connecting, open database `smart_helmet_insurance`.
6. Tables are in schema `public`. Demo rows include the text `DEMO DATA`.

Prisma Studio is the other viewer: `npm run db:studio` then open the URL it prints (usually http://localhost:5555).

## First run

```bash
cp .env.example .env
# edit DATABASE_URL, JWT_SECRET, PORT and QR_PUBLIC_BASE_URL
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

`db:seed` stops if users already exist. To wipe the local demo database and load it again:

```bash
CONFIRM_DB_RESET=YES npm run db:reset
```

## Environment variables

| Name | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection. Required. |
| `JWT_SECRET` | Signs access tokens. Required. |
| `JWT_EXPIRES_IN` | Default `8h`. |
| `DEMO_OTP_ENABLED` | `true` keeps the fixed demo OTP. |
| `DEMO_OTP_CODE` | `123456` in this demo. |
| `OTP_EXPIRY_SECONDS` | Default 300. |
| `OTP_MAX_REQUESTS` | Default 5 per mobile per window. |
| `OTP_WINDOW_SECONDS` | Default 900. |
| `SMS_PROVIDER` | `none` until a real provider is added. |
| `QR_PUBLIC_BASE_URL` | Origin printed inside QR codes, without a trailing slash. |
| `FRONTEND_URL` | Vite origin. Nest redirects `/scan/*` here during development. |
| `PORT` | API port. |
| `SWAGGER_ENABLED` | Set `false` to hide `/api/docs`. |

Do not commit `.env`.

## QR scanning

1. Sign in as an admin and open QR codes.
2. Generate or download a PNG. The image contains only `QR_PUBLIC_BASE_URL/scan/<token>`.
3. On this machine that URL is `http://localhost:3001/scan/<token>`. Nest redirects it to the Vite app.
4. The scan page starts the camera. If the camera is blocked, paste the token.
5. Valid, inactive, revoked, unknown and unassigned tokens show the API message. Invalid codes are not returned as success.
