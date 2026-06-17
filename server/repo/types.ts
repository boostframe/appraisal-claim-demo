import type { Lead, DemoEvent, Claim } from '../domain/types';

export interface Repository {
  createSession(id: string): Promise<void>;
  hasSession(id: string): Promise<boolean>;

  createLead(lead: Lead): Promise<void>;
  getLead(id: string): Promise<Lead | null>;
  updateLead(id: string, patch: Partial<Lead>): Promise<Lead>;

  /** Returns true if newly recorded, false if eventId was already processed. */
  recordEvent(event: DemoEvent): Promise<boolean>;
  listEvents(leadId: string): Promise<DemoEvent[]>;

  getClaimByLead(leadId: string): Promise<Claim | null>;
  /** Inserts a claim; if one already exists for leadId, returns the existing one. */
  insertClaim(claim: Claim): Promise<Claim>;
  countClaims(): Promise<number>;

  resetSession(sessionId: string): Promise<void>;
}
