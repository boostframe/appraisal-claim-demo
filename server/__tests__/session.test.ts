import { describe, it, expect } from 'vitest';
import { parseSessionCookie, newSessionId } from '../session';

describe('session', () => {
  it('parses sid from a cookie header', () => {
    expect(parseSessionCookie('foo=1; sid=abc; bar=2')).toBe('abc');
    expect(parseSessionCookie(undefined)).toBeNull();
  });
  it('generates a non-empty session id', () => {
    expect(newSessionId().length).toBeGreaterThan(10);
  });
});
