import os
import sys
from logging.config import fileConfig

from sqlalchemy import create_engine

from alembic import context

# this is the Alembic Config object, which provides
# access to values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata

# Ensure src directory is on sys.path so imports like `from app.modules...` work
# when env.py is loaded by Alembic (which may change cwd or sys.path).
script_dir = os.path.dirname(__file__)
src_dir = os.path.abspath(os.path.join(script_dir, '..'))
if src_dir not in sys.path:
    sys.path.insert(0, src_dir)

# Set up local MetaData and Base for auth-service models
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import MetaData

auth_metadata = MetaData()
AuthBase = declarative_base(metadata=auth_metadata)

# Import all models for auth-service to be included in migrations

target_metadata = auth_metadata

# other values from the config, defined by the needs of env.py,
# can be acquired herein and passed to the MigrationContext.
# for example, my_important_option = config.get_main_option("my_important_option")
# ... etc.

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a database to begin with.

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


def do_run_migrations(connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = config.get_section(config.config_ini_section, {})
    database_url = os.environ.get("DATABASE_URL")
    if database_url is None:
        raise Exception("DATABASE_URL environment variable is not set.")
    connectable['sqlalchemy.url'] = database_url  # Ensure DATABASE_URL is read from environment

    # Use synchronous engine with psycopg2 (not asyncpg) for Alembic
    engine = create_engine(connectable['sqlalchemy.url'].replace('+asyncpg', ''))

    with engine.connect() as connection:
        do_run_migrations(connection)
        connection.commit()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
