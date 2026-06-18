import { getStore } from '@netlify/blobs';

export interface BlobStore {
  put(key: string, data: Uint8Array, contentType?: string | undefined): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
}

export class MemoryBlobStore implements BlobStore {
  private m = new Map<string, Uint8Array>();
  async put(key: string, data: Uint8Array, _contentType?: string) { this.m.set(key, data); }
  async get(key: string) { return this.m.get(key) ?? null; }
}

export function createNetlifyBlobStore(name = 'signed-pdfs'): BlobStore {
  const store = getStore(name);
  return {
    async put(key, data, contentType = 'application/pdf') {
      const ab = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
      await store.set(key, ab, { metadata: { contentType } });
    },
    async get(key) {
      const ab = await store.get(key, { type: 'arrayBuffer' });
      return ab ? new Uint8Array(ab as ArrayBuffer) : null;
    },
  };
}
