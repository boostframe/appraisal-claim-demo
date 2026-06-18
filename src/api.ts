// src/api.ts
import type { CreateLeadResponse, StateResponse } from './types';
import type { IntakeData } from '../server/domain/types';

async function post<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${path} -> ${r.status}`);
  return r.json() as Promise<T>;
}
export const createLead = (passcode: string, intake: IntakeData) => post<CreateLeadResponse>('/api/create-lead', { passcode, intake });
export const getState = async (leadId: string): Promise<StateResponse> => {
  const r = await fetch(`/api/get-state?leadId=${leadId}`);
  if (!r.ok) throw new Error(`/api/get-state -> ${r.status}`);
  return r.json() as Promise<StateResponse>;
};
export const simulatePayment = (leadId: string) => post<{ duplicate: boolean; claimed: boolean }>('/api/simulate-payment', { leadId });
export const replayEvent = (leadId: string) => post<{ replayed: string | null; duplicate: boolean }>('/api/replay-event', { leadId });
export const reset = () => post<{ ok: boolean }>('/api/reset', {});
export const completeSigningDev = (leadId: string) => post<{ duplicate: boolean; claimed: boolean }>('/api/dev-complete-signing', { leadId });
export const uploadFile = async (leadId: string, category: string, file: File) => {
  const fd = new FormData();
  fd.append('leadId', leadId);
  fd.append('category', category);
  fd.append('file', file);
  const r = await fetch('/api/upload', { method: 'POST', body: fd });
  if (!r.ok) throw new Error(`/api/upload -> ${r.status}`);
  return r.json() as Promise<{ key: string; name: string; size: number; category: string }>;
};
