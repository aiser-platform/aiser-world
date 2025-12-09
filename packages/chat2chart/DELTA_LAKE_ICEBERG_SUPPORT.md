# Delta Lake & Apache Iceberg Support

## Overview

Aiser Platform supports enterprise data lake formats (Delta Lake and Apache Iceberg) through DuckDB extensions, enabling direct querying of large-scale data without data movement.

## Architecture

### DuckDB Extensions

Both Delta Lake and Apache Iceberg are supported via DuckDB extensions:

- **Delta Lake**: `delta` extension (via `delta-rs`)
- **Apache Iceberg**: `iceberg` extension

### Storage Backends

Both formats work with:
- **S3** (AWS S3, MinIO)
- **Azure Blob Storage**
- **Local filesystem** (for testing)
- **GCS** (Google Cloud Storage) - via S3-compatible API

## Implementation

### 1. DuckDB Extension Installation

**Requirements**:
```python
# In requirements.txt or pyproject.toml
duckdb>=0.9.0  # Supports extensions
```

**Extension Installation** (Runtime):
```python
import duckdb

conn = duckdb.connect()

# Install Delta extension
conn.install_extension('delta')
conn.load_extension('delta')

# Install Iceberg extension
conn.install_extension('iceberg')
conn.load_extension('iceberg')
```

### 2. Delta Lake Support

**Reading Delta Tables**:
```python
# S3 Delta table
result = conn.execute("""
    SELECT * FROM delta_scan('s3://bucket/delta-table/')
    LIMIT 1000
""").df()

# Azure Blob Delta table
result = conn.execute("""
    SELECT * FROM delta_scan('azure://account/container/delta-table/')
    LIMIT 1000
""").df()
```

**Features**:
- ✅ Time travel queries (read historical versions)
- ✅ Schema evolution support
- ✅ Partition pruning
- ✅ Column-level statistics

**Time Travel Example**:
```python
# Read version 5 of the table
result = conn.execute("""
    SELECT * FROM delta_scan('s3://bucket/delta-table/', version=5)
""").df()

# Read timestamp-based version
result = conn.execute("""
    SELECT * FROM delta_scan('s3://bucket/delta-table/', timestamp='2024-01-01 00:00:00')
""").df()
```

### 3. Apache Iceberg Support

**Reading Iceberg Tables**:
```python
# S3 Iceberg table
result = conn.execute("""
    SELECT * FROM iceberg_scan('s3://bucket/iceberg-table/')
    LIMIT 1000
""").df()

# Azure Blob Iceberg table
result = conn.execute("""
    SELECT * FROM iceberg_scan('azure://account/container/iceberg-table/')
    LIMIT 1000
""").df()
```

**Features**:
- ✅ Snapshot isolation
- ✅ Schema evolution
- ✅ Partition evolution
- ✅ Hidden partitioning

**Snapshot Queries**:
```python
# Read specific snapshot
result = conn.execute("""
    SELECT * FROM iceberg_scan('s3://bucket/iceberg-table/', snapshot_id=12345)
""").df()
```

### 4. Credential Configuration

**S3 Credentials** (via DuckDB S3 extension):
```python
# Configure S3 credentials
conn.execute("""
    SET s3_access_key_id='YOUR_ACCESS_KEY';
    SET s3_secret_access_key='YOUR_SECRET_KEY';
    SET s3_region='us-east-1';
    SET s3_endpoint='https://s3.amazonaws.com';  # Optional for custom endpoints
""")
```

**Azure Blob Credentials**:
```python
# Configure Azure credentials
conn.execute("""
    SET azure_storage_account_name='YOUR_ACCOUNT';
    SET azure_storage_account_key='YOUR_KEY';
    SET azure_storage_sas_token='YOUR_SAS_TOKEN';  # Alternative to account key
""")
```

### 5. Data Source Connector

**Service Implementation** (`delta_iceberg_connector.py`):
```python
class DeltaIcebergConnector:
    """Connector for Delta Lake and Apache Iceberg tables"""
    
    async def connect_delta_table(
        self,
        storage_uri: str,  # s3://bucket/table/ or azure://account/container/table/
        credentials: Dict[str, str],
        version: Optional[int] = None,
        timestamp: Optional[str] = None
    ) -> Dict[str, Any]:
        """Connect to Delta Lake table"""
        import duckdb
        
        conn = duckdb.connect()
        
        # Configure credentials
        if storage_uri.startswith('s3://'):
            conn.execute(f"SET s3_access_key_id='{credentials['access_key']}'")
            conn.execute(f"SET s3_secret_access_key='{credentials['secret_key']}'")
            conn.execute(f"SET s3_region='{credentials.get('region', 'us-east-1')}'")
        elif storage_uri.startswith('azure://'):
            conn.execute(f"SET azure_storage_account_name='{credentials['account_name']}'")
            if 'account_key' in credentials:
                conn.execute(f"SET azure_storage_account_key='{credentials['account_key']}'")
            elif 'sas_token' in credentials:
                conn.execute(f"SET azure_storage_sas_token='{credentials['sas_token']}'")
        
        # Install and load Delta extension
        try:
            conn.install_extension('delta')
            conn.load_extension('delta')
        except Exception as e:
            raise Exception(f"Failed to load Delta extension: {e}")
        
        # Build query with optional version/timestamp
        query = f"SELECT * FROM delta_scan('{storage_uri}'"
        if version:
            query += f", version={version}"
        elif timestamp:
            query += f", timestamp='{timestamp}'"
        query += ") LIMIT 100"
        
        # Get sample data and schema
        result = conn.execute(query).df()
        schema = conn.execute(f"DESCRIBE delta_scan('{storage_uri}')").fetchall()
        
        return {
            'success': True,
            'data': result.to_dict('records'),
            'schema': [{'name': row[0], 'type': row[1]} for row in schema],
            'format': 'delta',
            'storage_uri': storage_uri
        }
    
    async def connect_iceberg_table(
        self,
        storage_uri: str,
        credentials: Dict[str, str],
        snapshot_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Connect to Apache Iceberg table"""
        # Similar implementation for Iceberg
        pass
```

