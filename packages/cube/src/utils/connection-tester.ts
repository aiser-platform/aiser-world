/**
 * Database Connection Tester
 * Tests connectivity to various database types for multi-tenant setup
 */

// Mock winston for build
const winston = {
  createLogger: (config: any) => ({
    info: (msg: string, meta?: any) => console.log(msg, meta),
    warn: (msg: string, meta?: any) => console.warn(msg, meta),
    error: (msg: string, meta?: any) => console.error(msg, meta)
  }),
  format: {
    combine: (...args: any[]) => {},
    timestamp: () => {},
    json: () => {}
  },
  transports: {
    Console: class {
      constructor(options: any) {}
    }
  }
};
import { DatabaseDriverFactory, DatabaseType } from '../drivers/database-factory';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

// Connection test result interface
interface ConnectionTestResult {
  tenantId: string;
  databaseType: DatabaseType;
  success: boolean;
  responseTime: number;
  error?: string;
  metadata?: {
    version: string;
    schema: string;
    tableCount: number;
  };
}

// Connection configuration for testing
interface TestConnectionConfig {
  tenantId: string;
  databaseType: DatabaseType;
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  schema?: string;
  ssl?: boolean;
}

export class ConnectionTester {
  private databaseFactory: DatabaseDriverFactory;

  constructor() {
    this.databaseFactory = new DatabaseDriverFactory();
  }

