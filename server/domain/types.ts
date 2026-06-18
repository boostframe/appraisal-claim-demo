export type LeadStatus = 'pending' | 'signed' | 'paid' | 'claimed';

export interface IntakeData {
  claimantName: string;
  claimantEmail: string;
  phone: string;
  address: string;
  insuranceCarrier: string;
  claimNumber: string;
  adjuster: string;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  vin: string;
  mileage: string;
  settlementOffer: string;
  lienholder: string;
  gapCoverage: string;            // 'Yes' | 'No' | 'Unknown' carried as a string
  requestRightToAppraisal: boolean;
}

export interface UploadRef {
  category: 'vehicle_photo' | 'valuation_report' | 'supporting_doc';
  key: string;
  name: string;
  size: number;
  contentType: string;
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
  uploads: UploadRef[];
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
  status: string;
  pdfBlobKey?: string;
  createdAt: string;
}

/** Injected so domain logic is deterministic in tests. */
export interface Deps {
  genId: () => string;
  now: () => string;
}
