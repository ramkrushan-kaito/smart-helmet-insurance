# Testing

## Unit

```bash
npm test
```

`tests/unit/qr-token.util.spec.ts` checks valid, unassigned, unknown, foreign, malformed, expired, inactive and revoked decisions. These tests do not need PostgreSQL.

Verified on this machine: 9 passing.

## API integration

```bash
npm run test:e2e
```

The script:

1. Refuses to run unless the database name ends with `_test` and the host is localhost (or `CI=true`).
2. Runs `prisma migrate deploy`.
3. Truncates public tables in that test database only.
4. Seeds demo data.
5. Runs `tests/e2e/app.e2e-spec.ts`.

Covered: health, admin login, OTP without an SMS claim, customer isolation, helmet create, QR generate, PNG download, valid / inactive / revoked / unknown / invalid scans, claim submit, customer forbidden from status updates, admin status update, and OTP rate limit.

Verified on this machine against `smart_helmet_insurance_test`: 8 passing.

The dev database `smart_helmet_insurance` is not truncated by this command.

## Postman

1. Start the API.
2. Import `postman/smart-helmet-insurance.postman_collection.json`.
3. Import `postman/local.postman_environment.json`.
4. If the API is on port 3001, change `baseUrl` to `http://localhost:3001`.
5. Run the collection in order. Later requests use tokens saved by the test scripts.

Create-helmet uses serial `POSTMAN-SN-1`. Run it once per seeded database, or change the serial.

## CI

`.github/workflows/ci.yml` starts PostgreSQL 17, then runs unit tests and `npm run test:e2e`. It has not been executed on GitHub from this session because the project is not pushed.
