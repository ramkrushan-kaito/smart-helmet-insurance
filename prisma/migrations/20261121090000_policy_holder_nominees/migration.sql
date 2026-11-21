-- Policyholder details (Aadhaar masked) and nominees captured at QR purchase.
ALTER TABLE "insurance_policies" ADD COLUMN "holder_details" JSONB,
ADD COLUMN "nominees" JSONB;
