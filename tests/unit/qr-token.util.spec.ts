import { resolveQrLookup } from '../../src/qr-codes/qr-token.util';

const active = {
  status: 'ACTIVE' as const,
  expiresAt: null,
  helmet: { deletedAt: null, status: 'ASSIGNED', customerId: 'customer-1' },
};

describe('QR token lookup', () => {
  it('accepts a valid assigned helmet', () => {
    const decision = resolveQrLookup({ token: 'active-demo-token-hm10001', record: active });
    expect(decision).toMatchObject({ httpStatus: 200, valid: true, message: 'QR code is valid.' });
  });

  it('returns the unassigned message without pretending the scan failed', () => {
    const decision = resolveQrLookup({
      token: 'unassigned-demo-token-hm10013',
      record: { ...active, helmet: { deletedAt: null, status: 'UNASSIGNED', customerId: null } },
    });
    expect(decision).toMatchObject({
      httpStatus: 200,
      valid: true,
      unassigned: true,
      message: 'This helmet is not yet assigned to a customer.',
    });
  });

  it('rejects an unknown well-formed token', () => {
    const decision = resolveQrLookup({ token: 'unknown-but-well-formed-token-xyz', record: null });
    expect(decision).toMatchObject({ httpStatus: 404, message: 'QR Code not found.' });
  });

  it('rejects a foreign QR as unregistered', () => {
    const decision = resolveQrLookup({ token: 'https://example.com/not-our-helmet', record: null });
    expect(decision).toMatchObject({
      httpStatus: 400,
      message: 'Invalid QR Code. This helmet is not registered in our system.',
    });
  });

  it('rejects a short or malformed token', () => {
    const decision = resolveQrLookup({ token: 'nope', record: null });
    expect(decision).toMatchObject({ httpStatus: 400, message: 'This QR token is expired or malformed.' });
  });

  it('rejects an expired token', () => {
    const decision = resolveQrLookup({
      token: 'active-demo-token-hm10001',
      record: { ...active, expiresAt: new Date('2020-01-01T00:00:00.000Z') },
      now: new Date('2026-11-15T00:00:00.000Z'),
    });
    expect(decision.httpStatus).toBe(400);
    expect(decision.message).toBe('This QR token is expired or malformed.');
  });

  it('rejects an inactive QR', () => {
    const decision = resolveQrLookup({ token: 'inactive-demo-token-hm10008', record: { ...active, status: 'INACTIVE' } });
    expect(decision).toMatchObject({ httpStatus: 403, message: 'This QR Code is currently inactive.' });
  });

  it('rejects a revoked QR', () => {
    const decision = resolveQrLookup({ token: 'revoked-demo-token-hm10009', record: { ...active, status: 'REVOKED' } });
    expect(decision).toMatchObject({ httpStatus: 410, message: 'This QR Code has been deactivated.' });
  });

  it('extracts the token from a scan URL before validating it', () => {
    const decision = resolveQrLookup({
      token: 'http://localhost:3000/scan/active-demo-token-hm10001',
      record: active,
    });
    expect(decision.httpStatus).toBe(200);
  });
});
