# BSPAR Quick Repair MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** MVP de gestão de garantias para a BSPAR Corporações — clientes abrem tickets de visita técnica informando o contrato, o sistema valida cobertura de 10 anos, aloca técnico, envia e-mail e encerra automaticamente após 72h sem validação do cliente.

**Architecture:** React SPA (Vite) hospedado no Azure Static Web Apps consome Azure Functions v4 (TypeScript) via HTTP. Dados armazenados em Azure Table Storage (contratos, tickets, técnicos). Fotos em Azure Blob Storage com SAS URL. Azure Communication Services Email (nativo Azure, equivalente ao AWS SES) envia e-mails. Timer Trigger verifica tickets TECHNICIAN_COMPLETED a cada 30 min para encerramento automático. Toda infra provisionada via Terraform; CI/CD pelo GitHub Actions.

**Tech Stack:** TypeScript 5, Azure Functions v4 Node.js 20, `@azure/data-tables`, `@azure/storage-blob`, `@azure/communication-email`, React 18 + Vite + Tailwind CSS, Terraform azurerm ~>3.0, GitHub Actions

---

## Estrutura de Arquivos

```
quick-repair/
├── .github/
│   └── workflows/
│       ├── terraform-plan.yml        # Roda em PRs automaticamente
│       ├── terraform-apply.yml       # Dispatch manual
│       └── terraform-destroy.yml    # Dispatch manual
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/client.ts             # Fetch wrapper para a API
│   │   ├── components/
│   │   │   ├── TicketForm.tsx        # Formulário principal de abertura
│   │   │   └── TicketStatus.tsx      # Card de status do ticket
│   │   ├── pages/
│   │   │   ├── HomePage.tsx          # Página inicial com formulário
│   │   │   └── TicketPage.tsx        # Página de acompanhamento
│   │   ├── types/index.ts            # Tipos compartilhados com o backend
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── backend/
│   ├── src/
│   │   ├── functions/
│   │   │   ├── createTicket.ts       # POST /tickets
│   │   │   ├── getTicket.ts          # GET /tickets/{ticketId}
│   │   │   ├── getSasUrl.ts          # POST /tickets/{ticketId}/photos/sas
│   │   │   ├── technicianComplete.ts # POST /tickets/{ticketId}/technician/complete
│   │   │   ├── clientValidate.ts     # POST /tickets/{ticketId}/client/validate
│   │   │   ├── autoClose.ts          # POST /tickets/{ticketId}/auto-close
│   │   │   └── timerAutoClose.ts     # Timer trigger (a cada 30 min)
│   │   ├── services/
│   │   │   ├── tableStorage.ts       # Wrapper Azure Table Storage
│   │   │   ├── blobStorage.ts        # SAS URL generation
│   │   │   └── emailService.ts       # SendGrid wrapper
│   │   └── types/index.ts            # Interfaces compartilhadas
│   ├── seed/
│   │   └── seed.ts                   # Script de seed de contratos e técnicos
│   ├── host.json
│   ├── local.settings.json.example
│   ├── package.json
│   └── tsconfig.json
├── infrastructure/
│   ├── providers.tf                  # Provider azurerm + versões
│   ├── backend.tf                    # Estado remoto no Azure Blob
│   ├── variables.tf                  # Variáveis (projeto, ambiente, região)
│   ├── main.tf                       # Todos os recursos Azure
│   └── outputs.tf                    # URLs, nomes, connection strings
├── docs/
│   └── superpowers/plans/
│       └── 2026-05-05-bspar-quick-repair-mvp.md
├── .gitignore
└── README.md
```

---

## Task 1: Estrutura do Repositório + Arquivos Raiz

**Files:**
- Create: `.gitignore`
- Create: `README.md`
- Create: `backend/host.json`
- Create: `backend/local.settings.json.example`
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`

- [ ] **Step 1.1: Criar `.gitignore`**

```gitignore
# Node
node_modules/
dist/
.cache/

# Azure Functions
backend/local.settings.json

# Terraform
**/.terraform/
*.tfstate
*.tfstate.backup
*.tfvars
!*.tfvars.example
.terraform.lock.hcl

# Env
.env
.env.local

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db
```

- [ ] **Step 1.2: Criar `backend/host.json`**

```json
{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "excludedTypes": "Request"
      }
    }
  },
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[4.*, 5.0.0)"
  }
}
```

- [ ] **Step 1.3: Criar `backend/local.settings.json.example`**

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "STORAGE_CONNECTION_STRING": "UseDevelopmentStorage=true",
    "STORAGE_ACCOUNT_NAME": "devstoreaccount1",
    "STORAGE_ACCOUNT_KEY": "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==",
    "BLOB_CONTAINER_PHOTOS": "ticket-photos",
    "ACS_CONNECTION_STRING": "endpoint=https://acs-dev.communication.azure.com/;accesskey=...",
    "ACS_EMAIL_SENDER": "DoNotReply@<acs-domain>.azurecomm.net",
    "APPINSIGHTS_INSTRUMENTATIONKEY": ""
  }
}
```

- [ ] **Step 1.4: Criar `backend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2022",
    "outDir": "dist",
    "rootDir": "src",
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 1.5: Criar `backend/package.json`**

```json
{
  "name": "quick-repair-backend",
  "version": "1.0.0",
  "private": true,
  "main": "dist/{,**/}*.js",
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "start": "func start --typescript",
    "seed": "ts-node seed/seed.ts",
    "test": "jest --passWithNoTests",
    "test:watch": "jest --watch"
  },
  "dependencies": {
    "@azure/communication-email": "^1.0.0",
    "@azure/data-tables": "^13.2.2",
    "@azure/functions": "^4.3.0",
    "@azure/storage-blob": "^12.23.0",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@types/jest": "^29.5.12",
    "@types/node": "^20.12.12",
    "@types/uuid": "^9.0.8",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.4",
    "ts-node": "^10.9.2",
    "typescript": "^5.4.5",
    "azure-functions-core-tools": "^4.0.5611"
  },
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node",
    "roots": ["<rootDir>/src"],
    "testMatch": ["**/*.test.ts"]
  }
}
```

- [ ] **Step 1.6: Instalar dependências do backend**

```bash
cd backend && npm install
```

Expected: `node_modules/` criado sem erros.

- [ ] **Step 1.7: Commit inicial**

```bash
git init
git add .gitignore backend/host.json backend/local.settings.json.example backend/tsconfig.json backend/package.json
git commit -m "chore: scaffold backend project structure"
```

---

## Task 2: Backend — Tipos TypeScript

**Files:**
- Create: `backend/src/types/index.ts`

- [ ] **Step 2.1: Criar `backend/src/types/index.ts`**

```typescript
export type ProblemType = 'hidrossanitario' | 'eletrico' | 'estrutural' | 'acabamento' | 'outro';

export type TicketStatus =
  | 'OPEN'
  | 'OUT_OF_WARRANTY'
  | 'ASSIGNED'
  | 'TECHNICIAN_COMPLETED'
  | 'CLIENT_VALIDATED'
  | 'AUTO_CLOSED'
  | 'CLOSED';

export interface Contract {
  partitionKey: string;        // "CONTRACT"
  rowKey: string;              // contractId ex: "BSPAR-2024-0001"
  clientName: string;
  clientEmail: string;
  propertyType: string;        // "apartamento" | "ponto comercial"
  propertyName: string;
  purchaseDate: string;        // ISO date string "2024-03-10"
  warrantyYears: number;
}

export interface Technician {
  partitionKey: string;        // "TECHNICIAN"
  rowKey: string;              // technicianId ex: "TEC-001"
  name: string;
  email: string;
  specialties: string;         // JSON array serializado: '["hidrossanitario","eletrico"]'
  available: boolean;
}

export interface Ticket {
  partitionKey: string;        // "TICKET"
  rowKey: string;              // ticketId (UUID)
  contractId: string;
  clientName: string;
  clientEmail: string;
  propertyName: string;
  propertyType: string;
  problemType: ProblemType;
  description: string;
  status: TicketStatus;
  technicianId?: string;
  technicianName?: string;
  technicianEmail?: string;
  technicianCompletedAt?: string;  // ISO string
  clientValidatedAt?: string;
  autoClosedAt?: string;
  createdAt: string;           // ISO string
  updatedAt: string;           // ISO string
}

