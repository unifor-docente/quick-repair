import type { CreateTicketResponse, Ticket } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';
const FUNCTION_KEY = import.meta.env.VITE_FUNCTION_KEY;

function apiHeaders(extra?: HeadersInit): HeadersInit {
  return FUNCTION_KEY
    ? { 'x-functions-key': FUNCTION_KEY, ...extra }
    : { ...extra };
}

async function readError(res: Response): Promise<Error> {
  const err = (await res.json().catch(() => ({}))) as { error?: string };
  return new Error(err.error ?? `HTTP ${res.status}`);
}

export async function openTicket(data: {
  contractId: string;
  problemType: string;
  description: string;
}): Promise<CreateTicketResponse> {
  const res = await fetch(`${BASE_URL}/tickets`, {
    method: 'POST',
    headers: apiHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw await readError(res);
  }

  return res.json() as Promise<CreateTicketResponse>;
}

export async function fetchTicket(ticketId: string): Promise<Ticket> {
  const res = await fetch(`${BASE_URL}/tickets/${ticketId}`, {
    headers: apiHeaders(),
  });

  if (!res.ok) {
    throw await readError(res);
  }

  return res.json() as Promise<Ticket>;
}

export async function validateTicket(ticketId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/tickets/${ticketId}/client/validate`, {
    method: 'POST',
    headers: apiHeaders(),
  });

  if (!res.ok) {
    throw await readError(res);
  }
}

export async function getSasUrl(
  ticketId: string,
  contentType: string
): Promise<{ sasUrl: string; blobName: string }> {
  const res = await fetch(`${BASE_URL}/tickets/${ticketId}/photos/sas`, {
    method: 'POST',
    headers: apiHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ contentType }),
  });

  if (!res.ok) {
    throw await readError(res);
  }

  return res.json() as Promise<{ sasUrl: string; blobName: string }>;
}

export async function uploadPhoto(sasUrl: string, file: File): Promise<void> {
  const res = await fetch(sasUrl, {
    method: 'PUT',
    headers: {
      'x-ms-blob-type': 'BlockBlob',
      'Content-Type': file.type,
    },
    body: file,
  });

  if (!res.ok) {
    throw new Error(`Upload falhou: HTTP ${res.status}`);
  }
}
