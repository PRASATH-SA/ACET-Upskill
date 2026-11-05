import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { copyFile, mkdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { env } from '../config/env.js';
import { AppError } from './errors.js';

/** Storage abstraction (B3). LocalDiskStorage now; an S3 adapter can implement the same interface. */
const KEY_PATTERN = /^[a-z0-9-]+\/[0-9a-f-]{36}\.[a-z0-9]{1,8}$/;

export class LocalDiskStorage {
  root;
  constructor(root) {
    this.root = path.resolve(root);
  }

  /** Keys are generated server-side and validated, so client input never becomes a path. */
  resolve(key) {
    if (!KEY_PATTERN.test(key)) throw new AppError('VALIDATION_ERROR', 'Invalid file key');
    const full = path.resolve(this.root, key);
    if (!full.startsWith(this.root + path.sep))
      throw new AppError('VALIDATION_ERROR', 'Invalid file key');
    return full;
  }

  async save(data, { folder, ext }) {
    const key = `${folder}/${randomUUID()}.${ext}`;
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
    return key;
  }

  /** Moves an uploaded temp file (large videos are written to disk, not memory) into storage. */
  async saveFile(srcPath, { folder, ext }) {
    const key = `${folder}/${randomUUID()}.${ext}`;
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    try {
      await rename(srcPath, full);
    } catch {
      // Different volume: copy, then remove the temp file.
      await copyFile(srcPath, full);
      await rm(srcPath, { force: true });
    }
    return key;
  }

  /**
   * Opens a file for reading. With `range` ({ start, end } inclusive) only those bytes are
   * streamed, so video players can seek without downloading the whole file.
   */
  async read(key, range) {
    const full = this.resolve(key);
    let info;
    try {
      info = await stat(full);
    } catch {
      throw new AppError('NOT_FOUND', 'File not found');
    }
    return {
      stream: createReadStream(full, range ?? {}),
      size: info.size,
    };
  }

  /** Byte size, or null when the file is missing. */
  async size(key) {
    try {
      return (await stat(this.resolve(key))).size;
    } catch {
      return null;
    }
  }

  async remove(key) {
    await rm(this.resolve(key), { force: true });
  }

  /** A folder for multer's temp files, inside the storage root so moves are renames. */
  async tempDir() {
    const dir = path.join(this.root, '.incoming');
    await mkdir(dir, { recursive: true });
    return dir;
  }
}

let instance;
export function storage() {
  instance ??= new LocalDiskStorage(env().UPLOAD_DIR);
  return instance;
}
export function setStorage(s) {
  instance = s;
}
