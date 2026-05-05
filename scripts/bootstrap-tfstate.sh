#!/usr/bin/env bash
set -euo pipefail

LOCATION="${1:-brazilsouth}"
RG_NAME="rg-quickrepair-tfstate"
SA_SUFFIX="$(LC_ALL=C tr -dc 'a-z0-9' </dev/urandom | head -c 6)"
SA_NAME="stqrtfstate${SA_SUFFIX}"
CONTAINER="tfstate"

echo "Creating resource group: ${RG_NAME}"
az group create --name "${RG_NAME}" --location "${LOCATION}"

echo "Creating storage account: ${SA_NAME}"
az storage account create \
  --name "${SA_NAME}" \
  --resource-group "${RG_NAME}" \
  --location "${LOCATION}" \
  --sku Standard_LRS \
  --min-tls-version TLS1_2

echo "Creating blob container: ${CONTAINER}"
az storage container create \
  --name "${CONTAINER}" \
  --account-name "${SA_NAME}" \
  --auth-mode login

cat <<EOF

=== DONE ===
Add to infrastructure/backend.tf:

terraform {
  backend "azurerm" {
    resource_group_name  = "${RG_NAME}"
    storage_account_name = "${SA_NAME}"
    container_name       = "${CONTAINER}"
    key                  = "quickrepair.tfstate"
  }
}
EOF
