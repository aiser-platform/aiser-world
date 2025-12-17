# Testing Guide: Post-Cube.js Removal

## Overview

This guide covers testing the simplified database connectivity system after removing Cube.js integration.

## Critical Tests Required

### 1. Database Connection Tests

Test all supported database types:

```bash
# Test PostgreSQL connection
curl -X POST http://localhost:8000/api/data/database/test \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "postgresql",
    "host": "localhost",
    "port": 5432,
    "database": "aiser_world",
    "username": "aiser",
    "password": "aiser_password"
  }'

# Test ClickHouse connection (HTTP API)
curl -X POST http://localhost:8000/api/data/database/test \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "clickhouse",
    "host": "localhost",
    "port": 8123,
    "database": "aiser_warehouse",
    "username": "aiser",
    "password": "aiser_warehouse_password"
  }'
```

Expected: `{"success": true, "connection_info": {...}}`

### 2. Database Connection Storage

```bash
# Store a database connection
curl -X POST http://localhost:8000/api/data/database/connect \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "postgresql",
    "host": "localhost",
    "port": 5432,
    "database": "aiser_world",
    "username": "aiser",
    "password": "aiser_password",
    "name": "My PostgreSQL DB"
  }'
```

Expected: Returns `data_source_id` and stores encrypted credentials in PostgreSQL.

### 3. Schema Retrieval

```bash
# Get database schema
curl -X GET http://localhost:8000/api/data/sources/{data_source_id}/schema \
  -H "Authorization: Bearer $TOKEN"
```

Expected: Returns tables, columns, and row counts.

### 4. File Upload

```bash
# Upload CSV file
curl -X POST http://localhost:8000/api/data/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.csv"
```

Expected: File uploaded and data source created.

### 5. Data Source List

```bash
# List all data sources
curl -X GET http://localhost:8000/api/data/sources \
  -H "Authorization: Bearer $TOKEN"
```

Expected: Returns both file and database sources.

### 6. Query Execution (if implemented)

```bash
# Execute SQL query on database connection
curl -X POST http://localhost:8000/api/data/sources/{source_id}/query \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT * FROM users LIMIT 10"
  }'
```

Expected: Returns query results.

## Unit Tests to Create

### Test DatabaseConnectorService

```python
# tests/test_database_connector.py
import pytest
from app.modules.data.services.database_connector_service import DatabaseConnectorService

@pytest.mark.asyncio
async def test_postgresql_connection():
    connector = DatabaseConnectorService()
    config = {
        'type': 'postgresql',
        'host': 'localhost',
        'port': 5432,
        'database': 'test_db',
        'username': 'test_user',
        'password': 'test_pass',
    }
    result = await connector.test_connection(config)
    assert result['success'] == True

@pytest.mark.asyncio
async def test_clickhouse_http():
    connector = DatabaseConnectorService()
    config = {
        'type': 'clickhouse',
        'host': 'localhost',
        'port': 8123,
        'database': 'test_db',
        'username': 'test_user',
        'password': 'test_pass',
    }
    result = await connector.test_connection(config)
    assert result['success'] == True

@pytest.mark.asyncio
async def test_unsupported_database():
    connector = DatabaseConnectorService()
    config = {
        'type': 'mongodb',  # Not supported
        'host': 'localhost',
    }
    result = await connector.test_connection(config)
    assert result['success'] == False
    assert 'Unsupported' in result['error']
```

### Test DataConnectivityService

```python
# tests/test_data_connectivity.py
import pytest
from app.modules.data.services.data_connectivity_service import DataConnectivityService

@pytest.mark.asyncio
async def test_database_connection():
    service = DataConnectivityService()
    config = {
        'type': 'postgresql',
        'host': 'localhost',
        'port': 5432,
        'database': 'test_db',
        'username': 'test',
        'password': 'test',
    }
    result = await service.test_database_connection(config)
    assert 'success' in result

@pytest.mark.asyncio
async def test_get_supported_databases():
    service = DataConnectivityService()
    result = await service.get_supported_databases()
    assert result['success'] == True
    assert len(result['supported_databases']) > 0
```