export interface CreateTicketRequest {
  contractId: string;
  problemType: ProblemType;
  description: string;
}

export interface CreateTicketResponse {
  ticketId: string;
  status: TicketStatus;
  message: string;
  technicianName?: string;
  warrantyValid: boolean;
}

export interface SasUrlResponse {
  sasUrl: string;
  blobName: string;
}
```

- [ ] **Step 2.2: Commit**

```bash
git add backend/src/types/index.ts
git commit -m "feat: add TypeScript domain types"
```

---

## Task 3: Backend — Serviço Azure Table Storage

**Files:**
- Create: `backend/src/services/tableStorage.ts`

- [ ] **Step 3.1: Criar `backend/src/services/tableStorage.ts`**

```typescript
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

// ── Contracts ──────────────────────────────────────────────────────────────

export async function getContract(contractId: string): Promise<Contract | null> {
  try {
    const entity = await contractsClient().getEntity<Contract>('CONTRACT', contractId);
    return entity as Contract;
  } catch (e: any) {
    if (e.statusCode === 404) return null;
    throw e;
  }
}

// ── Technicians ────────────────────────────────────────────────────────────

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
  // Se não encontrar especialista, retorna qualquer disponível
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

// ── Tickets ────────────────────────────────────────────────────────────────

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

// ── Tables bootstrap (usado no seed) ──────────────────────────────────────

export async function ensureTablesExist(): Promise<void> {
  const serviceClient = CONNECTION_STRING === 'UseDevelopmentStorage=true'
    ? TableServiceClient.fromConnectionString(CONNECTION_STRING)
    : new TableServiceClient(
        `https://${ACCOUNT_NAME}.table.core.windows.net`,
        new AzureNamedKeyCredential(ACCOUNT_NAME, ACCOUNT_KEY)
      );

  for (const table of ['contracts', 'tickets', 'technicians']) {
    await serviceClient.createTable(table).catch(() => {/* already exists */});
  }
}
```

- [ ] **Step 3.2: Commit**

```bash
git add backend/src/services/tableStorage.ts
git commit -m "feat: add Azure Table Storage service"
```

---

## Task 4: Backend — Serviço Blob Storage (SAS URL)

**Files:**
- Create: `backend/src/services/blobStorage.ts`

- [ ] **Step 4.1: Criar `backend/src/services/blobStorage.ts`**

```typescript
import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  SASProtocol,
} from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';

const ACCOUNT_NAME = process.env.STORAGE_ACCOUNT_NAME!;
const ACCOUNT_KEY = process.env.STORAGE_ACCOUNT_KEY!;
const CONNECTION_STRING = process.env.STORAGE_CONNECTION_STRING!;
const CONTAINER_NAME = process.env.BLOB_CONTAINER_PHOTOS ?? 'ticket-photos';

function getBlobServiceClient(): BlobServiceClient {
  if (CONNECTION_STRING === 'UseDevelopmentStorage=true') {
    return BlobServiceClient.fromConnectionString(CONNECTION_STRING);
  }
  return BlobServiceClient.fromConnectionString(CONNECTION_STRING);
}

export async function generateUploadSasUrl(ticketId: string, contentType: string): Promise<{ sasUrl: string; blobName: string }> {
  const extension = contentType.includes('png') ? 'png'
    : contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg'
    : 'bin';

  const blobName = `${ticketId}/${uuidv4()}.${extension}`;

  if (CONNECTION_STRING === 'UseDevelopmentStorage=true') {
    // Azurite: retorna URL direta (SAS não funciona bem localmente)
    const client = getBlobServiceClient();
    const containerClient = client.getContainerClient(CONTAINER_NAME);
    await containerClient.createIfNotExists({ access: 'blob' });
    const blobClient = containerClient.getBlockBlobClient(blobName);
    return {
      sasUrl: blobClient.url,
      blobName,
    };
  }

  const sharedKeyCredential = new StorageSharedKeyCredential(ACCOUNT_NAME, ACCOUNT_KEY);
  const expiresOn = new Date();
  expiresOn.setMinutes(expiresOn.getMinutes() + 15);

  const sasQueryParams = generateBlobSASQueryParameters(
    {
      containerName: CONTAINER_NAME,
      blobName,
      permissions: BlobSASPermissions.parse('cw'),
      startsOn: new Date(),
      expiresOn,
      contentType,
      protocol: SASProtocol.Https,
    },
    sharedKeyCredential
  );

  const sasUrl = `https://${ACCOUNT_NAME}.blob.core.windows.net/${CONTAINER_NAME}/${blobName}?${sasQueryParams.toString()}`;
  return { sasUrl, blobName };
}
```

- [ ] **Step 4.2: Commit**

```bash
git add backend/src/services/blobStorage.ts
git commit -m "feat: add Blob Storage SAS URL service"
```

---

## Task 5: Backend — Serviço de E-mail (SendGrid)

**Files:**
- Create: `backend/src/services/emailService.ts`

- [ ] **Step 5.1: Criar `backend/src/services/emailService.ts`**

```typescript
import { EmailClient, KnownEmailSendStatus } from '@azure/communication-email';

const CONNECTION_STRING = process.env.ACS_CONNECTION_STRING ?? '';
const SENDER = process.env.ACS_EMAIL_SENDER ?? 'DoNotReply@azurecomm.net';

