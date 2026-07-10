import { type NextFunction, type Request, type Response } from 'express';

export function errorHandler(error: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error(JSON.stringify({ level: 'error', event: 'unhandled_request_error', message: error.message, stack: error.stack }));
  res.status(500).json({ error: 'Internal server error.' });
}
