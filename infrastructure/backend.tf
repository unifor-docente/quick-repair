terraform {
  backend "azurerm" {
    resource_group_name  = "rg-quickrepair-tfstate"
    storage_account_name = "stqrtfstateplaceholder"
    container_name       = "tfstate"
    key                  = "quickrepair.tfstate"
  }
}
