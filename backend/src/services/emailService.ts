import { EmailClient, KnownEmailSendStatus } from '@azure/communication-email';

const CONNECTION_STRING = process.env.ACS_CONNECTION_STRING ?? '';
const SENDER = process.env.ACS_EMAIL_SENDER ?? 'DoNotReply@azurecomm.net';

function getClient(): EmailClient | null {
  if (!CONNECTION_STRING || CONNECTION_STRING.includes('<your-acs')) {
    return null;
  }
  return new EmailClient(CONNECTION_STRING);
}

async function send(to: string, subject: string, html: string): Promise<void> {
  const client = getClient();
  if (!client) {
    console.log(`[EMAIL MOCK] To: ${to} | Subject: ${subject}`);
    return;
  }

  const poller = await client.beginSend({
    senderAddress: SENDER,
    content: { subject, html },
    recipients: { to: [{ address: to }] },
  });

  const result = await poller.pollUntilDone();
  if (result.status === KnownEmailSendStatus.Failed) {
    throw new Error(`ACS email failed: ${result.error?.message}`);
  }
}

export async function sendWarrantyConfirmationEmail(params: {
  to: string;
  clientName: string;
  ticketId: string;
  contractId: string;
  propertyName: string;
  technicianName: string;
  technicianEmail: string;
  problemType: string;
}): Promise<void> {
  await send(
    params.to,
    `[BSPAR] Chamado ${params.ticketId} — Visita Técnica Agendada`,
    `<h2>Olá, ${params.clientName}!</h2>
     <p>Seu chamado foi registrado com sucesso. Um técnico foi alocado para sua visita.</p>
     <table>
       <tr><td><strong>Chamado:</strong></td><td>${params.ticketId}</td></tr>
       <tr><td><strong>Contrato:</strong></td><td>${params.contractId}</td></tr>
       <tr><td><strong>Imóvel:</strong></td><td>${params.propertyName}</td></tr>
       <tr><td><strong>Problema:</strong></td><td>${params.problemType}</td></tr>
       <tr><td><strong>Técnico:</strong></td><td>${params.technicianName}</td></tr>
       <tr><td><strong>E-mail técnico:</strong></td><td>${params.technicianEmail}</td></tr>
     </table>
     <p>O técnico entrará em contato para confirmar o horário.</p>
     <p>Após a visita, você terá <strong>72 horas</strong> para validar o atendimento.</p>
     <br><p>BSPAR Corporações</p>`
  );
}

export async function sendOutOfWarrantyEmail(params: {
  to: string;
  clientName: string;
  contractId: string;
  propertyName: string;
  purchaseDate: string;
}): Promise<void> {
  const expiryDate = new Date(params.purchaseDate);
  expiryDate.setFullYear(expiryDate.getFullYear() + 10);

  await send(
    params.to,
    `[BSPAR] Imóvel fora do período de garantia`,
    `<h2>Olá, ${params.clientName}!</h2>
     <p>Recebemos sua solicitação, mas o imóvel <strong>${params.propertyName}</strong>
     (contrato ${params.contractId}) está fora do período de garantia de 10 anos.</p>
     <p>A garantia expirou em <strong>${expiryDate.toLocaleDateString('pt-BR')}</strong>.</p>
     <p>Entre em contato com nossa equipe comercial para solicitar um orçamento de manutenção.</p>
     <br><p>BSPAR Corporações</p>`
  );
}

export async function sendAutoCloseEmail(params: {
  to: string;
  clientName: string;
  ticketId: string;
}): Promise<void> {
  await send(
    params.to,
    `[BSPAR] Chamado ${params.ticketId} encerrado automaticamente`,
    `<h2>Olá, ${params.clientName}!</h2>
     <p>O chamado <strong>${params.ticketId}</strong> foi encerrado automaticamente
     pois não recebemos sua validação em até 72 horas após a conclusão da visita técnica.</p>
     <p>Se precisar reabrir o chamado ou tiver alguma dúvida, entre em contato.</p>
     <br><p>BSPAR Corporações</p>`
  );
}

export async function sendTechnicianAssignmentEmail(params: {
  to: string;
  technicianName: string;
  ticketId: string;
  contractId: string;
  clientName: string;
  clientEmail: string;
  propertyName: string;
  propertyType: string;
  problemType: string;
  description: string;
}): Promise<void> {
  await send(
    params.to,
    `[BSPAR] Novo chamado atribuído ${params.ticketId}`,
    `<h2>Olá, ${params.technicianName}!</h2>
     <p>Um novo chamado foi atribuído para atendimento técnico.</p>
     <table>
       <tr><td><strong>Chamado:</strong></td><td>${params.ticketId}</td></tr>
       <tr><td><strong>Contrato:</strong></td><td>${params.contractId}</td></tr>
       <tr><td><strong>Cliente:</strong></td><td>${params.clientName}</td></tr>
       <tr><td><strong>E-mail do cliente:</strong></td><td>${params.clientEmail}</td></tr>
       <tr><td><strong>Imóvel:</strong></td><td>${params.propertyName}</td></tr>
       <tr><td><strong>Tipo:</strong></td><td>${params.propertyType}</td></tr>
       <tr><td><strong>Problema:</strong></td><td>${params.problemType}</td></tr>
     </table>
     <p><strong>Descrição:</strong></p>
     <p>${params.description}</p>
     <p>Entre em contato com o cliente para combinar a visita técnica.</p>
     <br><p>BSPAR Corporações</p>`
  );
}
