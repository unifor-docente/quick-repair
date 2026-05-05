export type ProblemType = 'hidrossanitario' | 'eletrico' | 'estrutural' | 'acabamento' | 'outro';

export type TicketStatus =
  | 'OPEN'
  | 'OUT_OF_WARRANTY'
  | 'ASSIGNED'
  | 'TECHNICIAN_COMPLETED'
  | 'CLIENT_VALIDATED'
  | 'AUTO_CLOSED'
  | 'CLOSED';

export interface CreateTicketResponse {
  ticketId: string;
  status: TicketStatus;
  message: string;
  technicianName?: string;
  warrantyValid: boolean;
}

export interface Ticket {
  rowKey: string;
  contractId: string;
  clientName: string;
  propertyName: string;
  propertyType: string;
  problemType: ProblemType;
  description: string;
  status: TicketStatus;
  technicianName?: string;
  technicianCompletedAt?: string;
  clientValidatedAt?: string;
  autoClosedAt?: string;
  createdAt: string;
  updatedAt: string;
}
