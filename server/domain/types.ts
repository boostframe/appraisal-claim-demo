export type LeadStatus = 'pending' | 'signed' | 'paid' | 'claimed';

export interface IntakeData {
  claimantName: string;
  claimantEmail: string;
  propertyAddress: string;
  lossType: string;
  lossDescription: string;
}

export interface Lead {
  id: string;
  sessionId: string;
  status: LeadStatus;
  intake: IntakeData;
  envelopeId?: string;
  signed: boolean;
  paid: boolean;
  pdfBlobKey?: string;
  createdAt: string;
  updatedAt: string;
}

export type EventType = 'envelope.completed' | 'payment.succeeded';

export interface DemoEvent {
  eventId: string;
  leadId: string;
  type: EventType;
  receivedAt: string;
  raw: unknown;
}

export interface Claim {
  id: string;
  leadId: string;
  claimNumber: string;
  pdfBlobKey?: string;
  createdAt: string;
}

/** Injected so domain logic is deterministic in tests. */
export interface Deps {
  genId: () => string;
  now: () => string;
}
