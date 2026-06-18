import { describe, it, expect } from 'vitest';
import { paymentEventId } from '../../netlify/functions/simulate-payment';

describe('paymentEventId', () => {
  it('is stable for a lead so replays collide on the same id', () => {
    expect(paymentEventId('lead-1')).toBe('pay:lead-1');
    expect(paymentEventId('lead-1')).toBe(paymentEventId('lead-1'));
  });
});
