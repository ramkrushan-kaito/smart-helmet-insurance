# Deployment

Nothing was deployed from this session. Hosting and Neon both need you to sign in. Do not send database passwords or the JWT secret in chat. Do not enter a card unless you decide to pay. This guide uses only documented free tiers.

Keep the local database and the hosted database separate. Do not run `npm run db:seed` or `npm run db:reset` against the hosted URL. The Docker start command runs `prisma migrate deploy` only.

## What was checked on 15 November 2026

Neon Free, from https://neon.com/docs/introduction/plans and https://neon.com/pricing:

- $0, and Neon says the free plan does not require a credit card.
- 100 projects, 1 GB Postgres storage per project, 20 GB across the account.
- 100 CU-hours of compute per project per month. Compute scales to zero after 5 minutes idle.
- 5 GB public network transfer per project per month.
- Hitting the compute or transfer allowance suspends compute until the next month. Data is not deleted.
- A connection string looks like `postgresql://USER:PASSWORD@HOST/neondb?sslmode=require`.

App hosts, from the September 2026 survey at https://snapdeploy.dev/state-of-free-hosting and the vendors' own pages:

- Render still has a free web service: about 512 MB RAM, it sleeps after 15 minutes without traffic, and the survey says no card is required. Bandwidth on the hobby workspace was cut to 5 GB/month in April 2026. Free Render Postgres expires after 30 days, so use Neon instead of Render's database.
- Koyeb's free web service now asks for a card and a $29 authorisation hold. Do not use it if you do not want payment details stored.
- Fly.io no longer has a free allowance. The trial asks for a card.
- Railway's ongoing free plan is about $1 of credit a month, not a full always-on Node server plus a database.

A NestJS process plus the React build can be tight on 512 MB. If the free instance runs out of memory, that is a limit of the free tier, not something to solve by adding a paid instance without asking.

## Suggested free layout

1. Create a free Neon project. Copy the pooled connection string into a password manager, not into git.
2. Create a free Render web service from a Dockerfile in this repo. Do not add a paid disk or a Render database.
3. Set environment variables on Render only:

```text
NODE_ENV=production
DATABASE_URL=<neon connection string with sslmode=require>
JWT_SECRET=<long random string, different from .env>
JWT_EXPIRES_IN=8h
DEMO_OTP_ENABLED=true
DEMO_OTP_CODE=123456
SMS_PROVIDER=none
QR_PUBLIC_BASE_URL=https://<your-service>.onrender.com
FRONTEND_URL=https://<your-service>.onrender.com
SWAGGER_ENABLED=true
```

4. Deploy. Render runs the image command, which migrates and starts Node. It does not seed.
5. Open `https://<your-service>.onrender.com/api/health` and confirm `"database": "postgresql"`.
6. The first request after idle can take about a minute because Render sleeps and Neon may be suspended.
7. Generate QR codes only after `QR_PUBLIC_BASE_URL` is the HTTPS origin. Old local QR images still point at localhost.
8. Optional demo rows: from your laptop, with the Neon URL only in that shell, run `DATABASE_URL='<neon-url>' npx prisma db seed` once. Do this yourself so the password is not stored in the project. Skip it if you do not want demo people in the hosted database.

## GitHub

This folder is the whole app. Create one empty GitHub repository and push this folder. Do not push `.env`. GitHub Actions in `.github/workflows/ci.yml` uses a throwaway Postgres service and does not touch Neon.

The application code is in the private repository https://github.com/ramkrushan-kaito/smart-helmet-insurance. `.env` was not pushed. Neon and Render still need a sign-in in the browser. Free Neon does not ask for a card. Do not add a card on Render.

## If free hosting will not hold the app

Use the same image on any Node host you already have, with Neon as the database and the environment variables above. Do not point `DATABASE_URL` at your Mac. Do not run the reset script.
