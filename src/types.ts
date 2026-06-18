// src/types.ts  (shared response shapes; pure types, importable by client and server)
export interface StateResponse {
  lead: { id: string; status: string; signed: boolean; paid: boolean } | null;
  events: { eventId: string; type: string; receivedAt: string }[];
  claim: { claimNumber: string; createdAt: string; pdfUrl: string } | null;
}

export interface CreateLeadResponse { leadId: string; signingUrl: string; fake: boolean }
