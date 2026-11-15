# API

Base path: `/api`. Interactive docs: `/api/docs` (Swagger). Send `Authorization: Bearer <token>` except on the public routes.

List endpoints accept `page`, `limit` (max 100), `search`, `sort` and `order=asc|desc`. The body is `{ data, meta }`.

## Auth

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| POST | `/api/auth/admin/login` | Public | Staff email and password |
| POST | `/api/auth/request-otp` | Public | 5 requests per mobile per 15 minutes. Demo response includes `smsSent: false` |
| POST | `/api/auth/verify-otp` | Public | OTP expires in 5 minutes |
| GET | `/api/auth/me` | Signed in | Current user |

## Resources

| Method | Path | Access |
| --- | --- | --- |
| GET, POST | `/api/users` | Super admin |
| PATCH | `/api/users/:id/status` | Super admin |
| GET, POST | `/api/customers` | Admin |
| GET, PATCH | `/api/customers/:id` | Admin or the owning customer |
| DELETE | `/api/customers/:id` | Admin, soft delete |
| GET | `/api/helmets` | Admin or own helmets |
| POST, PATCH | `/api/helmets`, `/api/helmets/:id` | Admin |
| GET | `/api/helmets/:id` | Admin or owner |
| POST | `/api/qr-codes/generate` | Admin. `reissue` is super admin only |
| GET | `/api/qr-codes` | Admin |
| GET | `/api/qr-codes/:id` | Admin or owner |
| GET | `/api/qr-codes/:id/download` | Admin or owner, PNG |
| PATCH | `/api/qr-codes/:id/status` | Admin. `ACTIVE`, `INACTIVE`, `REVOKED` |
| POST | `/api/qr-codes/scan` | Public. See statuses below |
| GET, POST | `/api/vehicles` | List is scoped. Create is admin |
| GET | `/api/vehicles/:id` | Admin or owner |
| PATCH | `/api/vehicles/:id` | Admin |
| GET | `/api/insurance-products` | Any signed-in role |
| POST, PATCH | `/api/insurance-products` | Admin |
| GET, POST | `/api/policies` | List is scoped. Create is admin |
| GET, PATCH | `/api/policies/:id` | Read is scoped. Patch is admin |
| GET | `/api/policies/renewal-requests` | Scoped |
| POST | `/api/policies/:id/renewal-requests` | Owner or admin |
| PATCH | `/api/policies/renewal-requests/:requestId` | Admin |
| POST | `/api/policies/:id/documents` | Owner or admin, multipart field `file` |
| GET | `/api/policies/:id/documents/:docId/download` | Owner or admin |
| GET, POST | `/api/claims` | Scoped. Create requires an active policy |
| GET | `/api/claims/:id` | Owner or admin |
| PATCH | `/api/claims/:id/status` | Admin |
| POST / GET | `/api/claims/:id/documents` | Owner or admin |
| GET, POST | `/api/payments` | List is scoped. Create is an admin demo ledger entry |
| GET | `/api/notifications` | Customer sees own. Admin sees all |
| POST | `/api/notifications/read-all` | Current user |
| PATCH | `/api/notifications/:id/read` | Owner, or any admin |
| GET | `/api/dashboard/admin` | Admin |
| GET | `/api/dashboard/customer` | Customer |
| GET | `/api/audit-logs` | Admin |
| GET, PATCH | `/api/settings` | Read is admin. Patch is super admin and only `app_name` or `support_email` |
| GET | `/api/health` | Public. Checks PostgreSQL with `SELECT 1` |

## QR scan statuses

| Situation | HTTP | Message |
| --- | --- | --- |
| Active and assigned | 200 | QR code is valid. |
| Active but no customer | 200 | This helmet is not yet assigned to a customer. |
| Malformed or expired token | 400 | This QR token is expired or malformed. |
| QR is not from this system, or the helmet was removed | 400 | Invalid QR Code. This helmet is not registered in our system. |
| Inactive | 403 | This QR Code is currently inactive. |
| Well-formed token missing from the database | 404 | QR Code not found. |
| Revoked | 410 | This QR Code has been deactivated. |

The public scan body includes helmet, masked mobile, vehicle and policy status. It does not include address, documents, premium amounts or claim amounts.

Postman: import `postman/smart-helmet-insurance.postman_collection.json` and `postman/local.postman_environment.json`. Set `baseUrl` to the API origin, then run the folder from top to bottom.
