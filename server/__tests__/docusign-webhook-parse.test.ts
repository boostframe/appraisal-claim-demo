import { describe, it, expect } from 'vitest';
import { parseConnectPayload } from '../../netlify/functions/docusign-webhook';

describe('parseConnectPayload', () => {
  it('extracts envelopeId, status, and a stable event id', () => {
    const body = { event: 'envelope-completed', data: { envelopeId: 'env-9', envelopeSummary: { status: 'completed' } }, generatedDateTime: '2026-06-17T00:00:00Z' };
    const p = parseConnectPayload(body);
    expect(p).toEqual({ envelopeId: 'env-9', status: 'completed', eventId: 'env-9:completed:2026-06-17T00:00:00Z' });
  });
  it('returns null for non-completed events', () => {
    expect(parseConnectPayload({ event: 'envelope-sent', data: { envelopeId: 'e', envelopeSummary: { status: 'sent' } } })).toBeNull();
  });
});
