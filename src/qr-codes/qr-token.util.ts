export type QrRecordSnapshot = {
  status: 'ACTIVE' | 'INACTIVE' | 'REVOKED';
  expiresAt: Date | null;
  helmet: {
    deletedAt: Date | null;
    status: string;
    customerId: string | null;
  } | null;
} | null;

export type QrDecision = {
  httpStatus: number;
  valid: boolean;
  unassigned: boolean;
  message: string;
};

export function extractQrToken(input: string): string {
  const trimmed = (input ?? '').trim();
  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split('/').filter(Boolean);
    const scanIndex = parts.lastIndexOf('scan');
    if (scanIndex >= 0 && parts[scanIndex + 1]) return decodeURIComponent(parts[scanIndex + 1]);
  } catch {
    const match = trimmed.match(/\/scan\/([A-Za-z0-9_-]+)/);
    if (match) return match[1];
  }
  return trimmed;
}

export function isWellFormedToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{20,128}$/.test(token);
}

export function resolveQrLookup(input: { token: string; record: QrRecordSnapshot; now?: Date }): QrDecision {
  const raw = (input.token ?? '').trim();
  const malformed = {
    httpStatus: 400,
    valid: false,
    unassigned: false,
    message: 'This QR token is expired or malformed.',
  };
  const invalid = {
    httpStatus: 400,
    valid: false,
    unassigned: false,
    message: 'Invalid QR Code. This helmet is not registered in our system.',
  };
  if (!raw) return malformed;

  const token = extractQrToken(raw);
  if (!isWellFormedToken(token)) {
    let fromOurScanUrl = false;
    try {
      fromOurScanUrl = new URL(raw).pathname.split('/').filter(Boolean).includes('scan');
    } catch {
      fromOurScanUrl = /\/scan\//.test(raw);
    }
    if (fromOurScanUrl || raw.length < 20) return malformed;
    return invalid;
  }

  if (!input.record) {
    return { httpStatus: 404, valid: false, unassigned: false, message: 'QR Code not found.' };
  }
  if (!input.record.helmet || input.record.helmet.deletedAt) return invalid;

  const now = input.now ?? new Date();
  if (input.record.expiresAt && input.record.expiresAt.getTime() <= now.getTime()) return malformed;
  if (input.record.status === 'REVOKED') {
    return { httpStatus: 410, valid: false, unassigned: false, message: 'This QR Code has been deactivated.' };
  }
  if (input.record.status === 'INACTIVE') {
    return { httpStatus: 403, valid: false, unassigned: false, message: 'This QR Code is currently inactive.' };
  }
  if (input.record.status !== 'ACTIVE') return invalid;
  if (!input.record.helmet.customerId || input.record.helmet.status === 'UNASSIGNED') {
    return {
      httpStatus: 200,
      valid: true,
      unassigned: true,
      message: 'This helmet is not yet assigned to a customer.',
    };
  }
  return { httpStatus: 200, valid: true, unassigned: false, message: 'QR code is valid.' };
}

export function maskMobile(mobile?: string | null) {
  if (!mobile || mobile.length < 4) return null;
  return `${'*'.repeat(Math.max(0, mobile.length - 4))}${mobile.slice(-4)}`;
}
