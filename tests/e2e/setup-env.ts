process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-not-for-production';
process.env.JWT_EXPIRES_IN = '1h';
process.env.DEMO_OTP_ENABLED = 'true';
process.env.DEMO_OTP_CODE = '123456';
process.env.QR_PUBLIC_BASE_URL = 'http://localhost:3000';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.OTP_EXPIRY_SECONDS = '300';
process.env.OTP_MAX_REQUESTS = '5';
process.env.OTP_WINDOW_SECONDS = '900';
process.env.SMS_PROVIDER = 'none';
process.env.SWAGGER_ENABLED = 'false';

if (!process.env.DATABASE_URL?.includes('smart_helmet_insurance_test')) {
  throw new Error('Refusing to start e2e without smart_helmet_insurance_test in DATABASE_URL.');
}
