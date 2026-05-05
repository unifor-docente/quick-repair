import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getTicketEntity } from '../services/tableStorage.js';

export async function getTicketHandler(
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

    return { status: 200, jsonBody: ticket };
  } catch (err) {
    context.error('getTicket error:', err);
    return { status: 500, jsonBody: { error: 'Erro interno.' } };
  }
}

app.http('getTicket', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'tickets/{ticketId}',
  handler: getTicketHandler,
});