  /**
   * Test connection for a specific tenant
   */
  async testTenantConnection(tenantId: string): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`Testing connection for tenant: ${tenantId}`);
      
      const driver = this.databaseFactory.createDriver(tenantId);
      
      // Test basic connectivity
      await driver.testConnection();
      
      // Get database metadata
      const metadata = await this.getDatabaseMetadata(driver);
      
      const responseTime = Date.now() - startTime;
      
      const result: ConnectionTestResult = {
        tenantId,
        databaseType: (process.env.CUBE_DB_TYPE as DatabaseType) || 'postgres',
        success: true,
        responseTime,
        metadata
      };
      
      logger.info(`Connection test successful for tenant: ${tenantId}`, result);
      return result;
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      const result: ConnectionTestResult = {
        tenantId,
        databaseType: (process.env.CUBE_DB_TYPE as DatabaseType) || 'postgres',
        success: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      logger.error(`Connection test failed for tenant: ${tenantId}`, result);
      return result;
    }
  }

  /**
   * Test multiple database connections
   */
  async testMultipleConnections(configs: TestConnectionConfig[]): Promise<ConnectionTestResult[]> {
    const results: ConnectionTestResult[] = [];
    
    for (const config of configs) {
      try {
        const result = await this.testCustomConnection(config);
        results.push(result);
      } catch (error) {
        results.push({
          tenantId: config.tenantId,
          databaseType: config.databaseType,
          success: false,
          responseTime: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return results;
  }

  /**
   * Test custom database connection
   */
  async testCustomConnection(config: TestConnectionConfig): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`Testing custom connection for tenant: ${config.tenantId}`);
      
      // Create temporary driver with custom config
      const driver = this.createCustomDriver(config);
      
      // Test connectivity
      await driver.testConnection();
      
      // Get metadata
      const metadata = await this.getDatabaseMetadata(driver);
      
      const responseTime = Date.now() - startTime;
      
      return {
        tenantId: config.tenantId,
        databaseType: config.databaseType,
        success: true,
        responseTime,
        metadata
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        tenantId: config.tenantId,
        databaseType: config.databaseType,
        success: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test all supported database types
   */
  async testAllDatabaseTypes(): Promise<Record<DatabaseType, boolean>> {
    const supportedTypes: DatabaseType[] = [
      'postgres',
      'mysql',
      'mssql',
      'snowflake',
      'bigquery',
      'redshift'
    ];
    
    const results: Record<DatabaseType, boolean> = {} as any;
    
    for (const dbType of supportedTypes) {
      try {
        const isSupported = await this.testDatabaseTypeSupport(dbType);
        results[dbType] = isSupported;
        logger.info(`Database type ${dbType}: ${isSupported ? 'supported' : 'not supported'}`);
      } catch (error) {
        results[dbType] = false;
        logger.error(`Failed to test database type ${dbType}:`, error);
      }
    }
    
    return results;
  }

  /**
   * Get database metadata
   */
  private async getDatabaseMetadata(driver: any): Promise<ConnectionTestResult['metadata']> {
    try {
      // Get database version
      const versionQuery = this.getVersionQuery(driver);
      const versionResult = await driver.query(versionQuery);
      const version = versionResult[0]?.version || 'Unknown';
      
      // Get schema information
      const schemaQuery = `
        SELECT table_schema, COUNT(*) as table_count
        FROM information_schema.tables 
        WHERE table_type = 'BASE TABLE'
          AND table_schema NOT IN ('information_schema', 'pg_catalog', 'sys', 'mysql')
        GROUP BY table_schema
        ORDER BY table_count DESC
        LIMIT 1
      `;
      
      const schemaResult = await driver.query(schemaQuery);
      const schema = schemaResult[0]?.table_schema || 'public';
      const tableCount = parseInt(schemaResult[0]?.table_count || '0');
      
      return {
        version,
        schema,
        tableCount
      };
      
    } catch (error) {
      logger.warn('Failed to get database metadata:', error);
      return {
        version: 'Unknown',
        schema: 'Unknown',
        tableCount: 0
      };
    }
  }

  /**
   * Get version query for different database types
   */
  private getVersionQuery(driver: any): string {
    // This is a simplified approach - in reality, you'd check the driver type
    const queries = [
      'SELECT version() as version',  // PostgreSQL, MySQL
      'SELECT @@version as version', // SQL Server
      'SELECT CURRENT_VERSION() as version' // Snowflake
    ];
    
    return queries[0]; // Default to PostgreSQL format
  }

  /**
   * Create custom driver for testing
   */
  private createCustomDriver(config: TestConnectionConfig): any {
    switch (config.databaseType) {
      case 'postgres':
        const PostgresDriver = require('@cubejs-backend/postgres-driver');
        return new PostgresDriver({
          host: config.host,
          port: config.port,
          database: config.database,
          user: config.user,
          password: config.password,
          ssl: config.ssl
        });
        
      case 'mysql':
        const MySQLDriver = require('@cubejs-backend/mysql-driver');
        return new MySQLDriver({
          host: config.host,
          port: config.port,
          database: config.database,
          user: config.user,
          password: config.password,
          ssl: config.ssl
        });
        
      case 'mssql':
        const MSSQLDriver = require('@cubejs-backend/mssql-driver');
        return new MSSQLDriver({
          server: config.host,
          port: config.port,
          database: config.database,
          user: config.user,
          password: config.password,
          options: {
            encrypt: true,
            trustServerCertificate: true
          }
        });
        
      case 'snowflake':
        const SnowflakeDriver = require('@cubejs-backend/snowflake-driver');
        return new SnowflakeDriver({
          account: config.host, // For Snowflake, host is the account
          username: config.user,
          password: config.password,
          database: config.database
        });
        
      case 'bigquery':
        const BigQueryDriver = require('@cubejs-backend/bigquery-driver');
        return new BigQueryDriver({
          projectId: config.database, // For BigQuery, database is the project ID
          keyFilename: process.env.CUBE_DB_BQ_KEY_FILE
        });
        
      case 'redshift':
        const RedshiftDriver = require('@cubejs-backend/redshift-driver');
        return new RedshiftDriver({
          host: config.host,
          port: config.port,
          database: config.database,
          user: config.user,
          password: config.password,
          ssl: true
        });
        
      default:
        throw new Error(`Unsupported database type: ${config.databaseType}`);
    }
  }

  /**
   * Test if a database type is supported
   */
  private async testDatabaseTypeSupport(dbType: DatabaseType): Promise<boolean> {
    try {
      switch (dbType) {
        case 'postgres':
          require('@cubejs-backend/postgres-driver');
          return true;
          
        case 'mysql':
          require('@cubejs-backend/mysql-driver');
          return true;
          
        case 'mssql':
          require('@cubejs-backend/mssql-driver');
          return true;
          
        case 'snowflake':
          require('@cubejs-backend/snowflake-driver');
          return true;
          
        case 'bigquery':
          require('@cubejs-backend/bigquery-driver');
          return true;
          
        case 'redshift':
          require('@cubejs-backend/redshift-driver');
          return true;
          
        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate connection health report
   */
  async generateHealthReport(tenantIds: string[]): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    totalTenants: number;
    healthyTenants: number;
    unhealthyTenants: number;
    results: ConnectionTestResult[];
    recommendations: string[];
  }> {
    const results: ConnectionTestResult[] = [];
    
    for (const tenantId of tenantIds) {
      const result = await this.testTenantConnection(tenantId);
      results.push(result);
    }
    
    const healthyTenants = results.filter(r => r.success).length;
    const unhealthyTenants = results.length - healthyTenants;
    
    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyTenants === 0) {
      overall = 'healthy';
    } else if (unhealthyTenants < results.length / 2) {
      overall = 'degraded';
    } else {
      overall = 'unhealthy';
    }
    
    const recommendations = this.generateRecommendations(results);
    
    return {
      overall,
      totalTenants: results.length,
      healthyTenants,
      unhealthyTenants,
      results,
      recommendations
    };
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(results: ConnectionTestResult[]): string[] {
    const recommendations: string[] = [];
    
    const failedResults = results.filter(r => !r.success);
    const slowResults = results.filter(r => r.success && r.responseTime > 5000);
    
    if (failedResults.length > 0) {
      recommendations.push(`${failedResults.length} tenant(s) have connection failures. Check database credentials and network connectivity.`);
    }
    
    if (slowResults.length > 0) {
      recommendations.push(`${slowResults.length} tenant(s) have slow connections (>5s). Consider optimizing database performance or network latency.`);
    }
    
    const avgResponseTime = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.responseTime, 0) / results.filter(r => r.success).length;
    
    if (avgResponseTime > 2000) {
      recommendations.push('Average response time is high. Consider implementing connection pooling or database optimization.');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('All connections are healthy. No immediate action required.');
    }
    
    return recommendations;
  }

  /**
   * Monitor connections continuously
   */
  async startConnectionMonitoring(
    tenantIds: string[], 
    intervalMs: number = 60000,
    callback?: (results: ConnectionTestResult[]) => void
  ): Promise<NodeJS.Timeout> {
    logger.info(`Starting connection monitoring for ${tenantIds.length} tenants`);
    
    const monitor = async () => {
      try {
        const results: ConnectionTestResult[] = [];
        
        for (const tenantId of tenantIds) {
          const result = await this.testTenantConnection(tenantId);
          results.push(result);
        }
        
        const healthyCount = results.filter(r => r.success).length;
        logger.info(`Connection monitoring: ${healthyCount}/${results.length} tenants healthy`);
        
        if (callback) {
          callback(results);
        }
        
      } catch (error) {
        logger.error('Connection monitoring error:', error);
      }
    };
    
    // Run initial check
    await monitor();
    
    // Schedule periodic checks
    return setInterval(monitor, intervalMs);
  }
}