import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';

describe('Smart Helmet API', () => {
  let app: INestApplication;
  let adminToken = '';
  let customerToken = '';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('reports PostgreSQL health without secrets', async () => {
    const response = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(response.body.database).toBe('postgresql');
    expect(response.body.demoMode).toBe(true);
    expect(response.body.smsConfigured).toBe(false);
    expect(JSON.stringify(response.body)).not.toMatch(/password|DATABASE_URL|JWT_SECRET/i);
  });

  it('signs in the demo super admin', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/admin/login')
      .send({ email: 'superadmin@demo.helmet.test', password: 'Admin@12345' })
      .expect(201);
    adminToken = response.body.accessToken;
    expect(response.body.user.role).toBe('SUPER_ADMIN');
  });

  it('issues a demo OTP without claiming an SMS was sent', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/request-otp')
      .send({ mobile: '9000000001' })
      .expect(201);
    expect(response.body.smsSent).toBe(false);
    expect(response.body.message).toContain('No SMS was sent');
    expect(response.body.demoOtp).toBe('123456');
  });

  it('signs in the customer and blocks another customer record', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/verify-otp')
      .send({ mobile: '9000000001', otp: '123456' })
      .expect(201);
    customerToken = login.body.accessToken;
    const policies = await request(app.getHttpServer())
      .get('/api/policies')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect(policies.body.data.length).toBeGreaterThan(0);
    expect(policies.body.data.every((policy: { customerId: string }) => policy.customerId === login.body.user.customerId)).toBe(true);

    const customers = await request(app.getHttpServer())
      .get('/api/customers?limit=20')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const other = customers.body.data.find((customer: { mobile: string }) => customer.mobile === '9000000002');
    await request(app.getHttpServer())
      .get(`/api/customers/${other.id}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
  });

  it('creates a helmet, generates a QR image and scans it', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/helmets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        brand: 'TestGuard',
        model: 'E2E',
        color: 'White',
        size: 'M',
        serialNumber: 'TEST-SN-E2E-1',
        manufactureYear: 2025,
        generateQr: false,
      })
      .expect(201);
    const qr = await request(app.getHttpServer())
      .post('/api/qr-codes/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ helmetId: created.body.id })
      .expect(201);
    const download = await request(app.getHttpServer())
      .get(`/api/qr-codes/${qr.body.id}/download`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(download.headers['content-type']).toContain('image/png');
    expect(download.body.slice(0, 8).toString('hex')).toContain('89504e47');
    const scan = await request(app.getHttpServer()).post('/api/qr-codes/scan').send({ token: qr.body.token }).expect(200);
    expect(scan.body.message).toBe('This helmet is not yet assigned to a customer.');
    expect(scan.body.helmet.helmetCode).toBe(created.body.helmetCode);
  });

  it('returns the seeded QR outcomes', async () => {
    const valid = await request(app.getHttpServer()).post('/api/qr-codes/scan').send({ token: 'active-demo-token-hm10001' }).expect(200);
    expect(valid.body.helmet.helmetCode).toBe('HM10001');
    expect(valid.body.customer.fullName).toContain('DEMO DATA');

    const inactive = await request(app.getHttpServer()).post('/api/qr-codes/scan').send({ token: 'inactive-demo-token-hm10008' }).expect(403);
    expect(inactive.body.message).toBe('This QR Code is currently inactive.');

    const revoked = await request(app.getHttpServer()).post('/api/qr-codes/scan').send({ token: 'revoked-demo-token-hm10009' }).expect(410);
    expect(revoked.body.message).toBe('This QR Code has been deactivated.');

    const unknown = await request(app.getHttpServer()).post('/api/qr-codes/scan').send({ token: 'unknown-but-well-formed-token-xyz' }).expect(404);
    expect(unknown.body.message).toBe('QR Code not found.');

    const invalid = await request(app.getHttpServer()).post('/api/qr-codes/scan').send({ token: 'https://example.com/not-our-helmet' }).expect(400);
    expect(invalid.body.message).toBe('Invalid QR Code. This helmet is not registered in our system.');
  });

  it('lets the customer submit a claim and the admin update it', async () => {
    const policies = await request(app.getHttpServer()).get('/api/policies?status=ACTIVE').set('Authorization', `Bearer ${customerToken}`).expect(200);
    const policy = policies.body.data[0];
    const claim = await request(app.getHttpServer())
      .post('/api/claims')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        policyId: policy.id,
        incidentDate: '2026-10-01',
        description: 'DEMO DATA e2e claim for a fictional scuff. No real loss occurred.',
        claimAmount: 1200,
      })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/claims/${claim.body.id}/status`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'UNDER_REVIEW' })
      .expect(403);
    const updated = await request(app.getHttpServer())
      .patch(`/api/claims/${claim.body.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'UNDER_REVIEW' })
      .expect(200);
    expect(updated.body.status).toBe('UNDER_REVIEW');
  });

  it('rate limits OTP requests', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(app.getHttpServer()).post('/api/auth/request-otp').send({ mobile: '9000000010' }).expect(201);
    }
    await request(app.getHttpServer()).post('/api/auth/request-otp').send({ mobile: '9000000010' }).expect(429);
  });
});
