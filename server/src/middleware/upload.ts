import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { ValidationError } from '../utils/AppError.js';
import { assertImageFileOnDisk, assertSafeUploadFilename } from '../utils/imageMagic.js';

const isLambda = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
const __dirname = isLambda
  ? '/tmp'
  : path.dirname(fileURLToPath(import.meta.url));

export const UPLOADS_ROOT = isLambda
  ? path.join('/tmp', 'uploads')
  : path.resolve(__dirname, '../../uploads');
export const PRODUCT_UPLOADS_DIR = path.join(UPLOADS_ROOT, 'products');

try {
  mkdirSync(PRODUCT_UPLOADS_DIR, { recursive: true });
} catch {
  // Lambda's task root is read-only; /tmp is used instead.
}

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, PRODUCT_UPLOADS_DIR);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const safeBase = path
      .basename(file.originalname, path.extname(file.originalname))
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 40);
    cb(null, `${Date.now()}-${safeBase || 'image'}${ext}`);
  },
});

function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void {
  try {
    assertSafeUploadFilename(file.originalname);
  } catch (error) {
    cb(error as Error);
    return;
  }
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(new ValidationError('Only JPEG, PNG, WebP, and GIF images are allowed'));
    return;
  }
  cb(null, true);
}

export const productImageUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 8,
  },
});

export function toPublicUploadPath(filename: string): string {
  return `/uploads/products/${filename}`;
}

/** Verify magic bytes after multer writes files; delete fakes. */
export function validateUploadedImages(req: Request, _res: Response, next: NextFunction): void {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files?.length) {
    next();
    return;
  }

  try {
    for (const file of files) {
      assertImageFileOnDisk(file.path);
    }
    next();
  } catch (error) {
    next(error);
  }
}
