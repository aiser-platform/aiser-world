from setuptools import find_packages, setup

# Package metadata
PACKAGE_NAME = "aiser-client-server"
VERSION = "0.1"
DESCRIPTION = "AISER Client Server"
AUTHOR = "Kimseng Duong"
AUTHOR_EMAIL = "kimseng.duong@dataticon.com"

# Dependencies
REQUIRED_PACKAGES = [
    "fastapi>=0.104.1",
    "uvicorn>=0.24.0",
    "alembic>=1.13.0",
    "SQLAlchemy>=2.0.23",
    "asyncpg>=0.30.0",
    "pydantic>=2.10.4",
    "pydantic-settings>=2.7.0",
    "python-jose>=3.3.0",
    "psycopg2-binary>=2.9.9",
    "openai>=1.59.7",
]

# Entry points
CONSOLE_SCRIPTS = {
    "console_scripts": ["fastrun=app.cli.main:fastrun"],
}

setup(
    name=PACKAGE_NAME,
    version=VERSION,
    description=DESCRIPTION,
    author=AUTHOR,
    author_email=AUTHOR_EMAIL,
    packages=find_packages(),
    entry_points=CONSOLE_SCRIPTS,
    install_requires=REQUIRED_PACKAGES,
    python_requires=">=3.8",  # Added Python version requirement
    classifiers=[
        "Programming Language :: Python :: 3",
        "Operating System :: OS Independent",
    ],
)
