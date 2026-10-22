import { createHash, createHmac, timingSafeEqual } from 'crypto';

const b64 = (s: string) => Buffer.from(s).toString('base64url');

/** Stateless signed session token: v1.<payload>.<hmac>. No third-party JWT library needed for a single owner. */
export function signToken(secret: string, ttlMs: number, now = Date.now()): { token: string; expiresAt: string } {
  const exp = now + ttlMs;
  const body = b64(JSON.stringify({ sub: 'owner', exp }));
  const sig = createHmac('sha256', secret).update(`v1.${body}`).digest('base64url');
  return { token: `v1.${body}.${sig}`, expiresAt: new Date(exp).toISOString() };
}

export function verifyToken(secret: string, token: string, now = Date.now()): boolean {
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return false;
  const expected = createHmac('sha256', secret).update(`v1.${parts[1]}`).digest();
  const given = Buffer.from(parts[2], 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return false;
  try {
    const p = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return typeof p.exp === 'number' && p.exp > now;
  } catch {
    return false;
  }
}

/** Constant-time comparison independent of password length. */
export function passwordMatches(expected: string, given: string): boolean {
  const a = createHash('sha256').update(expected).digest();
  const b = createHash('sha256').update(given).digest();
  return timingSafeEqual(a, b);
}
