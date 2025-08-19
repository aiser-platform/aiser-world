from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context


# ---------------- added code here -------------------------#
import os, sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)
from app.core.config import settings

# ------------------------------------------------------------#
# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config
# ---------------- added code here -------------------------#
# this will overwrite the ini-file sqlalchemy.url path
# with the path given in the config of the main code
config.set_main_option("sqlalchemy.url", settings.SQLALCHEMY_DATABASE_URI)
# ------------------------------------------------------------#
# Interpret the config file for Python logging.
# This line sets up loggers basically.
fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
# ---------------- added code here -------------------------#
# Import models only when needed for migrations
# This prevents circular imports during application startup
try:
    from migrations.models import *
    target_metadata = [Base.metadata]
except ImportError:
    # If models can't be imported, use empty metadata
    # This allows the application to start without migration conflicts
    target_metadata = None
    print("Warning: Could not import migration models. Migrations may not work correctly.")
# ------------------------------------------------------------#


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    # Override sqlalchemy.url with sync PostgreSQL URL
    # Use explicit driver specification to avoid conflicts
    async_url = settings.SQLALCHEMY_DATABASE_URI
    if "postgresql+asyncpg://" in async_url:
        sync_url = async_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
    else:
        # Fallback to explicit psycopg2 driver
        sync_url = f"postgresql+psycopg2://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"

    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = sync_url

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
