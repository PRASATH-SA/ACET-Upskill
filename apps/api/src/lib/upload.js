import { randomUUID } from 'node:crypto';
import { open, rm } from 'node:fs/promises';
import { fileTypeFromBuffer } from 'file-type';
import multer from 'multer';
import { env } from '../config/env.js';
import { AppError } from './errors.js';
import { storage } from './storage.js';

/** Multer in memory: files are sniffed, then handed to StorageService. Max size from UPLOAD_MAX_MB. */
export function memoryUpload(maxMb = env().UPLOAD_MAX_MB) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxMb * 1024 * 1024, files: 1 },
  });
}

/**
 * Multer to a temp file inside the storage root, for large uploads (videos). Nothing is held
 * in memory; the service sniffs the first bytes and moves the file into storage. Max VIDEO_MAX_MB.
 */
export function diskUpload(maxMb = env().VIDEO_MAX_MB) {
  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) =>
        storage()
          .tempDir()
          .then((dir) => cb(null, dir), cb),
      filename: (_req, _file, cb) => cb(null, `${randomUUID()}.part`),
    }),
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

/** Voice recordings, by the type detected from their bytes. Browsers record webm/ogg (Opus) or mp4. */
export const AUDIO_TYPES = {
  webm: 'audio/webm',
  ogg: 'audio/ogg',
  opus: 'audio/ogg',
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  wav: 'audio/wav',
  mp3: 'audio/mpeg',
};

/**
 * Detects the real file type from its bytes (not the client's name or MIME header) and
 * rejects anything outside `allowed`.
 */
/** ASF/WMV header GUID (30 26 B2 75 8E 66 CF 11 …). We never accept ASF files. */
const ASF_GUID = Buffer.from('3026b2758e66cf11a6d900aa0062ce6c', 'hex');

/**
 * The only entry point to file-type. file-type < 22 (22 needs Node 22; we run Node 20) can loop
 * forever on a malformed ASF header (GHSA-5v7r-6r5c-r473), so ASF input is refused before
 * parsing. No upload kind accepts ASF, so this changes no valid result.
 * @param {Uint8Array} buffer
 */
export async function detectFileType(buffer) {
  if (buffer.length >= ASF_GUID.length && ASF_GUID.equals(Buffer.from(buffer.subarray(0, 16))))
    return undefined;
  return fileTypeFromBuffer(buffer);
}

export async function sniffFile(buffer, allowed, mimes = ALLOWED_UPLOADS) {
  const type = await detectFileType(buffer);
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
  return { ext, mime: mimes[ext] };
}

/** sniffFile for a file on disk: reads only its first bytes. Deletes the file if it is rejected. */
export async function sniffDiskFile(filePath, allowed) {
  const fh = await open(filePath, 'r');
  let head;
  try {
    const buf = Buffer.alloc(4100);
    const { bytesRead } = await fh.read(buf, 0, buf.length, 0);
    head = buf.subarray(0, bytesRead);
  } finally {
    await fh.close();
  }
  try {
    return await sniffFile(head, allowed);
  } catch (err) {
    await rm(filePath, { force: true });
    throw err;
  }
}

export function requireFile(file) {
  if (!file) throw new AppError('VALIDATION_ERROR', 'A file is required in the "file" field');
  return file;
}
