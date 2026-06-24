import { NextFunction, Request, Response } from 'express';

/**
 * Recursively strips MongoDB operator keys (`$gt`, `$where`, ...) and dotted
 * keys from an object, guarding against NoSQL operator-injection through the
 * request body / params (e.g. a login payload of `{ "email": { "$gt": "" } }`).
 *
 * Note: in Express 5 `req.query` is a read-only getter and cannot be mutated,
 * so query strings are defended by strict DTO validation + implicit type
 * coercion instead.
 */
function scrub(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete (value as Record<string, unknown>)[key];
      continue;
    }
    scrub((value as Record<string, unknown>)[key]);
  }
}

export function mongoSanitize() {
  return (req: Request, _res: Response, next: NextFunction): void => {
    scrub(req.body);
    scrub(req.params);
    next();
  };
}