function getClient(): EmailClient | null {
  if (!CONNECTION_STRING || CONNECTION_STRING.includes('...')) {
    return null; // Skip em dev local sem ACS configurado
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
```

- [ ] **Step 5.2: Commit**

```bash
git add backend/src/services/emailService.ts
git commit -m "feat: add SendGrid email service"
```

---

## Task 6: Backend — Função `POST /tickets`

**Files:**
- Create: `backend/src/functions/createTicket.ts`

- [ ] **Step 6.1: Criar `backend/src/functions/createTicket.ts`**

```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { v4 as uuidv4 } from 'uuid';
import { CreateTicketRequest, CreateTicketResponse, Ticket } from '../types/index.js';
import { getContract, getAvailableTechnician, createTicketEntity } from '../services/tableStorage.js';
import { sendWarrantyConfirmationEmail, sendOutOfWarrantyEmail } from '../services/emailService.js';

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
      return { status: 400, jsonBody: { error: 'contractId, problemType e description são obrigatórios.' } };
    }

    const contract = await getContract(contractId);
    if (!contract) {
      return { status: 404, jsonBody: { error: `Contrato ${contractId} não encontrado.` } };
    }

    const now = new Date().toISOString();
    const ticketId = uuidv4();
    const withinWarranty = isWithinWarranty(contract.purchaseDate, contract.warrantyYears);

    if (!withinWarranty) {
      const ticket: Ticket = {
        partitionKey: 'TICKET',
        rowKey: ticketId,
        contractId,
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
        contractId,
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

    // Dentro da garantia — alocar técnico
    const technician = await getAvailableTechnician(problemType);
    const ticket: Ticket = {
      partitionKey: 'TICKET',
      rowKey: ticketId,
      contractId,
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
      await sendWarrantyConfirmationEmail({
        to: contract.clientEmail,
        clientName: contract.clientName,
        ticketId,
        contractId,
        propertyName: contract.propertyName,
        technicianName: technician.name,
        technicianEmail: technician.email,
        problemType,
      });
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
```

- [ ] **Step 6.2: Commit**

```bash
git add backend/src/functions/createTicket.ts
git commit -m "feat: implement POST /tickets with warranty check"
```

---

## Task 7: Backend — Função `GET /tickets/{ticketId}`

**Files:**
- Create: `backend/src/functions/getTicket.ts`

- [ ] **Step 7.1: Criar `backend/src/functions/getTicket.ts`**

```typescript
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
```

- [ ] **Step 7.2: Commit**

```bash
git add backend/src/functions/getTicket.ts
git commit -m "feat: implement GET /tickets/{ticketId}"
```

---

## Task 8: Backend — Função `POST /tickets/{ticketId}/photos/sas`

**Files:**
- Create: `backend/src/functions/getSasUrl.ts`

- [ ] **Step 8.1: Criar `backend/src/functions/getSasUrl.ts`**

```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getTicketEntity } from '../services/tableStorage.js';
import { generateUploadSasUrl } from '../services/blobStorage.js';

export async function getSasUrlHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const ticketId = request.params.ticketId;
    const body = (await request.json()) as { contentType?: string };
    const contentType = body.contentType ?? 'image/jpeg';

    const ticket = await getTicketEntity(ticketId);
    if (!ticket) {
      return { status: 404, jsonBody: { error: `Ticket ${ticketId} não encontrado.` } };
    }

    if (['OUT_OF_WARRANTY', 'CLOSED', 'AUTO_CLOSED', 'CLIENT_VALIDATED'].includes(ticket.status)) {
      return { status: 400, jsonBody: { error: 'Não é possível anexar fotos a um ticket encerrado.' } };
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
```

- [ ] **Step 8.2: Commit**

```bash
git add backend/src/functions/getSasUrl.ts
git commit -m "feat: implement POST /tickets/{ticketId}/photos/sas"
```

---

## Task 9: Backend — Função `POST /tickets/{ticketId}/technician/complete`

**Files:**
- Create: `backend/src/functions/technicianComplete.ts`

- [ ] **Step 9.1: Criar `backend/src/functions/technicianComplete.ts`**

```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getTicketEntity, updateTicketEntity } from '../services/tableStorage.js';

export async function technicianCompleteHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const ticketId = request.params.ticketId;
    const ticket = await getTicketEntity(ticketId);

    if (!ticket) {
      return { status: 404, jsonBody: { error: `Ticket ${ticketId} não encontrado.` } };
    }
    if (ticket.status !== 'ASSIGNED') {
      return { status: 400, jsonBody: { error: `Ticket deve estar no status ASSIGNED. Status atual: ${ticket.status}` } };
    }

    const now = new Date().toISOString();
    await updateTicketEntity({
      partitionKey: 'TICKET',
      rowKey: ticketId,
      status: 'TECHNICIAN_COMPLETED',
      technicianCompletedAt: now,
      updatedAt: now,
    });

    return { status: 200, jsonBody: { ticketId, status: 'TECHNICIAN_COMPLETED', technicianCompletedAt: now } };

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
```

- [ ] **Step 9.2: Commit**

```bash
git add backend/src/functions/technicianComplete.ts
git commit -m "feat: implement POST /tickets/{ticketId}/technician/complete"
```

---

## Task 10: Backend — Função `POST /tickets/{ticketId}/client/validate`

**Files:**
- Create: `backend/src/functions/clientValidate.ts`

- [ ] **Step 10.1: Criar `backend/src/functions/clientValidate.ts`**

```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getTicketEntity, updateTicketEntity } from '../services/tableStorage.js';

export async function clientValidateHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const ticketId = request.params.ticketId;
    const ticket = await getTicketEntity(ticketId);

    if (!ticket) {
      return { status: 404, jsonBody: { error: `Ticket ${ticketId} não encontrado.` } };
    }
    if (ticket.status !== 'TECHNICIAN_COMPLETED') {
      return { status: 400, jsonBody: { error: `Ticket deve estar em TECHNICIAN_COMPLETED. Status atual: ${ticket.status}` } };
    }

    const completedAt = new Date(ticket.technicianCompletedAt!);
    const deadline = new Date(completedAt.getTime() + 72 * 60 * 60 * 1000);
    if (new Date() > deadline) {
      return { status: 400, jsonBody: { error: 'Prazo de 72h para validação expirado. Ticket será encerrado automaticamente.' } };
    }

    const now = new Date().toISOString();
    await updateTicketEntity({
      partitionKey: 'TICKET',
      rowKey: ticketId,
      status: 'CLIENT_VALIDATED',
      clientValidatedAt: now,
      updatedAt: now,
    });

    return { status: 200, jsonBody: { ticketId, status: 'CLIENT_VALIDATED', clientValidatedAt: now } };

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
```

- [ ] **Step 10.2: Commit**

```bash
git add backend/src/functions/clientValidate.ts
git commit -m "feat: implement POST /tickets/{ticketId}/client/validate"
```

---

## Task 11: Backend — Função `POST /tickets/{ticketId}/auto-close`

**Files:**
- Create: `backend/src/functions/autoClose.ts`

- [ ] **Step 11.1: Criar `backend/src/functions/autoClose.ts`**

```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getTicketEntity, updateTicketEntity } from '../services/tableStorage.js';
import { sendAutoCloseEmail } from '../services/emailService.js';

export async function autoCloseHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const ticketId = request.params.ticketId;
    const ticket = await getTicketEntity(ticketId);

    if (!ticket) {
      return { status: 404, jsonBody: { error: `Ticket ${ticketId} não encontrado.` } };
    }
    if (ticket.status !== 'TECHNICIAN_COMPLETED') {
      return { status: 400, jsonBody: { error: `Somente tickets em TECHNICIAN_COMPLETED podem ser encerrados automaticamente.` } };
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

    return { status: 200, jsonBody: { ticketId, status: 'AUTO_CLOSED', autoClosedAt: now } };

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
```

- [ ] **Step 11.2: Commit**

```bash
git add backend/src/functions/autoClose.ts
git commit -m "feat: implement POST /tickets/{ticketId}/auto-close"
```

---

## Task 12: Backend — Timer Trigger (Auto-close 72h)

**Files:**
- Create: `backend/src/functions/timerAutoClose.ts`

- [ ] **Step 12.1: Criar `backend/src/functions/timerAutoClose.ts`**

```typescript
import { app, Timer, InvocationContext } from '@azure/functions';
import { listTicketsByStatus, updateTicketEntity } from '../services/tableStorage.js';
import { sendAutoCloseEmail } from '../services/emailService.js';

const HOURS_72 = 72 * 60 * 60 * 1000;

export async function timerAutoCloseHandler(
  _timer: Timer,
  context: InvocationContext
): Promise<void> {
  context.log('timerAutoClose: checking TECHNICIAN_COMPLETED tickets...');

  const tickets = await listTicketsByStatus('TECHNICIAN_COMPLETED');
  const now = Date.now();
  let closed = 0;

  for (const ticket of tickets) {
    if (!ticket.technicianCompletedAt) continue;

    const completedAt = new Date(ticket.technicianCompletedAt).getTime();
    if (now - completedAt >= HOURS_72) {
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
  }

  context.log(`timerAutoClose: ${closed} ticket(s) encerrado(s).`);
}

app.timer('timerAutoClose', {
  // A cada 30 minutos: "0 */30 * * * *"
  schedule: '0 */30 * * * *',
  handler: timerAutoCloseHandler,
});
```

- [ ] **Step 12.2: Commit**

```bash
git add backend/src/functions/timerAutoClose.ts
git commit -m "feat: add timer trigger for 72h auto-close"
```

---

## Task 13: Backend — Seed de Dados

**Files:**
- Create: `backend/seed/seed.ts`

- [ ] **Step 13.1: Criar `backend/seed/seed.ts`**

```typescript
import { TableClient, TableServiceClient, AzureNamedKeyCredential } from '@azure/data-tables';
import { config } from 'dotenv';
import * as path from 'path';

// Carrega local.settings.json simulado via .env (copie os Values para um .env em /seed/)
config({ path: path.join(__dirname, '../local.settings.json.example') });

// Lê as env vars diretamente do arquivo de configuração
import * as fs from 'fs';
const settings = JSON.parse(fs.readFileSync(path.join(__dirname, '../local.settings.json'), 'utf-8'));
const env = settings.Values;

const CONNECTION_STRING: string = env.STORAGE_CONNECTION_STRING;
const ACCOUNT_NAME: string = env.STORAGE_ACCOUNT_NAME;
const ACCOUNT_KEY: string = env.STORAGE_ACCOUNT_KEY;

function getTableClient(tableName: string): TableClient {
  if (CONNECTION_STRING === 'UseDevelopmentStorage=true') {
    return TableClient.fromConnectionString(CONNECTION_STRING, tableName);
  }
  return new TableClient(
    `https://${ACCOUNT_NAME}.table.core.windows.net`,
    tableName,
    new AzureNamedKeyCredential(ACCOUNT_NAME, ACCOUNT_KEY)
  );
}

async function ensureTables(): Promise<void> {
  const serviceClient = CONNECTION_STRING === 'UseDevelopmentStorage=true'
    ? TableServiceClient.fromConnectionString(CONNECTION_STRING)
    : new TableServiceClient(
        `https://${ACCOUNT_NAME}.table.core.windows.net`,
        new AzureNamedKeyCredential(ACCOUNT_NAME, ACCOUNT_KEY)
      );

  for (const table of ['contracts', 'tickets', 'technicians']) {
    try {
      await serviceClient.createTable(table);
      console.log(`Table '${table}' criada.`);
    } catch {
      console.log(`Table '${table}' já existe.`);
    }
  }
}

const contracts = [
  {
    partitionKey: 'CONTRACT',
    rowKey: 'BSPAR-2024-0001',
    clientName: 'João Silva',
    clientEmail: 'joao@email.com',
    propertyType: 'apartamento',
    propertyName: 'BS Design',
    purchaseDate: '2024-03-10',
    warrantyYears: 10,
  },
  {
    partitionKey: 'CONTRACT',
    rowKey: 'BSPAR-2023-0050',
    clientName: 'Ana Lima',
    clientEmail: 'ana@email.com',
    propertyType: 'apartamento',
    propertyName: 'BS Residence',
    purchaseDate: '2023-08-20',
    warrantyYears: 10,
  },
  {
    partitionKey: 'CONTRACT',
    rowKey: 'BSPAR-2012-0001',
    clientName: 'Maria Souza',
    clientEmail: 'maria@email.com',
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
    name: 'Carlos Técnico',
    email: 'tecnico1@bspar.com.br',
    specialties: JSON.stringify(['hidrossanitario', 'eletrico']),
    available: true,
  },
  {
    partitionKey: 'TECHNICIAN',
    rowKey: 'TEC-002',
    name: 'Fernanda Técnica',
    email: 'tecnico2@bspar.com.br',
    specialties: JSON.stringify(['estrutural', 'acabamento']),
    available: true,
  },
  {
    partitionKey: 'TECHNICIAN',
    rowKey: 'TEC-003',
    name: 'Roberto Técnico',
    email: 'tecnico3@bspar.com.br',
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

  const techClient = getTableClient('technicians');
  for (const tech of technicians) {
    await techClient.upsertEntity(tech, 'Replace');
    console.log(`Técnico ${tech.rowKey} inserido.`);
  }

  console.log('Seed concluído!');
}

seed().catch((err) => {
  console.error('Seed falhou:', err);
  process.exit(1);
});
```

- [ ] **Step 13.2: Rodar seed localmente (com Azurite rodando)**

```bash
# Terminal 1: Azurite
npx azurite --silent --location /tmp/azurite

# Terminal 2: Seed
cd backend
cp local.settings.json.example local.settings.json
npm run seed
```

Expected output:
```
Iniciando seed...
Table 'contracts' criada.
Table 'tickets' criada.
Table 'technicians' criada.
Contrato BSPAR-2024-0001 inserido.
Contrato BSPAR-2023-0050 inserido.
Contrato BSPAR-2012-0001 inserido.
Técnico TEC-001 inserido.
Técnico TEC-002 inserido.
Técnico TEC-003 inserido.
Seed concluído!
```

- [ ] **Step 13.3: Commit**

```bash
git add backend/seed/seed.ts
git commit -m "feat: add database seed for contracts and technicians"
```

---

## Task 14: Frontend — React App

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/index.html`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Create: `frontend/src/types/index.ts`
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/components/TicketForm.tsx`
- Create: `frontend/src/components/TicketStatus.tsx`
- Create: `frontend/src/pages/HomePage.tsx`
- Create: `frontend/src/pages/TicketPage.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/main.tsx`

- [ ] **Step 14.1: Criar `frontend/package.json`**

```json
{
  "name": "quick-repair-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.3"
  },
  "devDependencies": {
    "@types/react": "^18.2.79",
    "@types/react-dom": "^18.2.25",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.3",
    "typescript": "^5.4.5",
    "vite": "^5.2.9"
  }
}
```

- [ ] **Step 14.2: Criar `frontend/vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:7071',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    },
  },
});
```

- [ ] **Step 14.3: Criar `frontend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

