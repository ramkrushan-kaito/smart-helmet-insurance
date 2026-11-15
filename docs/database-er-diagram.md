# Entity relationship diagram

```mermaid
erDiagram
  roles ||--o{ users : grants
  users ||--o| customers : "is"
  users ||--o{ notifications : receives
  users ||--o{ audit_logs : writes
  customers ||--o{ helmets : owns
  customers ||--o{ vehicles : owns
  customers ||--o{ insurance_policies : holds
  customers ||--o{ insurance_claims : files
  customers ||--o{ payments : pays
  customers ||--o{ renewal_requests : asks
  helmets ||--o| helmet_qr_codes : "has one"
  helmets ||--o| helmet_vehicle_mappings : links
  vehicles ||--o{ helmet_vehicle_mappings : links
  vehicles ||--o{ insurance_policies : covers
  insurance_products ||--o{ insurance_policies : prices
  helmets ||--o{ insurance_policies : "optional"
  insurance_policies ||--o{ policy_documents : stores
  insurance_policies ||--o{ insurance_claims : receives
  insurance_policies ||--o{ payments : bills
  insurance_policies ||--o{ renewal_requests : renews
  insurance_claims ||--o{ claim_documents : stores
  insurance_claims ||--o{ payments : settles
```

`otp_verifications` is keyed by mobile and is not a foreign key, so a request can be stored before it is consumed. `sequences` and `app_settings` are operational tables without business relationships.
