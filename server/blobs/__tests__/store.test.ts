import { describe, it, expect } from 'vitest';
import { MemoryBlobStore } from '../store';

describe('MemoryBlobStore', () => {
  it('stores and returns bytes, null for missing', async () => {
    const s = new MemoryBlobStore();
    await s.put('k', new TextEncoder().encode('hi'), 'application/pdf');
    const got = await s.get('k');
    expect(new TextDecoder().decode(got!)).toBe('hi');
    expect(await s.get('missing')).toBeNull();
  });
});
