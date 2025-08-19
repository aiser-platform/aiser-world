/**
 * Database Driver Factory for Cube.js
 * Supports multiple database types with tenant-aware configuration
 */

// Mock winston for build
const winston = {
  createLogger: (config: any) => ({
    info: (msg: string, meta?: any) => console.log(msg, meta),
    warn: (msg: string, meta?: any) => console.warn(msg, meta),
    error: (msg: string, meta?: any) => console.error(msg, meta)
  }),
  format: {
    combine: (...args: any[]) => { },
    timestamp: () => { },
    json: () => { }
  },
  transports: {
    Console: class {
      constructor(options: any) { }
    }
  }
};
import { getTenantDatabaseName, getTenantSchemaName } from '../middleware/tenant';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console({})]
});

// Database configuration interface
interface DatabaseConfig {
  type: string;
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  schema?: string;
  ssl?: boolean | object;
  pool?: {
    min?: number;
    max?: number;
    acquireTimeoutMillis?: number;
    createTimeoutMillis?: number;
    destroyTimeoutMillis?: number;
    idleTimeoutMillis?: number;
    reapIntervalMillis?: number;
    createRetryIntervalMillis?: number;
  };
  // Additional properties for specific database types
  account?: string; // For Snowflake
  warehouse?: string; // For Snowflake
  role?: string; // For Snowflake
  projectId?: string; // For BigQuery
  keyFilename?: string; // For BigQuery
  location?: string; // For BigQuery
}

// Supported database types
export type DatabaseType =
  | 'postgres'
  | 'mysql'
  | 'mssql'
  | 'snowflake'
  | 'bigquery'
  | 'redshift'
  | 'clickhouse'
  | 'athena'
  | 'presto';

export class DatabaseDriverFactory {
  private static instance: DatabaseDriverFactory;
  private driverCache: Map<string, any> = new Map();

  constructor() {
    if (DatabaseDriverFactory.instance) {
      return DatabaseDriverFactory.instance;
    }
    DatabaseDriverFactory.instance = this;
  }

  /**
   * Create database driver based on configuration
   */
  createDriver(dataSource?: string): any {
    const tenantId = dataSource || 'default';
    const cacheKey = `driver:${tenantId}`;

    // Return cached driver if available
    if (this.driverCache.has(cacheKey)) {
      return this.driverCache.get(cacheKey);
    }

    const config = this.getDatabaseConfig(tenantId);
    const driver = this.createDriverInstance(config);

    // Cache the driver
    this.driverCache.set(cacheKey, driver);

    logger.info(`Created database driver for tenant: ${tenantId}, type: ${config.type}`);
    return driver;
  }

  /**
   * Create external database driver for data federation
   */
  createExternalDriver(dataSource?: string): any {
    const config = this.getExternalDatabaseConfig(dataSource);
    if (!config) return null;

    return this.createDriverInstance(config);
  }

  /**
   * Get database configuration for tenant
   */
  private getDatabaseConfig(tenantId: string): DatabaseConfig {
    const dbType = (process.env.CUBE_DB_TYPE || 'postgres') as DatabaseType;

    const baseConfig: DatabaseConfig = {
      type: dbType,
      host: process.env.CUBE_DB_HOST || 'localhost',
      port: parseInt(process.env.CUBE_DB_PORT || this.getDefaultPort(dbType)),
      database: getTenantDatabaseName(tenantId),
      user: process.env.CUBE_DB_USER || 'postgres',
      password: process.env.CUBE_DB_PASS || '',
      schema: getTenantSchemaName(tenantId)
    };

    // Add database-specific configurations
    switch (dbType) {
      case 'postgres':
        return {
          ...baseConfig,
          ssl: process.env.CUBE_DB_SSL === 'true' ? {
            rejectUnauthorized: false
          } : false,
          pool: {
            min: parseInt(process.env.CUBE_DB_POOL_MIN || '2'),
            max: parseInt(process.env.CUBE_DB_POOL_MAX || '10'),
            acquireTimeoutMillis: 30000,
            idleTimeoutMillis: 30000
          }
        };

      case 'mysql':
        return {
          ...baseConfig,
          port: parseInt(process.env.CUBE_DB_PORT || '3306'),
          ssl: process.env.CUBE_DB_SSL === 'true',
          pool: {
            min: parseInt(process.env.CUBE_DB_POOL_MIN || '2'),
            max: parseInt(process.env.CUBE_DB_POOL_MAX || '10')
          }
        };

      case 'mssql':
        return {
          ...baseConfig,
          port: parseInt(process.env.CUBE_DB_PORT || '1433'),
          pool: {
            min: parseInt(process.env.CUBE_DB_POOL_MIN || '2'),
            max: parseInt(process.env.CUBE_DB_POOL_MAX || '10')
          }
        };

      case 'snowflake':
        return {
          ...baseConfig,
          account: process.env.CUBE_DB_SNOWFLAKE_ACCOUNT,
          warehouse: process.env.CUBE_DB_SNOWFLAKE_WAREHOUSE,
          role: process.env.CUBE_DB_SNOWFLAKE_ROLE
        };

      case 'bigquery':
        return {
          ...baseConfig,
          projectId: process.env.CUBE_DB_BQ_PROJECT_ID,
          keyFilename: process.env.CUBE_DB_BQ_KEY_FILE,
          location: process.env.CUBE_DB_BQ_LOCATION || 'US'
        };

      case 'redshift':
        return {
          ...baseConfig,
          port: parseInt(process.env.CUBE_DB_PORT || '5439'),
          ssl: true,
          pool: {
            min: parseInt(process.env.CUBE_DB_POOL_MIN || '2'),
            max: parseInt(process.env.CUBE_DB_POOL_MAX || '10')
          }
        };

      default:
        return baseConfig;
    }
  }

