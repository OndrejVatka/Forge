import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';

const BEARER_PATTERN = /^Bearer (.+)$/i;

/**
 * Express middleware enforcing `Authorization: Bearer <FORGE_API_KEY>`.
 * Responds 401 (without revealing why) on a missing or invalid token.
 * Uses a constant-time comparison to avoid leaking the key via timing.
 */
export function createAuthMiddleware(apiKey: string): RequestHandler {
  const expected = Buffer.from(apiKey, 'utf8');

  return (req, res, next) => {
    const match = BEARER_PATTERN.exec(req.header('authorization') ?? '');
    const token = match?.[1];
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const provided = Buffer.from(token, 'utf8');
    // timingSafeEqual throws on length mismatch, so length-check first.
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    next();
  };
}
