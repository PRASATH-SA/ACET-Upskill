import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
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

  async read(key) {
    const full = this.resolve(key);
    try {
      const info = await stat(full);
      return { stream: createReadStream(full), size: info.size };
    } catch {
      throw new AppError('NOT_FOUND', 'File not found');
    }
  }

  async remove(key) {
    await rm(this.resolve(key), { force: true });
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
