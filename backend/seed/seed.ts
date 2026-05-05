import { AzureNamedKeyCredential, TableClient, TableServiceClient } from '@azure/data-tables';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

interface LocalSettings {
  Values: Record<string, string | undefined>;
}

const backendRoot = path.resolve(__dirname, '..');
const localSettingsPath = path.join(backendRoot, 'local.settings.json');
const exampleSettingsPath = path.join(backendRoot, 'local.settings.json.example');
const settingsPath = existsSync(localSettingsPath) ? localSettingsPath : exampleSettingsPath;
const settings = JSON.parse(readFileSync(settingsPath, 'utf-8')) as LocalSettings;
const env = settings.Values;

const CONNECTION_STRING = process.env.STORAGE_CONNECTION_STRING ?? env.STORAGE_CONNECTION_STRING;
const ACCOUNT_NAME = process.env.STORAGE_ACCOUNT_NAME ?? env.STORAGE_ACCOUNT_NAME;
const ACCOUNT_KEY = process.env.STORAGE_ACCOUNT_KEY ?? env.STORAGE_ACCOUNT_KEY;

if (!CONNECTION_STRING) {
  throw new Error('STORAGE_CONNECTION_STRING nao configurado.');
}

function getTableClient(tableName: string): TableClient {
  if (CONNECTION_STRING === 'UseDevelopmentStorage=true') {
    return TableClient.fromConnectionString(CONNECTION_STRING, tableName);
  }

  if (!ACCOUNT_NAME || !ACCOUNT_KEY) {
    throw new Error('STORAGE_ACCOUNT_NAME e STORAGE_ACCOUNT_KEY sao obrigatorios fora do Azurite.');
  }

  return new TableClient(
    `https://${ACCOUNT_NAME}.table.core.windows.net`,
    tableName,
    new AzureNamedKeyCredential(ACCOUNT_NAME, ACCOUNT_KEY)
  );
}

function getTableServiceClient(): TableServiceClient {
  if (CONNECTION_STRING === 'UseDevelopmentStorage=true') {
    return TableServiceClient.fromConnectionString(CONNECTION_STRING);
  }

  if (!ACCOUNT_NAME || !ACCOUNT_KEY) {
    throw new Error('STORAGE_ACCOUNT_NAME e STORAGE_ACCOUNT_KEY sao obrigatorios fora do Azurite.');
  }

  return new TableServiceClient(
    `https://${ACCOUNT_NAME}.table.core.windows.net`,
    new AzureNamedKeyCredential(ACCOUNT_NAME, ACCOUNT_KEY)
  );
}

async function ensureTables(): Promise<void> {
  const serviceClient = getTableServiceClient();

  for (const table of ['contracts', 'tickets', 'technicians']) {
    try {
      await serviceClient.createTable(table);
      console.log(`Table '${table}' criada.`);
    } catch {
      console.log(`Table '${table}' ja existe.`);
    }
  }
}

const contracts = [
  {
    partitionKey: 'CONTRACT',
    rowKey: 'BSPAR-2024-0001',
    clientName: 'Arimatéia Júnior',
    clientEmail: 'arimateiajunior.tic@gmail.com',
    propertyType: 'apartamento',
    propertyName: 'BS Design',
    purchaseDate: '2024-03-10',
    warrantyYears: 10,
  },
  {
    partitionKey: 'CONTRACT',
    rowKey: 'BSPAR-2023-0050',
    clientName: 'Ana Lima',
    clientEmail: 'arimateiajunior.tic@gmail.com',
    propertyType: 'apartamento',
    propertyName: 'BS Residence',
    purchaseDate: '2023-08-20',
    warrantyYears: 10,
  },
  {
    partitionKey: 'CONTRACT',
    rowKey: 'BSPAR-2012-0001',
    clientName: 'Maria Souza',
    clientEmail: 'arimateiajunior.tic@gmail.com',
    propertyType: 'ponto comercial',
    propertyName: 'Shopping XPTO',
    purchaseDate: '2012-01-15',
    warrantyYears: 10,
  },
];

const technicians = [
  {
    partitionKey: 'TECHNICIAN',
    rowKey: 'TEC-001',
    name: 'Carlos Tecnico',
    email: 'arimateiajunior.tic@gmail.com',
    specialties: JSON.stringify(['hidrossanitario', 'eletrico']),
    available: true,
  },
  {
    partitionKey: 'TECHNICIAN',
    rowKey: 'TEC-002',
    name: 'Fernanda Tecnica',
    email: 'arimateiajunior.tic@gmail.com',
    specialties: JSON.stringify(['estrutural', 'acabamento']),
    available: true,
  },
  {
    partitionKey: 'TECHNICIAN',
    rowKey: 'TEC-003',
    name: 'Roberto Tecnico',
    email: 'arimateiajunior.tic@gmail.com',
    specialties: JSON.stringify(['eletrico', 'outro']),
    available: false,
  },
];

async function seed(): Promise<void> {
  console.log('Iniciando seed...');
  await ensureTables();

  const contractsClient = getTableClient('contracts');
  for (const contract of contracts) {
    await contractsClient.upsertEntity(contract, 'Replace');
    console.log(`Contrato ${contract.rowKey} inserido.`);
  }

  const techniciansClient = getTableClient('technicians');
  for (const technician of technicians) {
    await techniciansClient.upsertEntity(technician, 'Replace');
    console.log(`Tecnico ${technician.rowKey} inserido.`);
  }

  console.log('Seed concluido!');
}

seed().catch((err) => {
  console.error('Seed falhou:', err);
  process.exitCode = 1;
});
