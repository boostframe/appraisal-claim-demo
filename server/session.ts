export function parseSessionCookie(header: string | undefined | null): string | null {
  if (!header) return null;
  const m = header.split(';').map(s => s.trim()).find(s => s.startsWith('sid='));
  return m ? m.slice(4) : null;
}

export function newSessionId(): string {
  return 'sess-' + crypto.randomUUID();
}
