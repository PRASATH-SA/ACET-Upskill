import { fileTypeFromBuffer } from 'file-type';
import multer from 'multer';
import { env } from '../config/env.js';
import { AppError } from './errors.js';

/** Multer in memory: files are sniffed, then handed to StorageService. Max size from UPLOAD_MAX_MB. */
export function memoryUpload(maxMb = env().UPLOAD_MAX_MB) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxMb * 1024 * 1024, files: 1 },
  });
}

export const ALLOWED_UPLOADS = {
  pdf: 'application/pdf',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  mp4: 'video/mp4',
  webm: 'video/webm',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

/**
 * Detects the real file type from its bytes (not the client's name or MIME header) and
 * rejects anything outside `allowed`.
 */
export async function sniffFile(buffer, allowed) {
  const type = await fileTypeFromBuffer(buffer);
  const ext = type?.ext;
  if (!ext || !allowed.includes(ext)) {
    throw new AppError(
      'VALIDATION_ERROR',
      `Unsupported file type. Allowed: ${allowed.join(', ')}`,
      {
        detected: type?.ext ?? 'unknown',
      },
    );
  }
  return { ext, mime: ALLOWED_UPLOADS[ext] };
}

export function requireFile(file) {
  if (!file) throw new AppError('VALIDATION_ERROR', 'A file is required in the "file" field');
  return file;
}
