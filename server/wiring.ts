import type { Repository } from './repo/types';
import type { DocuSignClient } from './docusign/types';
import type { BlobStore } from './blobs/store';
import type { Deps } from './domain/types';
import { MemoryRepository } from './repo/memory';
import { createPostgresRepository, ensureSchema } from './repo/postgres';
import { FakeDocuSign } from './docusign/fake';
import { createRealDocuSign } from './docusign/real';
import { MemoryBlobStore, createNetlifyBlobStore } from './blobs/store';
import { loadConfig } from './config';

const FAKE = process.env.DEMO_FAKE === '1';
let memRepo: MemoryRepository | null = null;
let memBlobs: MemoryBlobStore | null = null;

export function getRepo(): Repository {
  if (FAKE) { memRepo ??= new MemoryRepository(); return memRepo; }
  return createPostgresRepository();
}

export async function initStore(): Promise<void> { if (!FAKE) await ensureSchema(); }

export function getDs(): DocuSignClient { return FAKE ? new FakeDocuSign() : createRealDocuSign(loadConfig().docusign); }

export function getBlobs(): BlobStore {
  if (FAKE) { memBlobs ??= new MemoryBlobStore(); return memBlobs; }
  return createNetlifyBlobStore();
}

export function buildDeps(): Deps { return { genId: () => crypto.randomUUID(), now: () => new Date().toISOString() }; }

export function isFake(): boolean { return FAKE; }
