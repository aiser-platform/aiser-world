/**
 * Simple test for Cube.js multi-tenant implementation
 */

import MultiTenantCubeServer, { DatabaseConnectorFactory, SchemaGenerator } from '../index-simple';

describe('Multi-tenant Cube.js Implementation', () => {
  let server: MultiTenantCubeServer;
  let connectorFactory: DatabaseConnectorFactory;
  let schemaGenerator: SchemaGenerator;

  beforeEach(() => {
    server = new MultiTenantCubeServer();
    connectorFactory = new DatabaseConnectorFactory();
    schemaGenerator = new SchemaGenerator();
  });

  test('should create multi-tenant cube server', () => {
    expect(server).toBeDefined();
    expect(server.getConfig()).toBeDefined();
  });

  test('should support multiple database types', () => {
    const supportedTypes = connectorFactory.getSupportedTypes();
    
    expect(supportedTypes).toContain('postgres');
    expect(supportedTypes).toContain('mysql');
    expect(supportedTypes).toContain('snowflake');
    expect(supportedTypes).toContain('bigquery');
    expect(supportedTypes).toContain('redshift');
    
    expect(connectorFactory.isSupported('postgres')).toBe(true);
    expect(connectorFactory.isSupported('oracle')).toBe(false);
  });

  test('should generate tenant-aware schema', async () => {
    const columns = [
      { name: 'id', type: 'integer' },
      { name: 'name', type: 'varchar' },
      { name: 'tenant_id', type: 'varchar' }
    ];

    const schema = await schemaGenerator.generateSchema('users', columns);
    
    expect(schema).toContain('cube(\'Users\'');
    expect(schema).toContain('tenant_id = \'${SECURITY_CONTEXT.tenantId}\'');
    expect(schema).toContain('id: {');
    expect(schema).toContain('name: {');
    expect(schema).not.toContain('tenantId: {'); // tenant_id should be filtered out
  });

  test('should handle query rewrite for tenant isolation', () => {
    const config = server.getConfig();
    const mockSecurityContext = {
      tenantId: 'test-tenant',
      roles: ['user'],
      permissions: ['read:own'],
      isAuthenticated: true
    };

    const originalQuery = {
      measures: ['Users.count'],
      dimensions: ['Users.name']
    };

    const rewrittenQuery = config.queryRewrite(originalQuery, { 
      securityContext: mockSecurityContext 
    });

    expect(rewrittenQuery.filters).toHaveLength(1);
    expect(rewrittenQuery.filters[0]).toEqual({
      member: 'tenant_id',
      operator: 'equals',
      values: ['test-tenant']
    });
  });

  test('should generate tenant-specific app ID', () => {
    const config = server.getConfig();
    const mockSecurityContext = {
      tenantId: 'tenant-123',
      roles: ['user'],
      permissions: ['read:own'],
      isAuthenticated: true
    };

    const appId = config.contextToAppId({ securityContext: mockSecurityContext });
    expect(appId).toBe('tenant-123');
  });

  test('should create database connectors', () => {
    const postgresConnector = connectorFactory.createConnector('postgres', {
      host: 'localhost',
      port: 5432,
      database: 'test'
    });

    expect(postgresConnector).toBeDefined();
    expect(postgresConnector.connect).toBeDefined();
    expect(postgresConnector.query).toBeDefined();
  });

  test('should handle unsupported database types', () => {
    expect(() => {
      connectorFactory.createConnector('unsupported', {});
    }).toThrow('Unsupported database type: unsupported');
  });

  test('should start server successfully', async () => {
    // This should not throw
    await expect(server.start(4000)).resolves.toBeUndefined();
  });
});