- [ ] **Step 14.4: Criar `frontend/index.html`**

```html
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>BSPAR Quick Repair — Garantia</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 14.5: Criar `frontend/tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bspar: { 600: '#1a3a5c', 700: '#112845', 500: '#2a5298' },
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 14.6: Criar `frontend/postcss.config.js`**

```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

- [ ] **Step 14.7: Criar `frontend/src/types/index.ts`**

```typescript
export type ProblemType = 'hidrossanitario' | 'eletrico' | 'estrutural' | 'acabamento' | 'outro';

export type TicketStatus =
  | 'OPEN'
  | 'OUT_OF_WARRANTY'
  | 'ASSIGNED'
  | 'TECHNICIAN_COMPLETED'
  | 'CLIENT_VALIDATED'
  | 'AUTO_CLOSED'
  | 'CLOSED';

export interface CreateTicketResponse {
  ticketId: string;
  status: TicketStatus;
  message: string;
  technicianName?: string;
  warrantyValid: boolean;
}

export interface Ticket {
  rowKey: string;
  contractId: string;
  clientName: string;
  propertyName: string;
  problemType: ProblemType;
  description: string;
  status: TicketStatus;
  technicianName?: string;
  technicianCompletedAt?: string;
  clientValidatedAt?: string;
  autoClosedAt?: string;
  createdAt: string;
}
```

- [ ] **Step 14.8: Criar `frontend/src/api/client.ts`**

```typescript
const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export async function openTicket(data: {
  contractId: string;
  problemType: string;
  description: string;
}): Promise<import('../types').CreateTicketResponse> {
  const res = await fetch(`${BASE_URL}/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchTicket(ticketId: string): Promise<import('../types').Ticket> {
  const res = await fetch(`${BASE_URL}/tickets/${ticketId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function validateTicket(ticketId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/tickets/${ticketId}/client/validate`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
}

export async function getSasUrl(ticketId: string, contentType: string): Promise<{ sasUrl: string; blobName: string }> {
  const res = await fetch(`${BASE_URL}/tickets/${ticketId}/photos/sas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contentType }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function uploadPhoto(sasUrl: string, file: File): Promise<void> {
  const res = await fetch(sasUrl, {
    method: 'PUT',
    headers: {
      'x-ms-blob-type': 'BlockBlob',
      'Content-Type': file.type,
    },
    body: file,
  });
  if (!res.ok) throw new Error(`Upload falhou: HTTP ${res.status}`);
}
```

- [ ] **Step 14.9: Criar `frontend/src/components/TicketForm.tsx`**

```tsx
import React, { useState } from 'react';
import { openTicket, getSasUrl, uploadPhoto } from '../api/client';
import { ProblemType, CreateTicketResponse } from '../types';

const PROBLEM_LABELS: Record<ProblemType, string> = {
  hidrossanitario: 'Hidrossanitário',
  eletrico: 'Elétrico',
  estrutural: 'Estrutural',
  acabamento: 'Acabamento',
  outro: 'Outro',
};

interface Props {
  onSuccess: (response: CreateTicketResponse) => void;
}

export function TicketForm({ onSuccess }: Props) {
  const [contractId, setContractId] = useState('');
  const [problemType, setProblemType] = useState<ProblemType>('hidrossanitario');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await openTicket({ contractId: contractId.trim().toUpperCase(), problemType, description });

      // Upload fotos se houver e o ticket estiver dentro da garantia
      if (photos.length > 0 && response.warrantyValid) {
        for (const file of photos) {
          const { sasUrl } = await getSasUrl(response.ticketId, file.type);
          await uploadPhoto(sasUrl, file);
        }
      }

      onSuccess(response);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Número do Contrato
        </label>
        <input
          type="text"
          value={contractId}
          onChange={(e) => setContractId(e.target.value)}
          placeholder="Ex: BSPAR-2024-0001"
          required
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bspar-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tipo do Problema
        </label>
        <select
          value={problemType}
          onChange={(e) => setProblemType(e.target.value as ProblemType)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bspar-500"
        >
          {(Object.keys(PROBLEM_LABELS) as ProblemType[]).map((key) => (
            <option key={key} value={key}>{PROBLEM_LABELS[key]}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descrição do Problema
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          required
          placeholder="Descreva o problema com detalhes..."
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bspar-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Fotos (opcional)
        </label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setPhotos(Array.from(e.target.files ?? []))}
          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-bspar-600 file:text-white hover:file:bg-bspar-700"
        />
        {photos.length > 0 && (
          <p className="text-xs text-gray-500 mt-1">{photos.length} foto(s) selecionada(s)</p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-bspar-600 hover:bg-bspar-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
      >
        {loading ? 'Enviando...' : 'Abrir Chamado'}
      </button>
    </form>
  );
}
```

- [ ] **Step 14.10: Criar `frontend/src/components/TicketStatus.tsx`**

```tsx
import { Ticket, TicketStatus } from '../types';
import { validateTicket } from '../api/client';
import { useState } from 'react';

const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: 'Aberto',
  OUT_OF_WARRANTY: 'Fora da Garantia',
  ASSIGNED: 'Técnico Alocado',
  TECHNICIAN_COMPLETED: 'Aguardando Validação',
  CLIENT_VALIDATED: 'Validado pelo Cliente',
  AUTO_CLOSED: 'Encerrado Automaticamente',
  CLOSED: 'Encerrado',
};

const STATUS_COLORS: Record<TicketStatus, string> = {
  OPEN: 'bg-yellow-100 text-yellow-800',
  OUT_OF_WARRANTY: 'bg-gray-100 text-gray-800',
  ASSIGNED: 'bg-blue-100 text-blue-800',
  TECHNICIAN_COMPLETED: 'bg-purple-100 text-purple-800',
  CLIENT_VALIDATED: 'bg-green-100 text-green-800',
  AUTO_CLOSED: 'bg-gray-100 text-gray-600',
  CLOSED: 'bg-gray-100 text-gray-600',
};

interface Props {
  ticket: Ticket;
  onRefresh: () => void;
}

export function TicketStatus({ ticket, onRefresh }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleValidate() {
    setError(null);
    setLoading(true);
    try {
      await validateTicket(ticket.rowKey);
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500">Chamado</p>
          <p className="font-mono text-sm font-bold text-gray-800">{ticket.rowKey}</p>
        </div>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_COLORS[ticket.status]}`}>
          {STATUS_LABELS[ticket.status]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-gray-500 text-xs">Contrato</p>
          <p className="font-medium">{ticket.contractId}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Imóvel</p>
          <p className="font-medium">{ticket.propertyName}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Problema</p>
          <p className="font-medium capitalize">{ticket.problemType}</p>
        </div>
        {ticket.technicianName && (
          <div>
            <p className="text-gray-500 text-xs">Técnico</p>
            <p className="font-medium">{ticket.technicianName}</p>
          </div>
        )}
      </div>

      {ticket.description && (
        <div>
          <p className="text-gray-500 text-xs mb-1">Descrição</p>
          <p className="text-sm text-gray-700 bg-gray-50 rounded p-3">{ticket.description}</p>
        </div>
      )}

      {ticket.status === 'TECHNICIAN_COMPLETED' && (
        <div className="pt-2">
          <p className="text-sm text-purple-700 mb-3">
            A visita técnica foi concluída. Você tem 72h para validar o atendimento.
          </p>
          {error && (
            <p className="text-red-600 text-sm mb-2">{error}</p>
          )}
          <button
            onClick={handleValidate}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50 text-sm"
          >
            {loading ? 'Validando...' : 'Confirmar que o problema foi resolvido'}
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 14.11: Criar `frontend/src/pages/HomePage.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TicketForm } from '../components/TicketForm';
import { CreateTicketResponse } from '../types';

export function HomePage() {
  const navigate = useNavigate();
  const [result, setResult] = useState<CreateTicketResponse | null>(null);

  function handleSuccess(response: CreateTicketResponse) {
    setResult(response);
  }

  if (result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8 text-center space-y-4">
          <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${result.warrantyValid ? 'bg-green-100' : 'bg-gray-100'}`}>
            <span className="text-3xl">{result.warrantyValid ? '✓' : '⚠'}</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800">{result.warrantyValid ? 'Chamado Aberto!' : 'Fora da Garantia'}</h2>
          <p className="text-gray-600 text-sm">{result.message}</p>
          {result.warrantyValid && (
            <p className="text-xs text-gray-500 font-mono bg-gray-50 rounded px-3 py-2">
              ID: {result.ticketId}
            </p>
          )}
          <div className="flex gap-3 pt-2">
            {result.warrantyValid && (
              <button
                onClick={() => navigate(`/ticket/${result.ticketId}`)}
                className="flex-1 bg-bspar-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-bspar-700 transition"
              >
                Ver Chamado
              </button>
            )}
            <button
              onClick={() => setResult(null)}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 transition"
            >
              Novo Chamado
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-bspar-600">BSPAR Quick Repair</h1>
          <p className="text-gray-500 text-sm mt-1">Solicite uma visita técnica dentro da garantia</p>
        </div>
        <div className="bg-white rounded-2xl shadow-md p-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Abrir Chamado de Garantia</h2>
          <TicketForm onSuccess={handleSuccess} />
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">
          Já tem um chamado?{' '}
          <button
            onClick={() => {
              const id = prompt('Digite o ID do chamado:');
              if (id) navigate(`/ticket/${id.trim()}`);
            }}
            className="text-bspar-500 underline"
          >
            Consultar
          </button>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 14.12: Criar `frontend/src/pages/TicketPage.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchTicket } from '../api/client';
import { TicketStatus } from '../components/TicketStatus';
import { Ticket } from '../types';

export function TicketPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!ticketId) return;
    setLoading(true);
    try {
      const data = await fetchTicket(ticketId);
      setTicket(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [ticketId]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-bspar-600 text-sm hover:underline">← Voltar</button>
          <h1 className="text-lg font-semibold text-gray-800">Acompanhamento do Chamado</h1>
        </div>

        {loading && <p className="text-center text-gray-500 py-8">Carregando...</p>}
        {error && <p className="text-center text-red-600 py-8">{error}</p>}
        {ticket && <TicketStatus ticket={ticket} onRefresh={load} />}

        {ticket && (
          <button
            onClick={load}
            className="w-full border border-gray-300 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition"
          >
            Atualizar status
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 14.13: Criar `frontend/src/App.tsx`**

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { TicketPage } from './pages/TicketPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/ticket/:ticketId" element={<TicketPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 14.14: Criar `frontend/src/main.tsx`**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 14.15: Criar `frontend/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 14.16: Instalar dependências do frontend**

```bash
cd frontend && npm install
```

- [ ] **Step 14.17: Rodar frontend localmente**

```bash
cd frontend && npm run dev
```

Expected: App rodando em `http://localhost:5173`.

- [ ] **Step 14.18: Commit**

```bash
git add frontend/
git commit -m "feat: add React frontend for ticket management"
```

---

## Task 15: Terraform — Infraestrutura Azure

**Files:**
- Create: `infrastructure/providers.tf`
- Create: `infrastructure/backend.tf`
- Create: `infrastructure/variables.tf`
- Create: `infrastructure/main.tf`
- Create: `infrastructure/outputs.tf`

- [ ] **Step 15.1: Criar `infrastructure/providers.tf`**

```hcl
terraform {
  required_version = ">= 1.7.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.100"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
  }
}
```

- [ ] **Step 15.2: Criar `infrastructure/backend.tf`**

```hcl
# Para bootstrap inicial, use local backend e depois migre para remote.
# Descomente o bloco abaixo após criar o storage account de state manualmente
# via script scripts/bootstrap-tfstate.sh

# terraform {
#   backend "azurerm" {
#     resource_group_name  = "rg-quickrepair-tfstate"
#     storage_account_name = "stqrtfstate"        # substitua pelo nome real
#     container_name       = "tfstate"
#     key                  = "quickrepair.tfstate"
#   }
# }
```

- [ ] **Step 15.3: Criar `infrastructure/variables.tf`**

```hcl
variable "project_name" {
  description = "Nome do projeto (usado como prefixo nos recursos)"
  type        = string
  default     = "quickrepair"
}

variable "environment" {
  description = "Ambiente (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "location" {
  description = "Região Azure"
  type        = string
  default     = "brazilsouth"
}

variable "email_sender_display" {
  description = "Nome de exibição do remetente de e-mail"
  type        = string
  default     = "BSPAR Quick Repair"
}
```

- [ ] **Step 15.4: Criar `infrastructure/main.tf`**

```hcl
locals {
  prefix     = "${var.project_name}-${var.environment}"
  tags = {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
  }
}

resource "random_string" "suffix" {
  length  = 6
  upper   = false
  special = false
}

# ── Resource Group ────────────────────────────────────────────────────────────

resource "azurerm_resource_group" "main" {
  name     = "rg-${local.prefix}"
  location = var.location
  tags     = local.tags
}

# ── Storage Account (Table Storage + Blob) ────────────────────────────────────

resource "azurerm_storage_account" "main" {
  name                     = "st${var.project_name}${var.environment}${random_string.suffix.result}"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"

  # CORS para o frontend fazer upload direto com SAS
  blob_properties {
    cors_rule {
      allowed_headers    = ["*"]
      allowed_methods    = ["PUT", "GET"]
      allowed_origins    = ["*"]
      exposed_headers    = ["*"]
      max_age_in_seconds = 3600
    }
  }

  tags = local.tags
}

resource "azurerm_storage_container" "photos" {
  name                  = "ticket-photos"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

# Table Storage — não precisa de recurso adicional; usa o storage account

# ── Application Insights ──────────────────────────────────────────────────────

resource "azurerm_application_insights" "main" {
  name                = "appi-${local.prefix}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  application_type    = "web"
  tags                = local.tags
}

# ── Azure Functions ───────────────────────────────────────────────────────────

resource "azurerm_service_plan" "main" {
  name                = "asp-${local.prefix}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  os_type             = "Linux"
  sku_name            = "Y1"  # Consumption (serverless)
  tags                = local.tags
}

resource "azurerm_linux_function_app" "main" {
  name                       = "func-${local.prefix}-${random_string.suffix.result}"
  resource_group_name        = azurerm_resource_group.main.name
  location                   = azurerm_resource_group.main.location
  storage_account_name       = azurerm_storage_account.main.name
  storage_account_access_key = azurerm_storage_account.main.primary_access_key
  service_plan_id            = azurerm_service_plan.main.id

  site_config {
    application_stack {
      node_version = "20"
    }
    cors {
      allowed_origins     = ["*"]
      support_credentials = false
    }
  }

  app_settings = {
    FUNCTIONS_WORKER_RUNTIME       = "node"
    WEBSITE_RUN_FROM_PACKAGE       = "1"
    APPINSIGHTS_INSTRUMENTATIONKEY = azurerm_application_insights.main.instrumentation_key

    STORAGE_CONNECTION_STRING = azurerm_storage_account.main.primary_connection_string
    STORAGE_ACCOUNT_NAME      = azurerm_storage_account.main.name
    STORAGE_ACCOUNT_KEY       = azurerm_storage_account.main.primary_access_key
    BLOB_CONTAINER_PHOTOS     = azurerm_storage_container.photos.name

    ACS_CONNECTION_STRING = azurerm_communication_service.main.primary_connection_string
    ACS_EMAIL_SENDER      = "DoNotReply@${azurerm_email_communication_service_domain.managed.mail_from_sender_domain}"
  }

  tags = local.tags
}

# ── Azure Communication Services Email ───────────────────────────────────────

resource "azurerm_communication_service" "main" {
  name                = "acs-${local.prefix}"
  resource_group_name = azurerm_resource_group.main.name
  data_location       = "Brazil"
  tags                = local.tags
}

resource "azurerm_email_communication_service" "main" {
  name                = "email-${local.prefix}"
  resource_group_name = azurerm_resource_group.main.name
  data_location       = "Brazil"
  tags                = local.tags
}

resource "azurerm_email_communication_service_domain" "managed" {
  name              = "AzureManagedDomain"
  email_service_id  = azurerm_email_communication_service.main.id
  domain_management = "AzureManaged"
}

resource "azurerm_communication_service_email_domain_association" "main" {
  communication_service_id = azurerm_communication_service.main.id
  email_service_domain_id  = azurerm_email_communication_service_domain.managed.id
}

# ── Static Web App (Frontend) ─────────────────────────────────────────────────

resource "azurerm_static_web_app" "frontend" {
  name                = "swa-${local.prefix}"
  resource_group_name = azurerm_resource_group.main.name
  location            = "eastus2"  # Static Web Apps: regiões limitadas
  sku_tier            = "Free"
  sku_size            = "Free"
  tags                = local.tags
}
```

- [ ] **Step 15.5: Criar `infrastructure/outputs.tf`**

```hcl
output "resource_group_name" {
  value = azurerm_resource_group.main.name
}

output "function_app_name" {
  value = azurerm_linux_function_app.main.name
}

output "function_app_default_hostname" {
  value = "https://${azurerm_linux_function_app.main.default_hostname}"
}

output "static_web_app_url" {
  value = "https://${azurerm_static_web_app.frontend.default_host_name}"
}

output "static_web_app_deployment_token" {
  value     = azurerm_static_web_app.frontend.api_key
  sensitive = true
}

output "storage_account_name" {
  value = azurerm_storage_account.main.name
}

output "application_insights_key" {
  value     = azurerm_application_insights.main.instrumentation_key
  sensitive = true
}

output "acs_email_sender_domain" {
  value = azurerm_email_communication_service_domain.managed.mail_from_sender_domain
}

output "acs_connection_string" {
  value     = azurerm_communication_service.main.primary_connection_string
  sensitive = true
}
```

- [ ] **Step 15.6: Commit**

```bash
git add infrastructure/
git commit -m "feat: add Terraform infrastructure for Azure MVP"
```

---

## Task 16: Script de Bootstrap do Terraform State

**Files:**
- Create: `scripts/bootstrap-tfstate.sh`

- [ ] **Step 16.1: Criar `scripts/bootstrap-tfstate.sh`**

```bash
#!/usr/bin/env bash
# Executa UMA VEZ antes do primeiro terraform init.
# Cria o storage account para o estado remoto do Terraform.
set -euo pipefail

LOCATION="${1:-brazilsouth}"
RG_NAME="rg-quickrepair-tfstate"
SA_NAME="stqrtfstate$(cat /dev/urandom | tr -dc 'a-z0-9' | head -c 6)"
CONTAINER="tfstate"

echo "Creating resource group: $RG_NAME"
az group create --name "$RG_NAME" --location "$LOCATION"

echo "Creating storage account: $SA_NAME"
az storage account create \
  --name "$SA_NAME" \
  --resource-group "$RG_NAME" \
  --location "$LOCATION" \
  --sku Standard_LRS \
  --min-tls-version TLS1_2

echo "Creating blob container: $CONTAINER"
az storage container create \
  --name "$CONTAINER" \
  --account-name "$SA_NAME" \
  --auth-mode login

echo ""
echo "=== DONE ==="
echo "Add to infrastructure/backend.tf:"
echo ""
echo "  backend \"azurerm\" {"
echo "    resource_group_name  = \"$RG_NAME\""
echo "    storage_account_name = \"$SA_NAME\""
echo "    container_name       = \"$CONTAINER\""
echo "    key                  = \"quickrepair.tfstate\""
echo "  }"
```

```bash
chmod +x scripts/bootstrap-tfstate.sh
git add scripts/
git commit -m "chore: add Terraform state bootstrap script"
```

---

## Task 17: GitHub Actions Workflows

**Files:**
- Create: `.github/workflows/terraform-plan.yml`
- Create: `.github/workflows/terraform-apply.yml`
- Create: `.github/workflows/terraform-destroy.yml`
- Create: `.github/workflows/deploy-backend.yml`
- Create: `.github/workflows/deploy-frontend.yml`

**GitHub Secrets necessários:**
```
ARM_CLIENT_ID         → Service Principal App ID
ARM_CLIENT_SECRET     → Service Principal Secret
ARM_SUBSCRIPTION_ID   → Azure Subscription ID
ARM_TENANT_ID         → Azure Tenant ID
TF_VAR_SENDGRID_API_KEY → SendGrid API Key
AZURE_STATIC_WEB_APPS_API_TOKEN → Token da Static Web App (output do Terraform)
```

- [ ] **Step 17.1: Criar `.github/workflows/terraform-plan.yml`**

```yaml
name: Terraform Plan

on:
  pull_request:
    paths:
      - 'infrastructure/**'
      - '.github/workflows/terraform-*.yml'

permissions:
  contents: read
  pull-requests: write

env:
  TF_WORKING_DIR: ./infrastructure

jobs:
  plan:
    name: Terraform Plan
    runs-on: ubuntu-latest
    environment: dev

    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.7.5"

      - name: Terraform Init
        working-directory: ${{ env.TF_WORKING_DIR }}
        env:
          ARM_CLIENT_ID: ${{ secrets.ARM_CLIENT_ID }}
          ARM_CLIENT_SECRET: ${{ secrets.ARM_CLIENT_SECRET }}
          ARM_SUBSCRIPTION_ID: ${{ secrets.ARM_SUBSCRIPTION_ID }}
          ARM_TENANT_ID: ${{ secrets.ARM_TENANT_ID }}
        run: terraform init

      - name: Terraform Validate
        working-directory: ${{ env.TF_WORKING_DIR }}
        run: terraform validate

      - name: Terraform Plan
        id: plan
        working-directory: ${{ env.TF_WORKING_DIR }}
        env:
          ARM_CLIENT_ID: ${{ secrets.ARM_CLIENT_ID }}
          ARM_CLIENT_SECRET: ${{ secrets.ARM_CLIENT_SECRET }}
          ARM_SUBSCRIPTION_ID: ${{ secrets.ARM_SUBSCRIPTION_ID }}
          ARM_TENANT_ID: ${{ secrets.ARM_TENANT_ID }}
          # ACS é provisionado automaticamente pelo Terraform — sem API key externa
        run: |
          terraform plan -no-color -out=tfplan 2>&1 | tee plan.txt
          echo "PLAN_OUTPUT<<EOF" >> $GITHUB_OUTPUT
          tail -50 plan.txt >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT
        continue-on-error: true

      - name: Comment Plan on PR
        uses: actions/github-script@v7
        with:
          script: |
            const output = `#### Terraform Plan 📋
            \`\`\`
            ${{ steps.plan.outputs.PLAN_OUTPUT }}
            \`\`\`
            *Triggered by @${{ github.actor }}*`;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: output
            });
```

- [ ] **Step 17.2: Criar `.github/workflows/terraform-apply.yml`**

```yaml
name: Terraform Apply

on:
  workflow_dispatch:
    inputs:
      confirm:
        description: 'Digite "apply" para confirmar'
        required: true
        type: string

env:
  TF_WORKING_DIR: ./infrastructure

jobs:
  apply:
    name: Terraform Apply
    runs-on: ubuntu-latest
    environment: dev
    if: github.event.inputs.confirm == 'apply'

    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.7.5"

      - name: Terraform Init
        working-directory: ${{ env.TF_WORKING_DIR }}
        env:
          ARM_CLIENT_ID: ${{ secrets.ARM_CLIENT_ID }}
          ARM_CLIENT_SECRET: ${{ secrets.ARM_CLIENT_SECRET }}
          ARM_SUBSCRIPTION_ID: ${{ secrets.ARM_SUBSCRIPTION_ID }}
          ARM_TENANT_ID: ${{ secrets.ARM_TENANT_ID }}
        run: terraform init

      - name: Terraform Apply
        working-directory: ${{ env.TF_WORKING_DIR }}
        env:
          ARM_CLIENT_ID: ${{ secrets.ARM_CLIENT_ID }}
          ARM_CLIENT_SECRET: ${{ secrets.ARM_CLIENT_SECRET }}
          ARM_SUBSCRIPTION_ID: ${{ secrets.ARM_SUBSCRIPTION_ID }}
          ARM_TENANT_ID: ${{ secrets.ARM_TENANT_ID }}
          # ACS é provisionado automaticamente pelo Terraform — sem API key externa
        run: terraform apply -auto-approve

      - name: Show Outputs
        working-directory: ${{ env.TF_WORKING_DIR }}
        env:
          ARM_CLIENT_ID: ${{ secrets.ARM_CLIENT_ID }}
          ARM_CLIENT_SECRET: ${{ secrets.ARM_CLIENT_SECRET }}
          ARM_SUBSCRIPTION_ID: ${{ secrets.ARM_SUBSCRIPTION_ID }}
          ARM_TENANT_ID: ${{ secrets.ARM_TENANT_ID }}
        run: terraform output
```

- [ ] **Step 17.3: Criar `.github/workflows/terraform-destroy.yml`**

```yaml
name: Terraform Destroy

on:
  workflow_dispatch:
    inputs:
      confirm:
        description: 'Digite "destroy" para confirmar a destruição'
        required: true
        type: string

env:
  TF_WORKING_DIR: ./infrastructure

jobs:
  destroy:
    name: Terraform Destroy
    runs-on: ubuntu-latest
    environment: dev
    if: github.event.inputs.confirm == 'destroy'

    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.7.5"

      - name: Terraform Init
        working-directory: ${{ env.TF_WORKING_DIR }}
        env:
          ARM_CLIENT_ID: ${{ secrets.ARM_CLIENT_ID }}
          ARM_CLIENT_SECRET: ${{ secrets.ARM_CLIENT_SECRET }}
          ARM_SUBSCRIPTION_ID: ${{ secrets.ARM_SUBSCRIPTION_ID }}
          ARM_TENANT_ID: ${{ secrets.ARM_TENANT_ID }}
        run: terraform init

      - name: Terraform Destroy
        working-directory: ${{ env.TF_WORKING_DIR }}
        env:
          ARM_CLIENT_ID: ${{ secrets.ARM_CLIENT_ID }}
          ARM_CLIENT_SECRET: ${{ secrets.ARM_CLIENT_SECRET }}
          ARM_SUBSCRIPTION_ID: ${{ secrets.ARM_SUBSCRIPTION_ID }}
          ARM_TENANT_ID: ${{ secrets.ARM_TENANT_ID }}
          # ACS é provisionado automaticamente pelo Terraform — sem API key externa
        run: terraform destroy -auto-approve
```

- [ ] **Step 17.4: Criar `.github/workflows/deploy-backend.yml`**

```yaml
name: Deploy Backend

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'
      - '.github/workflows/deploy-backend.yml'
  workflow_dispatch:

jobs:
  deploy:
    name: Build & Deploy Azure Functions
    runs-on: ubuntu-latest
    environment: dev

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install & Build
        working-directory: backend
        run: npm ci && npm run build

      - name: Login to Azure
        uses: azure/login@v2
        with:
          creds: |
            {
              "clientId": "${{ secrets.ARM_CLIENT_ID }}",
              "clientSecret": "${{ secrets.ARM_CLIENT_SECRET }}",
              "subscriptionId": "${{ secrets.ARM_SUBSCRIPTION_ID }}",
              "tenantId": "${{ secrets.ARM_TENANT_ID }}"
            }

      - name: Deploy to Azure Functions
        uses: Azure/functions-action@v1
        with:
          app-name: ${{ secrets.FUNCTION_APP_NAME }}
          package: backend
          respect-funcignore: true
```

- [ ] **Step 17.5: Criar `.github/workflows/deploy-frontend.yml`**

```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]
    paths:
      - 'frontend/**'
      - '.github/workflows/deploy-frontend.yml'
  workflow_dispatch:

jobs:
  deploy:
    name: Build & Deploy Static Web App
    runs-on: ubuntu-latest
    environment: dev

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install & Build
        working-directory: frontend
        env:
          VITE_API_URL: ${{ secrets.FUNCTION_APP_URL }}/api
        run: npm ci && npm run build

      - name: Deploy to Static Web App
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          action: upload
          app_location: frontend
          output_location: dist
```

- [ ] **Step 17.6: Commit**

```bash
git add .github/
git commit -m "feat: add GitHub Actions workflows for Terraform and deployments"
```

---

## Task 18: README.md

**Files:**
- Create: `README.md`

- [ ] **Step 18.1: Criar `README.md`**

```markdown
# BSPAR Quick Repair

Sistema de gestão de garantias para imóveis da BSPAR Corporações.

## Arquitetura

```
Cliente → Azure Static Web Apps (React)
              ↓ HTTP
         Azure Functions (TypeScript) ← Timer Trigger (72h auto-close)
              ↓
    Azure Table Storage (contratos, tickets, técnicos)
    Azure Blob Storage  (fotos dos chamados)
    SendGrid            (e-mails de confirmação)
    Application Insights (logs e métricas)
```

## Pré-requisitos

- Node.js 20+
- Azure CLI (`az login`)
- Azure Functions Core Tools v4: `npm i -g azure-functions-core-tools@4`
- Terraform 1.7+
- Azurite (emulador local): `npm i -g azurite`

## Desenvolvimento Local

### 1. Backend

```bash
cd backend
cp local.settings.json.example local.settings.json
npm install

# Terminal 1: Azurite
azurite --silent --location /tmp/azurite

# Terminal 2: Seed
npm run seed

# Terminal 3: Functions
npm start
```

API disponível em `http://localhost:7071/api`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App disponível em `http://localhost:5173`

## Deploy

### Primeira vez

1. Criar service principal:
```bash
az ad sp create-for-rbac --name "sp-quickrepair-ci" \
  --role Contributor \
  --scopes /subscriptions/<SUBSCRIPTION_ID> \
  --sdk-auth
```

2. Bootstrap do Terraform state:
```bash
./scripts/bootstrap-tfstate.sh brazilsouth
```

3. Descomentar o bloco `backend "azurerm"` em `infrastructure/backend.tf`

4. Configurar GitHub Secrets:
   - `ARM_CLIENT_ID`
   - `ARM_CLIENT_SECRET`
   - `ARM_SUBSCRIPTION_ID`
   - `ARM_TENANT_ID`
   - `TF_VAR_SENDGRID_API_KEY`
   - `FUNCTION_APP_NAME` (após o apply)
   - `FUNCTION_APP_URL` (após o apply)
   - `AZURE_STATIC_WEB_APPS_API_TOKEN` (após o apply)

5. GitHub Actions → Terraform Apply → digitar "apply"

### Destruir após demo

GitHub Actions → Terraform Destroy → digitar "destroy"

## Contratos de Teste

| Contrato | Cliente | Status |
|---|---|---|
| BSPAR-2024-0001 | João Silva | Dentro da garantia |
| BSPAR-2023-0050 | Ana Lima | Dentro da garantia |
| BSPAR-2012-0001 | Maria Souza | Fora da garantia |

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/tickets` | Abrir chamado |
| GET | `/api/tickets/{id}` | Consultar chamado |
| POST | `/api/tickets/{id}/photos/sas` | Obter SAS URL para upload |
| POST | `/api/tickets/{id}/technician/complete` | Técnico conclui visita |
| POST | `/api/tickets/{id}/client/validate` | Cliente valida atendimento |
| POST | `/api/tickets/{id}/auto-close` | Encerrar manualmente |

## Status do Ticket

`OPEN` → `ASSIGNED` → `TECHNICIAN_COMPLETED` → `CLIENT_VALIDATED`
                                ↓ (72h sem validação)
                           `AUTO_CLOSED`
`OUT_OF_WARRANTY` (imóvel fora da garantia)
```

- [ ] **Step 18.2: Commit**

```bash
git add README.md
git commit -m "docs: add comprehensive README"
```

---

## Checklist de Spec Coverage

- [x] Cliente informa número do contrato → `createTicket` consulta `contracts` table
- [x] Verificação de 10 anos de garantia → `isWithinWarranty(purchaseDate, warrantyYears)`
- [x] Tipo do problema (hidrossanitário, elétrico, estrutural, acabamento, outro) → `ProblemType`
- [x] Descrição do problema → campo `description` no body
- [x] Anexar fotos → `getSasUrl` + upload direto para Blob com SAS
- [x] Aloca técnico disponível → `getAvailableTechnician` prioriza especialidade
- [x] E-mail confirmação visita → `sendWarrantyConfirmationEmail` (via ACS Email nativo Azure)
- [x] E-mail fora de garantia → `sendOutOfWarrantyEmail` (via ACS Email)
- [x] Técnico conclui chamado → `technicianComplete` → status `TECHNICIAN_COMPLETED`
- [x] Cliente valida em 72h → `clientValidate` verifica deadline
- [x] Auto-close 72h sem validação → `timerAutoClose` (cron 30min)
- [x] E-mail auto-close → `sendAutoCloseEmail`
- [x] Status OUT_OF_WARRANTY → ticket registrado mas encerrado
- [x] Seed de contratos e técnicos → `seed.ts`
- [x] Terraform: Resource Group, Storage, Functions, Static Web App, App Insights
- [x] GitHub Actions: plan (PR), apply (manual), destroy (manual), deploy backend, deploy frontend
- [x] CORS configurado no Storage e Functions
- [x] Application Insights configurado no Function App
- [x] Menor privilégio: service principal com Contributor no subscription (pode ser reduzido para RG específico em prod)
- [x] Variáveis de ambiente: todas via app_settings no Terraform, nunca hardcoded

---

## Recomendações de Segurança Pós-MVP

1. **RBAC mínimo**: trocar Contributor por roles específicas (Storage Blob Data Contributor, Storage Table Data Contributor, Website Contributor)
2. **Managed Identity**: substituir `STORAGE_ACCOUNT_KEY` por identity-based auth nas Functions
3. **Function Keys**: usar `authLevel: 'function'` (já feito) e rotacionar chaves periodicamente
4. **CORS restrito**: trocar `allowed_origins: ["*"]` pelo domínio real da Static Web App
5. **SAS URL**: expiração de 15min já configurada; usar User Delegation SAS em vez de Account Key em produção
6. **HTTPS only**: já garantido pelo Azure Functions e Static Web Apps

## Roadmap Pós-MVP

1. **Auth**: adicionar Azure AD B2C ou Entra External ID para login do cliente
2. **Painel do técnico**: aplicativo mobile ou PWA para técnicos
3. **Agendamento real**: integração com Microsoft Bookings ou Google Calendar
4. **Notificações**: Azure Notification Hubs ou SMS via Twilio
5. **Relatórios**: Power BI Embedded ou Azure Data Factory para analytics
6. **Multi-região**: replicação do storage para DR

## Estimativa de Custo (demo/dev)

| Recurso | Custo estimado |
|---|---|
| Azure Functions (Consumption) | ~$0 (1M requests grátis/mês) |
| Azure Table Storage | ~$0.045/GB/mês |
| Azure Blob Storage | ~$0.018/GB/mês |
| Static Web App (Free tier) | $0 |
| Application Insights | ~$2.30/GB de logs |
| SendGrid (Free tier) | $0 (100 e-mails/dia) |
| **Total estimado** | **< $5/mês** |
```

- [ ] **Step 18.3: Commit final**

```bash
git add README.md
git commit -m "docs: finalize README with architecture, costs, and roadmap"
```

---

*Plano gerado em 2026-05-05 para o projeto BSPAR Quick Repair MVP*
