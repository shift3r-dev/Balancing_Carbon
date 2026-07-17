import type { NextFunction, Request, Response } from 'express';

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function platformSecurityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self' https://fonts.gstatic.com data:; form-action 'self'; frame-ancestors 'none'; img-src 'self' data: blob:; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; upgrade-insecure-requests",
    );
  }
  next();
}

export function sanitizeProductionErrors(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV !== 'production') return next();
  const sendJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    if (res.statusCode >= 500 && body && typeof body === 'object' && 'error' in body) {
      const original = body as Record<string, unknown>;
      console.error(JSON.stringify({
        level: 'error',
        event: 'sanitized_server_error',
        requestId: res.getHeader('x-request-id'),
        method: req.method,
        path: req.path,
        status: res.statusCode,
        message: original.error,
      }));
      return sendJson({ error: 'Unable to complete the request.', requestId: res.getHeader('x-request-id') });
    }
    return sendJson(body);
  }) as Response['json'];
  next();
}

export function rateLimit(options: { windowMs: number; limit: number; namespace: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${options.namespace}:${req.ip || req.socket.remoteAddress || 'unknown'}`;
    const current = buckets.get(key);
    const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + options.windowMs } : current;
    bucket.count += 1;
    buckets.set(key, bucket);
    res.setHeader('RateLimit-Limit', String(options.limit));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, options.limit - bucket.count)));
    res.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));
    if (bucket.count > options.limit) return res.status(429).json({ error: 'Too many requests. Try again shortly.' });
    if (buckets.size > 10_000) for (const [bucketKey, value] of buckets) if (value.resetAt <= now) buckets.delete(bucketKey);
    next();
  };
}
