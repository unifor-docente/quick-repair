import { TableClient, TableServiceClient, AzureNamedKeyCredential, odata } from '@azure/data-tables';
import { Contract, Technician, Ticket } from '../types/index.js';

const ACCOUNT_NAME = process.env.STORAGE_ACCOUNT_NAME!;
const ACCOUNT_KEY = process.env.STORAGE_ACCOUNT_KEY!;
const CONNECTION_STRING = process.env.STORAGE_CONNECTION_STRING!;

function getTableClient(tableName: string): TableClient {
  if (CONNECTION_STRING === 'UseDevelopmentStorage=true') {
    return TableClient.fromConnectionString(CONNECTION_STRING, tableName);
  }
  const credential = new AzureNamedKeyCredential(ACCOUNT_NAME, ACCOUNT_KEY);
  return new TableClient(
    `https://${ACCOUNT_NAME}.table.core.windows.net`,
    tableName,
    credential
  );
}

const contractsClient = () => getTableClient('contracts');
const ticketsClient = () => getTableClient('tickets');
const techniciansClient = () => getTableClient('technicians');

export async function getContract(contractId: string): Promise<Contract | null> {
  try {
    const entity = await contractsClient().getEntity<Contract>('CONTRACT', contractId);
    return entity as Contract;
  } catch (e: any) {
    if (e.statusCode === 404) return null;
    throw e;
  }
}

export async function getAvailableTechnician(problemType: string): Promise<Technician | null> {
  const client = techniciansClient();
  const entities = client.listEntities<Technician>({
    queryOptions: { filter: odata`PartitionKey eq 'TECHNICIAN' and available eq true` }
  });

  for await (const entity of entities) {
    const specialties: string[] = JSON.parse(entity.specialties ?? '[]');
    if (specialties.includes(problemType)) {
      return entity as Technician;
    }
  }

  const entities2 = client.listEntities<Technician>({
    queryOptions: { filter: odata`PartitionKey eq 'TECHNICIAN' and available eq true` }
  });
  for await (const entity of entities2) {
    return entity as Technician;
  }
  return null;
}

export async function upsertTechnician(tech: Technician): Promise<void> {
  await techniciansClient().upsertEntity(tech, 'Replace');
}

export async function createTicketEntity(ticket: Ticket): Promise<void> {
  await ticketsClient().createEntity(ticket);
}

export async function getTicketEntity(ticketId: string): Promise<Ticket | null> {
  try {
    const entity = await ticketsClient().getEntity<Ticket>('TICKET', ticketId);
    return entity as Ticket;
  } catch (e: any) {
    if (e.statusCode === 404) return null;
    throw e;
  }
}

export async function updateTicketEntity(ticket: Partial<Ticket> & { partitionKey: string; rowKey: string }): Promise<void> {
  await ticketsClient().updateEntity(ticket, 'Merge');
}

export async function listTicketsByStatus(status: string): Promise<Ticket[]> {
  const results: Ticket[] = [];
  const entities = ticketsClient().listEntities<Ticket>({
    queryOptions: { filter: odata`PartitionKey eq 'TICKET' and status eq ${status}` }
  });
  for await (const entity of entities) {
    results.push(entity as Ticket);
  }
  return results;
}

export async function ensureTablesExist(): Promise<void> {
  const serviceClient = CONNECTION_STRING === 'UseDevelopmentStorage=true'
    ? TableServiceClient.fromConnectionString(CONNECTION_STRING)
    : new TableServiceClient(
        `https://${ACCOUNT_NAME}.table.core.windows.net`,
        new AzureNamedKeyCredential(ACCOUNT_NAME, ACCOUNT_KEY)
      );

  for (const table of ['contracts', 'tickets', 'technicians']) {
    await serviceClient.createTable(table).catch(() => {});
  }
}
