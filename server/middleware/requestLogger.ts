import { type NextFunction, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';

export interface RequestWithId extends Request { requestId?: string }

/** Structured, dependency-free request log suitable for replacement by a log sink later. */
export function requestLogger(req: RequestWithId, res: Response, next: NextFunction) {
  const startedAt = Date.now();
  req.requestId = req.headers['x-request-id']?.toString() || randomUUID();
  res.setHeader('x-request-id', req.requestId);
  res.on('finish', () => {
    console.info(JSON.stringify({ level: 'info', event: 'http_request', requestId: req.requestId, method: req.method, path: req.path, status: res.statusCode, durationMs: Date.now() - startedAt }));
  });
  next();
}
