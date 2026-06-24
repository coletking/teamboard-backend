import { NextFunction, Request, Response } from 'express';

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
