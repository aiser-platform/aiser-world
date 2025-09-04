SHELL := /bin/bash

# Server container name or context
SERVER_DIR := packages/chat2chart/server

.PHONY: setup-dev seed run-create-tables apply-passwords

setup-dev: ## Install server deps (poetry) and client deps (npm/yarn)
	cd $(SERVER_DIR) && poetry install || true
	@echo "Dev setup completed."

seed: run-create-tables ## Create tables and seed default Aiser org/project/user
	@echo "Seed complete."

run-create-tables: ## Create missing tables
	cd $(SERVER_DIR) && python create_missing_tables.py

apply-passwords: ## Apply default password hashes (non-production only)
	cd $(SERVER_DIR) && psql $$DATABASE_URL -f fix_passwords.sql || true
	@echo "Default passwords applied."

help: ## Show help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'


