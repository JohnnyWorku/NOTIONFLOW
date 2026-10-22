import { passwordMatches, signToken, verifyToken } from './token';

const SECRET = 'x'.repeat(40);

describe('session tokens', () => {
  it('verifies a freshly signed token', () => {
    expect(verifyToken(SECRET, signToken(SECRET, 60_000).token)).toBe(true);
  });
  it('rejects a token signed with another secret', () => {
    expect(verifyToken('y'.repeat(40), signToken(SECRET, 60_000).token)).toBe(false);
  });
  it('rejects tampered payloads', () => {
    const [v, , sig] = signToken(SECRET, 60_000).token.split('.');
    const forged = Buffer.from(JSON.stringify({ sub: 'owner', exp: Date.now() + 1e12 })).toString('base64url');
    expect(verifyToken(SECRET, `${v}.${forged}.${sig}`)).toBe(false);
  });
  it('rejects expired tokens', () => {
    const { token } = signToken(SECRET, 1000, Date.now() - 10_000);
    expect(verifyToken(SECRET, token)).toBe(false);
  });
  it('rejects garbage', () => {
    expect(verifyToken(SECRET, 'nope')).toBe(false);
    expect(verifyToken(SECRET, 'v1.a.b')).toBe(false);
  });
  it('compares passwords', () => {
    expect(passwordMatches('correct horse', 'correct horse')).toBe(true);
    expect(passwordMatches('correct horse', 'wrong')).toBe(false);
  });
});
