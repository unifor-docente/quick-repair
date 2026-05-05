# BSPAR Quick Repair Azure Deployment Plan

Status: Ready for Validation

Source plan: `docs/superpowers/plans/2026-05-05-bspar-quick-repair-mvp.md`

## Scope

Prepare the BSPAR Quick Repair MVP for Azure deployment using:

- React SPA on Azure Static Web Apps
- Azure Functions v4 on Node.js 20
- Azure Table Storage for contracts, tickets, and technicians
- Azure Blob Storage for ticket photos
- Azure Communication Services Email
- Application Insights
- Terraform under `infrastructure/`
- GitHub Actions with two manual workflows: deploy and destroy

## Current Execution

- Backend scaffold and services are present.
- Backend HTTP functions, timer trigger, and seed are being implemented from the source plan.
- Frontend, Terraform, CI/CD, and README follow the same source plan.
- Deploy workflow provisions Terraform state automatically and publishes backend/frontend.
- Destroy workflow removes Terraform-managed resources and then removes state storage to minimize cost.

## Validation

Run local validation before Azure validation:

- `cd backend && npm run build`
- `cd backend && npm test`
- `cd frontend && npm run build`
- `cd infrastructure && terraform fmt -check`

Deployment execution is manual through GitHub Actions using repository secrets `ARM_CLIENT_ID`, `ARM_CLIENT_SECRET`, `ARM_SUBSCRIPTION_ID`, and `ARM_TENANT_ID`.
