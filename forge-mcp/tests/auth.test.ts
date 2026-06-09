import type { Request, Response } from 'express';
import { describe, it, expect, vi } from 'vitest';
import { createAuthMiddleware } from '../src/auth.js';

const API_KEY = 'super-secret-key';

function mockReq(authorization?: string): Request {
  return {
    header: (name: string): string | undefined =>
      name.toLowerCase() === 'authorization' ? authorization : undefined,
  } as unknown as Request;
}

function mockRes(): Response & { statusCode: number; body: unknown } {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number; body: unknown };
}

describe('createAuthMiddleware', () => {
  const middleware = createAuthMiddleware(API_KEY);

  it('should call next() for a valid Bearer token', () => {
    const res = mockRes();
    const next = vi.fn();
    middleware(mockReq(`Bearer ${API_KEY}`), res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBe(0);
  });

  it('should reject a missing Authorization header with 401', () => {
    const res = mockRes();
    const next = vi.fn();
    middleware(mockReq(undefined), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it('should reject a wrong token with 401', () => {
    const res = mockRes();
    const next = vi.fn();
    middleware(mockReq('Bearer wrong-key'), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it('should reject a non-Bearer scheme with 401', () => {
    const res = mockRes();
    const next = vi.fn();
    middleware(mockReq(`Basic ${API_KEY}`), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });
});
