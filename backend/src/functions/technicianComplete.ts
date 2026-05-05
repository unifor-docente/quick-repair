import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getTicketEntity, updateTicketEntity } from '../services/tableStorage.js';

export async function technicianCompleteHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const ticketId = request.params.ticketId;
    if (!ticketId) {
      return { status: 400, jsonBody: { error: 'ticketId é obrigatório.' } };
    }

    const ticket = await getTicketEntity(ticketId);
    if (!ticket) {
      return { status: 404, jsonBody: { error: `Ticket ${ticketId} não encontrado.` } };
    }

    if (ticket.status !== 'ASSIGNED') {
      return {
        status: 400,
        jsonBody: { error: `Ticket deve estar no status ASSIGNED. Status atual: ${ticket.status}` },
      };
    }

    const now = new Date().toISOString();
    await updateTicketEntity({
      partitionKey: 'TICKET',
      rowKey: ticketId,
      status: 'TECHNICIAN_COMPLETED',
      technicianCompletedAt: now,
      updatedAt: now,
    });

    return {
      status: 200,
      jsonBody: { ticketId, status: 'TECHNICIAN_COMPLETED', technicianCompletedAt: now },
    };
  } catch (err) {
    context.error('technicianComplete error:', err);
    return { status: 500, jsonBody: { error: 'Erro interno.' } };
  }
}

app.http('technicianComplete', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'tickets/{ticketId}/technician/complete',
  handler: technicianCompleteHandler,
});
