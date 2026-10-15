import mongoose from 'mongoose';
import multer from 'multer';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

/** 404 for any unmatched route, in the A.6 error shape. */
export const notFoundHandler = (req, _res, next) => {
  next(new AppError('NOT_FOUND', `Route ${req.method} ${req.path} not found`));
};

/** Converts every error into `{ error: { code, message, details? } }` with the right status. */
export const errorHandler = (err, req, res, _next) => {
  let appErr;

  if (err instanceof AppError) {
    appErr = err;
  } else if (err instanceof ZodError) {
    appErr = new AppError(
      'VALIDATION_ERROR',
      'Request validation failed',
      err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    );
  } else if (err instanceof mongoose.Error.CastError) {
    appErr = new AppError('VALIDATION_ERROR', `Invalid value for ${err.path}`);
  } else if (err instanceof mongoose.Error.ValidationError) {
    appErr = new AppError(
      'VALIDATION_ERROR',
      'Data validation failed',
      Object.values(err.errors).map((e) => ({ path: e.path, message: e.message })),
    );
  } else if (err.code === 11000) {
    const keyValue = err.keyValue ?? {};
    appErr = new AppError('CONFLICT', 'A record with these values already exists', {
      fields: Object.keys(keyValue),
    });
  } else if (err instanceof multer.MulterError) {
    appErr =
      err.code === 'LIMIT_FILE_SIZE'
        ? new AppError('PAYLOAD_TOO_LARGE', 'File is too large')
        : new AppError('VALIDATION_ERROR', err.message);
  } else if (err.type === 'entity.too.large') {
    appErr = new AppError('PAYLOAD_TOO_LARGE', 'Request body is too large');
  } else if (err.type === 'entity.parse.failed') {
    appErr = new AppError('VALIDATION_ERROR', 'Malformed JSON body');
  } else {
    logger.error({ err, path: req.path, method: req.method }, 'unhandled error');
    appErr = new AppError('INTERNAL', 'Something went wrong');
  }

  const body = {
    error: { code: appErr.code, message: appErr.message },
  };
  if (appErr.details !== undefined) body.error.details = appErr.details;
  res.status(appErr.status).json(body);
};
