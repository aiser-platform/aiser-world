# Auth Service — Developer Setup

Quick steps for new developers to get `auth` running locally and manage migrations.

Prereqs
- Docker & Docker Compose
- Python + Poetry (only required if running commands inside the container)

Environment
- Copy `.env.example` to `.env` and set DB credentials; dev compose sets sensible defaults.

Run migrations (recommended)
- Build/restart services:
  ```bash
  docker compose up -d --build
  ```
- Apply migrations (from host):
  ```bash
  # run inside the auth container so it uses the project venv
  docker exec -e PYTHONPATH=/app/src -e DATABASE_URL="$DATABASE_URL" aiser-auth poetry run alembic upgrade heads
  ```

Seed default admin (dev only)
- A migration seeds a placeholder admin row. To set/update the admin password run the helper script inside the auth container:
  ```bash
  docker exec -e PYTHONPATH=/app/src -it aiser-auth poetry run python packages/auth/scripts/set_admin_password.py --email admin@aiser.app --password mysecret
  ```

Useful commands
- Restart services: `docker compose restart`
- View logs: `docker logs -f aiser-auth`
- Run tests: see repo-level test instructions

Notes
- Migrations created here are intentionally non-destructive by default. If you need to perform destructive schema changes, create focused migrations and coordinate with the team.


