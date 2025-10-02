#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/push_tokens_to_azure.sh <key_vault_name>
# Requires: Azure CLI (az) logged in and access to the specified Key Vault.

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <KEY_VAULT_NAME>"
  exit 1
fi

KEY_VAULT_NAME="$1"
TOKENS_FILE="scripts/dev_tokens.env"

if [ ! -f "$TOKENS_FILE" ]; then
  echo "Tokens file not found: $TOKENS_FILE"
  exit 2
fi

# Load tokens
set -o allexport
source "$TOKENS_FILE"
set +o allexport

if [ -z "${ACCESS_TOKEN:-}" ] || [ -z "${REFRESH_TOKEN:-}" ]; then
  echo "ACCESS_TOKEN or REFRESH_TOKEN missing in $TOKENS_FILE"
  exit 3
fi

# Push to Azure Key Vault
az keyvault secret set --vault-name "$KEY_VAULT_NAME" --name "dev-access-token" --value "$ACCESS_TOKEN"
az keyvault secret set --vault-name "$KEY_VAULT_NAME" --name "dev-refresh-token" --value "$REFRESH_TOKEN"

echo "Tokens pushed to Key Vault: $KEY_VAULT_NAME (secrets: dev-access-token, dev-refresh-token)"
