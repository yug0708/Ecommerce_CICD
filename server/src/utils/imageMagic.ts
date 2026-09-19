import { readFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { ValidationError } from './AppError.js';

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

function hasPrefix(buffer: Buffer, bytes: number[]): boolean {
  if (buffer.length < bytes.length) return false;
  return bytes.every((b, i) => buffer[i] === b);
}

export function detectImageKind(buffer: Buffer): 'jpeg' | 'png' | 'gif' | 'webp' | null {
  if (hasPrefix(buffer, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (hasPrefix(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (hasPrefix(buffer, [0x47, 0x49, 0x46, 0x38])) return 'gif';
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}

export function assertSafeUploadFilename(originalName: string): void {
  const base = path.basename(originalName);
  if (base.includes('\0') || /[<>:"|?*]/.test(base)) {
    throw new ValidationError('Unsafe upload filename');
  }
  const ext = path.extname(base).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    throw new ValidationError('Only JPEG, PNG, WebP, and GIF images are allowed');
  }
  const stem = base.slice(0, -ext.length);
  if (stem.includes('.')) {
    throw new ValidationError('Double extensions are not allowed on uploads');
  }
}

export function assertImageFileOnDisk(filepath: string): void {
  const header = readFileSync(filepath).subarray(0, 16);
  if (!detectImageKind(header)) {
    try {
      unlinkSync(filepath);
    } catch {
      // ignore cleanup failure
    }
    throw new ValidationError('File content is not a valid image');
  }
}
