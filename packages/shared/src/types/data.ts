// Data source and connectivity types
export type DataSourceType = 'file' | 'database' | 'warehouse' | 'api';

export interface FileDataSource {
  type: 'file';
  filename: string;
  uuidFilename: string;
  contentType: string;
  size: number;
}

export interface DatabaseDataSource {
  type: 'database';
  id: string;
  name: string;
  host: string;
  port: number;
  database: string;
  schema?: string;
  connectionType: 'postgresql' | 'mysql' | 'sqlserver' | 'oracle' | 'mongodb';
}

export interface WarehouseDataSource {
  type: 'warehouse';
  id: string;
  name: string;
  provider: 'snowflake' | 'bigquery' | 'redshift' | 'synapse';
  connectionString: string;
  schema?: string;
}

export interface ApiDataSource {
  type: 'api';
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  authentication?: {
    type: 'bearer' | 'basic' | 'apikey';
    credentials: Record<string, string>;
  };
}

export type DataSource = FileDataSource | DatabaseDataSource | WarehouseDataSource | ApiDataSource;

export interface DataColumn {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  nullable: boolean;
  unique: boolean;
  statistics?: {
    min?: number;
    max?: number;
    avg?: number;
    count: number;
    nullCount: number;
    uniqueCount: number;
  };
}

export interface Dataset {
  id: string;
  name: string;
  source: DataSource;
  columns: DataColumn[];
  rowCount: number;
  createdAt: Date;
  updatedAt: Date;
}