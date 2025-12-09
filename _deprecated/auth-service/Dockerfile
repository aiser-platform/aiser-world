FROM python:3.11-slim
WORKDIR /app
COPY ./src /app/src
# Install runtime dependencies
RUN apt-get update -qq && apt-get install -y -qq build-essential libpq-dev && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir uvicorn fastapi alembic asyncpg psycopg2-binary sqlalchemy passlib python-jose python-dotenv
ENV PYTHONPATH=/app/src
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "5000"]


