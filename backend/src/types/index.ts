export type ProblemType = 'hidrossanitario' | 'eletrico' | 'estrutural' | 'acabamento' | 'outro';

export type TicketStatus =
  | 'OPEN'
  | 'OUT_OF_WARRANTY'
  | 'ASSIGNED'
  | 'TECHNICIAN_COMPLETED'
  | 'CLIENT_VALIDATED'
  | 'AUTO_CLOSED'
  | 'CLOSED';

export interface Contract {
  partitionKey: string;
  rowKey: string;
  clientName: string;
  clientEmail: string;
  propertyType: string;
  propertyName: string;
  purchaseDate: string;
  warrantyYears: number;
}

export interface Technician {
  partitionKey: string;
  rowKey: string;
  name: string;
  email: string;
  specialties: string;
  available: boolean;
}

export interface Ticket {
  partitionKey: string;
  rowKey: string;
  contractId: string;
  clientName: string;
  clientEmail: string;
  propertyName: string;
  propertyType: string;
  problemType: ProblemType;
  description: string;
  status: TicketStatus;
  technicianId?: string;
  technicianName?: string;
  technicianEmail?: string;
  technicianCompletedAt?: string;
  clientValidatedAt?: string;
  autoClosedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketRequest {
  contractId: string;
  problemType: ProblemType;
  description: string;
}

export interface CreateTicketResponse {
  ticketId: string;
  status: TicketStatus;
  message: string;
  technicianName?: string;
  warrantyValid: boolean;
}

export interface SasUrlResponse {
  sasUrl: string;
  blobName: string;
}
