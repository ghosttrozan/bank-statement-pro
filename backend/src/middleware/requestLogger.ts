import { Request, Response, NextFunction } from 'express';

// ── Secure request logger that logs only metadata (no bodies or secrets) ──
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const userAgent = (req.headers['user-agent'] as string) || 'unknown';
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    console.log(
      `[API Request] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - Duration: ${duration}ms - IP: ${clientIp} - UA: ${userAgent}`
    );
  });
  next();
};
