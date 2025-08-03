import importlib
import logging
import multiprocessing
import pkgutil
import sys

import click
from alembic.config import main as alembic_main
from app import cli
from app.core.config import settings
from uvicorn import run

# Configure logging
logging.basicConfig(
    format="%(asctime)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)

logger = logging.getLogger(__name__)


@click.group()
def fastrun():
    pass


# add sub-commands
for load, module_name, is_pkg in pkgutil.walk_packages(
    cli.__path__, cli.__name__ + "."
):
    module = importlib.import_module(module_name)
    p, m = module_name.rsplit(".", 1)

    if m == "main":
        continue

    for attribute in module.__dict__.values():
        if isinstance(attribute, (click.core.Command, click.core.Group)):
            fastrun.add_command(attribute)

            if isinstance(attribute, click.core.Group):
                break


@fastrun.command()
def start():
    """Start the server."""
    try:
        print(f"Starting the server in {settings.ENV} environment...")

        # Configure the server based on the environment
        if settings.ENV == "production":
            workers = multiprocessing.cpu_count() * 2 + 1
            reload = False  # Disable reloading in production
        else:
            workers = 1  # Single worker for development
            reload = True  # Enable reloading in development

        run(
            "app.main:app",
            host=settings.APP_HOST,
            port=settings.APP_PORT,
            reload=reload,
            log_level="info",
            access_log=True,
            workers=workers,
        )
    except KeyboardInterrupt:
        print("\nServer terminated by user (Ctrl + C).")
        # Add any cleanup logic here if needed
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
    finally:
        print("Shutdown complete.")
        sys.exit(0)