  /**
   * Get external database configuration
   */
  private getExternalDatabaseConfig(dataSource?: string): DatabaseConfig | null {
    const extDbType = process.env.CUBE_EXT_DB_TYPE as DatabaseType;
    if (!extDbType) return null;

    return {
      type: extDbType,
      host: process.env.CUBE_EXT_DB_HOST || 'localhost',
      port: parseInt(process.env.CUBE_EXT_DB_PORT || this.getDefaultPort(extDbType)),
      database: process.env.CUBE_EXT_DB_NAME || 'external',
      user: process.env.CUBE_EXT_DB_USER || 'user',
      password: process.env.CUBE_EXT_DB_PASS || '',
      schema: process.env.CUBE_EXT_DB_SCHEMA
    };
  }

  /**
   * Create driver instance based on configuration
   */
  private createDriverInstance(config: DatabaseConfig): any {
    switch (config.type) {
      case 'postgres':
        return this.createPostgresDriver(config);

      case 'mysql':
        return this.createMySQLDriver(config);

      case 'mssql':
        return this.createMSSQLDriver(config);

      case 'snowflake':
        return this.createSnowflakeDriver(config);

      case 'bigquery':
        return this.createBigQueryDriver(config);

      case 'redshift':
        return this.createRedshiftDriver(config);

      default:
        throw new Error(`Unsupported database type: ${config.type}`);
    }
  }

  /**
   * Create PostgreSQL driver
   */
  private createPostgresDriver(config: DatabaseConfig): any {
    const PostgresDriver = require('@cubejs-backend/postgres-driver');

    return new PostgresDriver({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl,
      pool: config.pool
    });
  }

  /**
   * Create MySQL driver
   */
  private createMySQLDriver(config: DatabaseConfig): any {
    const MySQLDriver = require('@cubejs-backend/mysql-driver');

    return new MySQLDriver({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl,
      pool: config.pool
    });
  }

  /**
   * Create SQL Server driver
   */
  private createMSSQLDriver(config: DatabaseConfig): any {
    const MSSQLDriver = require('@cubejs-backend/mssql-driver');

    return new MSSQLDriver({
      server: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      pool: config.pool,
      options: {
        encrypt: true,
        trustServerCertificate: true
      }
    });
  }

  /**
   * Create Snowflake driver
   */
  private createSnowflakeDriver(config: any): any {
    const SnowflakeDriver = require('@cubejs-backend/snowflake-driver');

    return new SnowflakeDriver({
      account: config.account,
      username: config.user,
      password: config.password,
      database: config.database,
      warehouse: config.warehouse,
      role: config.role
    });
  }

  /**
   * Create BigQuery driver
   */
  private createBigQueryDriver(config: any): any {
    const BigQueryDriver = require('@cubejs-backend/bigquery-driver');

    return new BigQueryDriver({
      projectId: config.projectId,
      keyFilename: config.keyFilename,
      location: config.location
    });
  }

  /**
   * Create Redshift driver
   */
  private createRedshiftDriver(config: DatabaseConfig): any {
    const RedshiftDriver = require('@cubejs-backend/redshift-driver');

    return new RedshiftDriver({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl,
      pool: config.pool
    });
  }

  /**
   * Get default port for database type
   */
  private getDefaultPort(dbType: DatabaseType): string {
    const defaultPorts: Record<DatabaseType, string> = {
      postgres: '5432',
      mysql: '3306',
      mssql: '1433',
      snowflake: '443',
      bigquery: '443',
      redshift: '5439',
      clickhouse: '8123',
      athena: '443',
      presto: '8080'
    };

    return defaultPorts[dbType] || '5432';
  }

  /**
   * Test database connection
   */
  async testConnection(tenantId: string): Promise<boolean> {
    try {
      const driver = this.createDriver(tenantId);
      await driver.testConnection();
      logger.info(`Database connection test successful for tenant: ${tenantId}`);
      return true;
    } catch (error) {
      logger.error(`Database connection test failed for tenant: ${tenantId}`, error);
      return false;
    }
  }

  /**
   * Clear driver cache
   */
  clearCache(): void {
    this.driverCache.clear();
    logger.info('Database driver cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.driverCache.size,
      keys: Array.from(this.driverCache.keys())
    };
  }
}