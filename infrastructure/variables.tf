variable "project_name" {
  description = "Nome do projeto usado como prefixo nos recursos."
  type        = string
  default     = "quickrepair"
}

variable "environment" {
  description = "Ambiente de deploy."
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment deve ser dev, staging ou prod."
  }
}

variable "location" {
  description = "Regiao Azure dos recursos principais."
  type        = string
  default     = "brazilsouth"
}

variable "static_web_app_location" {
  description = "Regiao Azure da Static Web App."
  type        = string
  default     = "eastus2"
}
