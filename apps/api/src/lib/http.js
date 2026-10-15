/** Sends the A.6 success envelope. */
export function ok(res, data, meta, status = 200) {
  return res.status(status).json(meta === undefined ? { data } : { data, meta });
}

export function created(res, data) {
  return ok(res, data, undefined, 201);
}

/** Wraps an async handler so rejections reach the central error handler. */
export function asyncHandler(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

/**
 * Validates body, query and params with zod (A.6). Parsed values replace the raw ones,
 * so handlers receive coerced, defaulted data. Validation errors go to the error handler.
 */
export function validate(schemas) {
  return (req, _res, next) => {
    try {
      if (schemas.params) req.params = schemas.params.parse(req.params);
      if (schemas.query) {
        const parsed = schemas.query.parse(req.query);
        Object.defineProperty(req, 'query', { value: parsed, writable: true, configurable: true });
      }
      if (schemas.body) req.body = schemas.body.parse(req.body ?? {});
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Typed accessor for validated query values. */
export function q(req, _schema) {
  return req.query;
}

export function pageMeta(page, limit, total) {
  return { page, limit, total };
}
