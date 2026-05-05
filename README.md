# BSPAR Quick Repair

MVP de gestao de garantias para imoveis da BSPAR Corporacoes.

## Arquitetura

```text
Cliente -> Azure Static Web Apps (React)
        -> Azure Functions (TypeScript)
        -> Azure Table Storage (contratos, tickets, tecnicos)
        -> Azure Blob Storage (fotos)
        -> Azure Communication Services Email
        -> Application Insights

Timer Trigger -> auto-close de tickets 72h apos conclusao tecnica
```

## Pre-requisitos

- Node.js 20+
- Azure CLI com `az login`
- Azure Functions Core Tools v4
- Terraform 1.7+
- Azurite para desenvolvimento local

## Desenvolvimento Local

### Backend

```bash
cd backend
cp local.settings.json.example local.settings.json
npm install
```

Em outro terminal:

```bash
azurite --silent --location /tmp/azurite
```

Depois:

```bash
npm run seed
npm start
```

API local: `http://localhost:7071/api`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App local: `http://localhost:5173`

## Deploy Manual via GitHub Actions

Os workflows usam apenas estes repository secrets:

- `ARM_CLIENT_ID`
- `ARM_CLIENT_SECRET`
- `ARM_SUBSCRIPTION_ID`
- `ARM_TENANT_ID`

O workflow cria o storage remoto do Terraform state automaticamente, aplica a infraestrutura, publica backend e frontend, le os outputs do Terraform e injeta a Function Key no build da SPA.

### Primeira configuracao

Criar service principal, caso ainda nao exista:

```bash
az ad sp create-for-rbac --name "sp-quickrepair-ci" \
  --role Contributor \
  --scopes /subscriptions/<SUBSCRIPTION_ID> \
  --sdk-auth
```

### Subir ambiente

GitHub Actions -> `Deploy Azure` -> `Run workflow` -> preencher `confirm` com:

```text
deploy
```

### Derrubar ambiente para evitar custo

GitHub Actions -> `Destroy Azure` -> `Run workflow` -> preencher `confirm` com:

```text
destroy
```

O destroy executa `terraform destroy` e remove tambem o resource group do Terraform state (`rg-quickrepair-tfstate`) ao final, para evitar custo residual.

## Contratos de Teste

| Contrato | Cliente | Status |
| --- | --- | --- |
| `BSPAR-2024-0001` | Joao Silva | Dentro da garantia |
| `BSPAR-2023-0050` | Ana Lima | Dentro da garantia |
| `BSPAR-2012-0001` | Maria Souza | Fora da garantia |

## Endpoints

| Metodo | Rota | Descricao |
| --- | --- | --- |
| `POST` | `/api/tickets` | Abrir chamado |
| `GET` | `/api/tickets/{id}` | Consultar chamado |
| `POST` | `/api/tickets/{id}/photos/sas` | Obter URL de upload de foto |
| `POST` | `/api/tickets/{id}/technician/complete` | Marcar visita como concluida |
| `POST` | `/api/tickets/{id}/client/validate` | Validar atendimento |
| `POST` | `/api/tickets/{id}/auto-close` | Encerrar chamado automaticamente |

## Status

```text
OPEN -> ASSIGNED -> TECHNICIAN_COMPLETED -> CLIENT_VALIDATED
                                  |
                                  +-> AUTO_CLOSED apos 72h sem validacao

OUT_OF_WARRANTY registra historico sem alocar tecnico.
```

## Validacao

```bash
cd backend
npm run build
npm test

cd ../frontend
npm run build
```

Para Terraform:

```bash
cd infrastructure
terraform fmt -check
terraform init -backend=false
terraform validate
```

## Custo Estimado para Demo

| Recurso | Estimativa |
| --- | --- |
| Azure Functions Consumption | baixo volume no free grant |
| Azure Table Storage | centavos por GB/mes |
| Azure Blob Storage | centavos por GB/mes |
| Static Web Apps Free | sem custo |
| Application Insights | conforme ingestao |
| ACS Email | conforme uso |
