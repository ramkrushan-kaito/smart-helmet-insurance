# Architecture

One repository. One `package.json`. React source is `src/frontend`. NestJS source is the rest of `src`. Prisma schema and migrations are in `prisma`.

```text
Browser (Vite :5173 in development)
  /api  -->  proxy  -->  NestJS
  /scan/:token on the API redirects to Vite during development

Production
  NestJS serves dist/client and the /api routes on one port
```

## Request path

1. React uses axios with base URL `/api` and a bearer token from `localStorage`.
2. Nest global guards require a JWT, then a role, unless the route is marked public.
3. Services query PostgreSQL through Prisma.
4. Customer queries add `customerId` from the token. A customer who asks for someone else's id gets HTTP 403.
5. Mutations write an `audit_logs` row.

Public routes are health, admin login, OTP request, OTP verify, and QR scan.

## Roles

- `SUPER_ADMIN` can do everything an admin can, plus create staff and reissue a QR token.
- `ADMIN` manages customers, helmets, vehicles, products, policies, claims, payments and QR codes.
- `CUSTOMER` sees and changes only their own profile, helmets, vehicles, policies, claims, documents, renewals and notifications.

## QR codes

Generating a code creates a random token, stores it on `helmet_qr_codes`, and writes a PNG under `public/qr-codes`. The PNG encodes the scan URL only. Lookup loads the helmet from PostgreSQL and returns a limited public view.

## SMS

`SMS_PROVIDER=none` uses `DemoSmsProvider`. It logs that nothing was sent and returns `delivered: false`. Naming another provider without credentials uses the same honest result. A future provider implements `SmsProvider` and is selected in `src/notifications/sms/sms.module.ts`.

## Production process

`npm run build` runs `nest build` and `vite build`. `dist/main.js` is the API. `dist/client` is the React build. `npm run start:prod` listens on `PORT` and, when `NODE_ENV=production`, serves the React files for every GET that is not under `/api`.

The Docker command is `prisma migrate deploy && node dist/main.js`. It does not seed.
