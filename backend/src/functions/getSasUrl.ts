import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { generateUploadSasUrl } from '../services/blobStorage.js';
import { getTicketEntity } from '../services/tableStorage.js';

const CLOSED_STATUSES = ['OUT_OF_WARRANTY', 'CLOSED', 'AUTO_CLOSED', 'CLIENT_VALIDATED'];

export async function getSasUrlHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const ticketId = request.params.ticketId;
    if (!ticketId) {
      return { status: 400, jsonBody: { error: 'ticketId é obrigatório.' } };
    }

    const body = (await request.json().catch(() => ({}))) as { contentType?: string };
    const contentType = body.contentType ?? 'image/jpeg';

    const ticket = await getTicketEntity(ticketId);
    if (!ticket) {
      return { status: 404, jsonBody: { error: `Ticket ${ticketId} não encontrado.` } };
    }

    if (CLOSED_STATUSES.includes(ticket.status)) {
      return {
        status: 400,
        jsonBody: { error: 'Não é possível anexar fotos a um ticket encerrado.' },
      };
    }

    const { sasUrl, blobName } = await generateUploadSasUrl(ticketId, contentType);
    return { status: 200, jsonBody: { sasUrl, blobName } };
  } catch (err) {
    context.error('getSasUrl error:', err);
    return { status: 500, jsonBody: { error: 'Erro interno.' } };
  }
}

app.http('getSasUrl', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'tickets/{ticketId}/photos/sas',
  handler: getSasUrlHandler,
});