## Integration Tests

### Test Full Connection Flow

1. Test connection (no storage)
2. Store connection (with credentials)
3. Retrieve connection (credentials decrypted)
4. Get schema
5. Execute query
6. Delete connection

### Test ClickHouse Specific

1. Test HTTP API connection
2. Get schema via HTTP
3. Execute query via HTTP
4. Test with materialized views (should be filtered)

## Regression Tests

Ensure existing features still work:

1. **File Upload**: CSV, Excel, JSON, Parquet
2. **Data Modeling**: AI schema analysis
3. **Chat Functionality**: Chat with data sources
4. **Chart Generation**: Generate charts from queries
5. **Multi-Engine Queries**: DuckDB, Pandas fallbacks

## Known Issues / Expected Failures

### Cube.js Endpoints

The following endpoints will return 501 Not Implemented errors (expected):

- `POST /api/data/cube/status`
- `POST /api/data/cube/connect`
- `GET /api/data/cube/metadata`
- `POST /api/data/cube/query`
- `GET /api/data/cube/suggestions`
- `GET /api/data/cube/{cube_name}/preview`
- `POST /api/data/cube-modeling/analyze`
- `POST /api/data/cube-modeling/deploy`
- `POST /api/data/cube-modeling/connect-warehouse`
- `POST /api/data/cube/initialize`
- `POST /api/data/cube/connections`
- `POST /api/data/cube/connections/{id}/query`
- `GET /api/data/cube/connections/{id}/schema`
- `POST /api/data/cube/connections/{id}/schema`

These endpoints were non-functional (Cube.js not deployed) and have been deprecated.

## Performance Tests

### Connection Pool

Test that connection pooling works correctly:

```python
# Create multiple queries concurrently
import asyncio

async def test_connection_pool():
    service = DatabaseConnectorService()
    # Create connection
    conn_result = await service.create_connection(config)
    conn_id = conn_result['connection_id']
    
    # Execute 10 queries concurrently
    tasks = [
        service.execute_query(conn_id, "SELECT 1") 
        for _ in range(10)
    ]
    results = await asyncio.gather(*tasks)
    
    # All should succeed
    assert all(r['success'] for r in results)
```

### Large Schema Retrieval

Test schema retrieval on database with 100+ tables:

```python
async def test_large_schema():
    connector = DatabaseConnectorService()
    result = await connector.get_schema(large_db_config)
    assert result['success'] == True
    assert len(result['tables']) > 100
```

## Manual Testing Checklist

- [ ] PostgreSQL connection test passes
- [ ] MySQL connection test passes
- [ ] ClickHouse HTTP connection test passes
- [ ] Connection storage with encryption works
- [ ] Schema retrieval works for all database types
- [ ] File upload still works
- [ ] Data source list shows both files and databases
- [ ] Credentials are properly encrypted in database
- [ ] Credentials are properly decrypted when needed
- [ ] Connection pooling works (no connection leaks)
- [ ] Error messages are clear and helpful
- [ ] Client UI still functions normally
- [ ] No console errors in browser
- [ ] Docker containers all healthy

## Monitoring in Production

After deployment, monitor:

1. **Error rates**: Check for increased 500/501 errors
2. **Connection counts**: Ensure no connection pool exhaustion
3. **Query latency**: Database queries should be fast (direct connections)
4. **Memory usage**: Should be lower (removed 3000+ lines)

## Rollback Plan

If critical issues arise:

```bash
# Rollback to previous commit
git checkout main
git branch -D remove-cubejs

# Restart services
docker-compose down
docker-compose up -d
```

## Success Criteria

✅ All database connection tests pass  
✅ File upload functionality works  
✅ Schema retrieval works  
✅ No regressions in existing features  
✅ Client UI functions normally  
✅ Performance is same or better  
✅ Code is simpler and more maintainable  
