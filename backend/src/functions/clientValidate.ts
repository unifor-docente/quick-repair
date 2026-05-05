import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getTicketEntity, updateTicketEntity } from '../services/tableStorage.js';

const VALIDATION_WINDOW_MS = 72 * 60 * 60 * 1000;

export async function clientValidateHandler(
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

    if (ticket.status !== 'TECHNICIAN_COMPLETED') {
      return {
        status: 400,
        jsonBody: { error: `Ticket deve estar em TECHNICIAN_COMPLETED. Status atual: ${ticket.status}` },
      };
    }

    if (!ticket.technicianCompletedAt) {
      return {
        status: 400,
        jsonBody: { error: 'Ticket não possui data de conclusão técnica.' },
      };
    }

    const completedAt = new Date(ticket.technicianCompletedAt);
    const deadline = new Date(completedAt.getTime() + VALIDATION_WINDOW_MS);
    if (new Date() > deadline) {
      return {
        status: 400,
        jsonBody: { error: 'Prazo de 72h para validação expirado. Ticket será encerrado automaticamente.' },
      };
    }

    const now = new Date().toISOString();
    await updateTicketEntity({
      partitionKey: 'TICKET',
      rowKey: ticketId,
      status: 'CLIENT_VALIDATED',
      clientValidatedAt: now,
      updatedAt: now,
    });

    return {
      status: 200,
      jsonBody: { ticketId, status: 'CLIENT_VALIDATED', clientValidatedAt: now },
    };
  } catch (err) {
    context.error('clientValidate error:', err);
    return { status: 500, jsonBody: { error: 'Erro interno.' } };
  }
}

app.http('clientValidate', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'tickets/{ticketId}/client/validate',
  handler: clientValidateHandler,
});
