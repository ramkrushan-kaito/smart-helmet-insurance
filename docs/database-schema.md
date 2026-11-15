# Database schema

PostgreSQL database: `smart_helmet_insurance`. ORM: Prisma. Migration: `prisma/migrations/20261115175755_init`.

Every mutable business table has `created_at` and `updated_at`. Users, customers, helmets, vehicles and policies use `deleted_at` for soft delete. QR codes use status instead of soft delete.

## Tables

| Table | Purpose |
| --- | --- |
| `roles` | `SUPER_ADMIN`, `ADMIN`, `CUSTOMER` and a permissions JSON list |
| `users` | Login identity. Email unique, mobile unique, password hash only for staff |
| `customers` | One-to-one with a customer user. Unique `customer_code` and mobile |
| `helmets` | Unique `helmet_code` and `serial_number`. Optional customer |
| `helmet_qr_codes` | One per helmet. Unique token and scan URL |
| `vehicles` | Belongs to one customer. Unique registration, code and chassis |
| `helmet_vehicle_mappings` | One helmet links to one vehicle. A vehicle may have several helmets |
| `insurance_products` | Coverage, premium and duration |
| `insurance_policies` | Customer + vehicle + product, optional helmet |
| `policy_documents` | Stored file name under `public/documents` |
| `insurance_claims` | Must reference a policy and that policy's customer |
| `claim_documents` | Files attached to a claim |
| `payments` | Demo ledger. Optional policy and claim |
| `otp_verifications` | Hashed OTP, expiry, attempts |
| `notifications` | In-app messages for a user |
| `audit_logs` | Who did what. User is optional for a public scan |
| `renewal_requests` | Customer request against a policy |
| `sequences` | Next `CUST`, `HM`, `VH`, `POL`, `CLM`, `PAY` number |
| `app_settings` | Editable display name and support email |

## Rules enforced in the API

- A helmet's vehicle must belong to the same customer.
- A policy's vehicle and optional helmet must belong to the policy customer.
- A claim can be opened only on an `ACTIVE` policy, for an amount within coverage, with an incident date that is not in the future.
- Customers cannot read or update another customer's rows.
- Revoked QR lookup returns 410. Inactive returns 403. Unknown well-formed tokens return 404. Other QR content returns 400. A real active token returns 200.
- Unassigned helmets still return 200, with the message that the helmet is not assigned.

## Demo rows

Seeded once into the local database: 2 staff users, 10 customers, 15 helmets, 15 QR codes, 10 vehicles, 3 products, 10 policies, 5 claims, 5 payments, notifications, audit logs and one renewal. Names start with `DEMO DATA`.
