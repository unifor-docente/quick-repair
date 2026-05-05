import { app, InvocationContext, Timer } from '@azure/functions';
import { sendAutoCloseEmail } from '../services/emailService.js';
import { listTicketsByStatus, updateTicketEntity } from '../services/tableStorage.js';

const HOURS_72_MS = 72 * 60 * 60 * 1000;

export async function timerAutoCloseHandler(
  _timer: Timer,
  context: InvocationContext
): Promise<void> {
  context.log('timerAutoClose: checking TECHNICIAN_COMPLETED tickets...');

  const tickets = await listTicketsByStatus('TECHNICIAN_COMPLETED');
  const now = Date.now();
  let closed = 0;

  for (const ticket of tickets) {
    if (!ticket.technicianCompletedAt) {
      continue;
    }

    const completedAt = new Date(ticket.technicianCompletedAt).getTime();
    if (now - completedAt < HOURS_72_MS) {
      continue;
    }

    const nowIso = new Date().toISOString();
    await updateTicketEntity({
      partitionKey: 'TICKET',
      rowKey: ticket.rowKey,
      status: 'AUTO_CLOSED',
      autoClosedAt: nowIso,
      updatedAt: nowIso,
    });

    await sendAutoCloseEmail({
      to: ticket.clientEmail,
      clientName: ticket.clientName,
      ticketId: ticket.rowKey,
    }).catch((err) => context.error('sendAutoCloseEmail failed:', err));

    closed++;
    context.log(`Auto-closed ticket ${ticket.rowKey}`);
  }

  context.log(`timerAutoClose: ${closed} ticket(s) encerrado(s).`);
}

app.timer('timerAutoClose', {
  schedule: '0 */30 * * * *',
  handler: timerAutoCloseHandler,
});
