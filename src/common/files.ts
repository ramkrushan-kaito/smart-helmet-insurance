import { BadRequestException } from '@nestjs/common';
import { basename, join, resolve, sep } from 'path';

export function documentsDir() {
  return resolve(process.cwd(), 'public', 'documents');
}

export function qrDir() {
  return resolve(process.cwd(), 'public', 'qr-codes');
}

export function safeStoredPath(directory: string, storedName: string) {
  const root = resolve(directory);
  const full = resolve(root, basename(storedName));
  if (!full.startsWith(root + sep)) {
    throw new BadRequestException('Invalid document path.');
  }
  return full;
}

export const allowedDocumentMimes = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'text/plain',
]);

export function assertAllowedUpload(file?: { mimetype: string; size: number; originalname: string; buffer: Buffer }) {
  if (!file) throw new BadRequestException('Choose a file to upload.');
  if (!allowedDocumentMimes.has(file.mimetype)) {
    throw new BadRequestException('Only PDF, PNG, JPG and text files are allowed.');
  }
  if (file.size > 5 * 1024 * 1024) throw new BadRequestException('File must be 5 MB or smaller.');
  return file;
}

export function extensionFor(originalName: string, mime: string) {
  const fromName = originalName.includes('.') ? originalName.slice(originalName.lastIndexOf('.')).toLowerCase() : '';
  if (['.pdf', '.png', '.jpg', '.jpeg', '.txt'].includes(fromName)) return fromName;
  if (mime === 'application/pdf') return '.pdf';
  if (mime === 'image/png') return '.png';
  if (mime === 'image/jpeg') return '.jpg';
  return '.txt';
}

export function documentAbsolute(storedName: string) {
  return safeStoredPath(documentsDir(), storedName);
}

export function qrAbsolute(storedName: string) {
  return join(qrDir(), basename(storedName));
}
