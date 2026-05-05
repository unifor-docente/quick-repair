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
