# Smart Helmet QR Insurance

Local demo for registering helmets, printing a QR sticker, and looking the helmet up from PostgreSQL. The React app and the NestJS API live in this one folder. Customer and policy details are not stored inside the QR code.

This is fictional demo data. It is not an insurance company, and no SMS or payment is sent.

## Verified locally

- PostgreSQL 17 is running on this Mac as user `ramkrushna` (Homebrew, trust authentication, no password).
- Database `smart_helmet_insurance` is migrated and seeded.
- `npm test`: 9 passing.
- `npm run test:e2e`: 8 passing against `smart_helmet_insurance_test`.
- `npm run build` compiles the API and the React app.
- Port **3000 was already used** by another Node process, so this machine's `.env` uses API port **3001**. The frontend stays on port 5173.

## Run it

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

- App: http://localhost:5173
- API: http://localhost:3001/api
- Swagger: http://localhost:3001/api/docs
- PostgreSQL: localhost:5432, database `smart_helmet_insurance`

If port 3000 is free on your machine, set `PORT` and `QR_PUBLIC_BASE_URL` in `.env` back to `http://localhost:3000` before seeding. Vite reads `PORT` from `.env` for the `/api` proxy.

## Demo sign-in

| Who | Sign in | Secret |
| --- | --- | --- |
| Super admin | superadmin@demo.helmet.test | Admin@12345 |
| Admin | admin@demo.helmet.test | Admin@12345 |
| Customer | mobile 9000000001–9000000010 | OTP 123456 |

DEMO MODE does not send an SMS. The OTP response says so.

Sample scan tokens:

- `active-demo-token-hm10001` — valid helmet
- `inactive-demo-token-hm10008` — inactive
- `revoked-demo-token-hm10009` — revoked
- `unassigned-demo-token-hm10013` — helmet has no customer

Open them from the landing page, or scan with the camera, or type the token.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Checks PostgreSQL, then starts NestJS and Vite together |
| `npm run build` | Compiles the API and the React app into `dist/` |
| `npm run start:prod` | Serves the API and the built React app from NestJS |
| `npm test` | Unit tests |
| `npm run test:e2e` | Migrates and reseeds **only** `smart_helmet_insurance_test`, then runs API tests |
| `npm run db:migrate` | Applies Prisma migrations |
| `npm run db:seed` | Loads demo data. Refuses to run if the database already has users |
| `npm run db:reset` | **Deletes the local demo database.** See below |
| `npm run db:studio` | Opens Prisma Studio |

## Reset demo data

`npm run db:reset` drops and recreates the local `smart_helmet_insurance` database, then loads demo data again. It exits unless you confirm, and it refuses any host other than localhost or any database name other than `smart_helmet_insurance`.

```bash
CONFIRM_DB_RESET=YES npm run db:reset
```

Do not point this command at Neon, Supabase, or any hosted database. Production startup runs migrations only and never seeds.

## More documentation

- [Local setup and pgAdmin](docs/local-setup.md)
- [Architecture](docs/architecture.md)
- [Database schema](docs/database-schema.md)
- [ER diagram](docs/database-er-diagram.md)
- [API](docs/api-documentation.md)
- [Tests and Postman](docs/testing.md)
- [Deployment](docs/deployment.md)

## Known limits

- OTP `123456` is a demo. No SMS provider is configured.
- Payments are ledger rows. No card or UPI charge happens.
- Public QR lookup returns helmet, masked mobile, vehicle and policy status. It does not return address, documents or claim amounts.
- Inactive QR codes return HTTP 403. Revoked codes return HTTP 410.
- The camera scanner needs permission and works on `localhost` or HTTPS.
- Free hosting was not deployed from this machine. See the deployment guide and sign in yourself. Do not paste database passwords into chat.
