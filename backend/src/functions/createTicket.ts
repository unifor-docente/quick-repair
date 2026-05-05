import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { v4 as uuidv4 } from 'uuid';
import { CreateTicketRequest, CreateTicketResponse, Ticket } from '../types/index.js';
import { createTicketEntity, getAvailableTechnician, getContract } from '../services/tableStorage.js';
import { sendOutOfWarrantyEmail, sendWarrantyConfirmationEmail, sendTechnicianAssignmentEmail } from '../services/emailService.js';

function isWithinWarranty(purchaseDate: string, warrantyYears: number): boolean {
  const purchase = new Date(purchaseDate);
  const expiry = new Date(purchase);
  expiry.setFullYear(expiry.getFullYear() + warrantyYears);
  return new Date() <= expiry;
}

export async function createTicketHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const body = (await request.json()) as CreateTicketRequest;
    const { contractId, problemType, description } = body;

    if (!contractId || !problemType || !description) {
      return {
        status: 400,
        jsonBody: { error: 'contractId, problemType e description são obrigatórios.' },
      };
    }

    const normalizedContractId = contractId.trim().toUpperCase();
    const contract = await getContract(normalizedContractId);
    if (!contract) {
      return {
        status: 404,
        jsonBody: { error: `Contrato ${normalizedContractId} não encontrado.` },
      };
    }

    const now = new Date().toISOString();
    const ticketId = uuidv4();
    const withinWarranty = isWithinWarranty(contract.purchaseDate, contract.warrantyYears);

    if (!withinWarranty) {
      const ticket: Ticket = {
        partitionKey: 'TICKET',
        rowKey: ticketId,
        contractId: normalizedContractId,
        clientName: contract.clientName,
        clientEmail: contract.clientEmail,
        propertyName: contract.propertyName,
        propertyType: contract.propertyType,
        problemType,
        description,
        status: 'OUT_OF_WARRANTY',
        createdAt: now,
        updatedAt: now,
      };

      await createTicketEntity(ticket);
      await sendOutOfWarrantyEmail({
        to: contract.clientEmail,
        clientName: contract.clientName,
        contractId: normalizedContractId,
        propertyName: contract.propertyName,
        purchaseDate: contract.purchaseDate,
      });

      const response: CreateTicketResponse = {
        ticketId,
        status: 'OUT_OF_WARRANTY',
        message: 'Imóvel fora do período de garantia. Ticket registrado para fins de histórico.',
        warrantyValid: false,
      };

      return { status: 201, jsonBody: response };
    }

    const technician = await getAvailableTechnician(problemType);
    const ticket: Ticket = {
      partitionKey: 'TICKET',
      rowKey: ticketId,
      contractId: normalizedContractId,
      clientName: contract.clientName,
      clientEmail: contract.clientEmail,
      propertyName: contract.propertyName,
      propertyType: contract.propertyType,
      problemType,
      description,
      status: technician ? 'ASSIGNED' : 'OPEN',
      technicianId: technician?.rowKey,
      technicianName: technician?.name,
      technicianEmail: technician?.email,
      createdAt: now,
      updatedAt: now,
    };

    await createTicketEntity(ticket);

    if (technician) {
      await Promise.all([
        sendWarrantyConfirmationEmail({
          to: contract.clientEmail,
          clientName: contract.clientName,
          ticketId,
          contractId: normalizedContractId,
          propertyName: contract.propertyName,
          technicianName: technician.name,
          technicianEmail: technician.email,
          problemType,
        }),

        sendTechnicianAssignmentEmail({
          to: technician.email,
          technicianName: technician.name,
          ticketId,
          contractId: normalizedContractId,
          clientName: contract.clientName,
          clientEmail: contract.clientEmail,
          propertyName: contract.propertyName,
          propertyType: contract.propertyType,
          problemType,
          description,
        }),
      ]);
    }

    const response: CreateTicketResponse = {
      ticketId,
      status: ticket.status,
      message: technician
        ? `Chamado aberto e técnico ${technician.name} alocado.`
        : 'Chamado aberto. Técnico será alocado em breve.',
      technicianName: technician?.name,
      warrantyValid: true,
    };

    return { status: 201, jsonBody: response };
  } catch (err) {
    context.error('createTicket error:', err);
    return { status: 500, jsonBody: { error: 'Erro interno.' } };
  }
}

app.http('createTicket', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'tickets',
  handler: createTicketHandler,
});