### 6. UI Integration

**UniversalDataSourceModal Updates**:
- Add "Delta Lake" and "Apache Iceberg" options in data source type selector
- Form fields:
  - Storage URI (s3:// or azure://)
  - Credentials (access key/secret or SAS token)
  - Optional: Version/Snapshot ID for time travel
- Test connection button to verify access

## Usage Examples

### Example 1: Query Delta Lake Table on S3

```python
# User uploads Delta Lake connection:
{
    "type": "delta_lake",
    "storage_uri": "s3://my-bucket/sales-data/",
    "credentials": {
        "access_key": "AKIA...",
        "secret_key": "...",
        "region": "us-east-1"
    }
}

# AI query: "Show me sales by region for last month"
# Backend generates:
sql = """
    SELECT region, SUM(amount) as total_sales
    FROM delta_scan('s3://my-bucket/sales-data/')
    WHERE date >= '2024-01-01' AND date < '2024-02-01'
    GROUP BY region
"""
```

### Example 2: Time Travel Query

```python
# User query: "What were sales last quarter?"
# Backend uses timestamp-based time travel:
sql = """
    SELECT SUM(amount) as total
    FROM delta_scan(
        's3://my-bucket/sales-data/',
        timestamp='2024-01-01 00:00:00'
    )
    WHERE date >= '2023-10-01' AND date < '2024-01-01'
"""
```

### Example 3: Iceberg Table with Snapshot

```python
# User query: "Show customer data from snapshot 42"
sql = """
    SELECT *
    FROM iceberg_scan(
        's3://my-bucket/customers/',
        snapshot_id=42
    )
    LIMIT 1000
"""
```

## Security Considerations

1. **Credential Storage**:
   - Encrypt credentials in `data_sources.connection_config`
   - Use organization-scoped credentials (not user-level)
   - Support IAM roles for S3 (no credentials needed)

2. **Access Control**:
   - RBAC checks before querying Delta/Iceberg tables
   - Organization isolation (users can only query their org's tables)
   - Audit logging for all Delta/Iceberg queries

3. **Network Security**:
   - Support VPC endpoints for S3
   - Support private endpoints for Azure Blob
   - TLS/SSL for all connections

## Performance Optimization

1. **Partition Pruning**:
   - DuckDB automatically prunes partitions based on WHERE clauses
   - Delta Lake: Partition columns in WHERE clause
   - Iceberg: Hidden partitioning handled automatically

2. **Column Projection**:
   - Only select needed columns (DuckDB columnar format)
   - Reduces I/O for wide tables

3. **Caching**:
   - Cache schema metadata (table structure, partitions)
   - Cache recent query results (Redis)
   - Cache Delta/Iceberg manifest files

## Limitations & Future Work

**Current Limitations**:
- Read-only support (no writes to Delta/Iceberg)
- No schema evolution detection (manual refresh needed)
- Limited time travel UI (backend-only for now)

**Future Enhancements**:
- Write support for Delta Lake (via DuckDB COPY)
- Schema evolution detection and alerts
- Time travel UI (version selector in frontend)
- Multi-table joins across Delta/Iceberg tables
- Support for Delta Lake streaming tables

## Testing

**Test Delta Lake Connection**:
```bash
# Create test Delta table (using Spark/PySpark)
# Then test connection:
curl -X POST /data/delta-lake/test \
  -H "Content-Type: application/json" \
  -d '{
    "storage_uri": "s3://test-bucket/delta-table/",
    "credentials": {...}
  }'
```

**Test Iceberg Connection**:
```bash
curl -X POST /data/iceberg/test \
  -H "Content-Type: application/json" \
  -d '{
    "storage_uri": "s3://test-bucket/iceberg-table/",
    "credentials": {...}
  }'
```

## References

- [DuckDB Delta Extension](https://duckdb.org/docs/extensions/delta)
- [DuckDB Iceberg Extension](https://duckdb.org/docs/extensions/iceberg)
- [Delta Lake Documentation](https://delta.io/)
- [Apache Iceberg Documentation](https://iceberg.apache.org/)





