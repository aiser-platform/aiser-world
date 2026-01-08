# Deprecated SQL Scripts

This directory contains SQL scripts that have been deprecated in favor of Alembic migrations.

## Archived Scripts

The following scripts should NOT be executed directly. They are kept for reference only:

- `init-db.sql` - Initial database setup (replaced by Alembic migrations)
- `fix-schema-inconsistencies.sql` - Schema fixes (replaced by Alembic migrations)
- `add_file_storage_table.sql` - File storage table creation (replaced by Alembic migrations)
- `remove_organization_isolation.sql` - Organization isolation removal (replaced by Alembic migrations)
- `fix_conversation_schema.sql` - Conversation schema fixes (replaced by Alembic migrations)

## Migration Strategy

All database schema changes should now be managed through Alembic migrations located in:
`packages/chat2chart/server/alembic/versions/`

To apply schema changes:
```bash
cd packages/chat2chart/server
poetry run alembic -c alembic.ini upgrade head
```

To create a new migration:
```bash
poetry run alembic -c alembic.ini revision --autogenerate -m "description"
```




