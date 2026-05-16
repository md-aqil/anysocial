import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger/pino.js';
import { DecryptionError } from '../errors/decryption.error.js';
import { OAuthError } from '../errors/oauth.error.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = (req as any).requestId || res.getHeader('X-Request-Id') || 'unknown';

  function sanitizeStack(stack?: string | null): string | undefined {
    if (!stack) return undefined;
    let s = stack;
    try {
      const cwd = process.cwd();
      s = s.split(cwd).join('<cwd>');
    } catch (_e) {}
    // redact likely long hex tokens (e.g., 64-hex TOKEN_ENCRYPTION_KEY)
    s = s.replace(/\b[0-9a-f]{32,}\b/gi, '[REDACTED]');
    // remove user home paths
    s = s.replace(/\/Users\/[\w-]+/g, '<user>');
    // limit to first 10 lines to avoid noisy logs
    s = s.split('\n').slice(0, 10).join('\n');
    return s;
  }

  const sanitized = sanitizeStack(err.stack || '');

  logger.error({
    event: 'error',
    error: err.message,
    requestId,
    stack: sanitized,
    path: req.path
  });

  if (err instanceof DecryptionError) {
    res.setHeader('X-Request-Id', requestId);
    res.status(500).json({
      error: 'Internal server error',
      requestId
    });
    return;
  }

  if (err instanceof OAuthError) {
    res.setHeader('X-Request-Id', requestId);
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      requestId
    });
    return;
  }

  // Generic error
  res.setHeader('X-Request-Id', requestId);
  res.status(500).json({
    error: err.message,
    requestId,
    stack: process.env.NODE_ENV === 'development' ? sanitized : undefined
  });
}
