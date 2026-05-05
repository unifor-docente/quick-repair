import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { sendAutoCloseEmail } from '../services/emailService.js';
import { getTicketEntity, updateTicketEntity } from '../services/tableStorage.js';

export async function autoCloseHandler(
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
        jsonBody: { error: 'Somente tickets em TECHNICIAN_COMPLETED podem ser encerrados automaticamente.' },
      };
    }

    const now = new Date().toISOString();
    await updateTicketEntity({
      partitionKey: 'TICKET',
      rowKey: ticketId,
      status: 'AUTO_CLOSED',
      autoClosedAt: now,
      updatedAt: now,
    });

    await sendAutoCloseEmail({
      to: ticket.clientEmail,
      clientName: ticket.clientName,
      ticketId,
    });

    return {
      status: 200,
      jsonBody: { ticketId, status: 'AUTO_CLOSED', autoClosedAt: now },
    };
  } catch (err) {
    context.error('autoClose error:', err);
    return { status: 500, jsonBody: { error: 'Erro interno.' } };
  }
}

app.http('autoClose', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'tickets/{ticketId}/auto-close',
  handler: autoCloseHandler,
});
