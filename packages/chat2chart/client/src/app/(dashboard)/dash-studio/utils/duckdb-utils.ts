// Mock DuckDB utility functions for in-browser analytics
// This provides sample data functionality without requiring DuckDB WASM

let mockData: any[] = [];

export const initDuckDB = async (): Promise<any> => {
  // Mock database initialization
  
  // Create sample data
  mockData = [
    { product: 'Product A', quarter: 'Q1', sales: 1000, region: 'North' },
    { product: 'Product B', quarter: 'Q1', sales: 1500, region: 'South' },
    { product: 'Product A', quarter: 'Q2', sales: 1200, region: 'North' },
    { product: 'Product B', quarter: 'Q2', sales: 1800, region: 'South' },
    { product: 'Product C', quarter: 'Q1', sales: 800, region: 'East' },
    { product: 'Product C', quarter: 'Q2', sales: 950, region: 'East' },
    { product: 'Product A', quarter: 'Q3', sales: 1100, region: 'North' },
    { product: 'Product B', quarter: 'Q3', sales: 1600, region: 'South' },
    { product: 'Product C', quarter: 'Q3', sales: 900, region: 'East' }
  ];
  
  return { mock: true, data: mockData };
};

export const executeQuery = async (database: any, sql: string): Promise<any[]> => {
  if (!database || !database.mock) {
    throw new Error('Mock database not initialized');
  }

  try {
    // Simple SQL parsing for demo purposes
    const sqlLower = sql.toLowerCase();
    
    if (sqlLower.includes('select * from sample_data')) {
      return mockData;
    }
    
    if (sqlLower.includes('group by product')) {
      // Mock aggregation query
      const grouped = mockData.reduce((acc: any, row) => {
        if (!acc[row.product]) {
          acc[row.product] = { product: row.product, total_sales: 0, count: 0 };
        }
        acc[row.product].total_sales += row.sales;
        acc[row.product].count += 1;
        return acc;
      }, {});
      
      return Object.values(grouped);
    }
    
    if (sqlLower.includes('group by region')) {
      // Mock pivot query
      const grouped = mockData.reduce((acc: any, row) => {
        if (!acc[row.region]) {
          acc[row.region] = { region: row.region, Q1_sales: 0, Q2_sales: 0, Q3_sales: 0 };
        }
        if (row.quarter === 'Q1') acc[row.region].Q1_sales += row.sales;
        if (row.quarter === 'Q2') acc[row.region].Q2_sales += row.sales;
        if (row.quarter === 'Q3') acc[row.region].Q3_sales += row.sales;
        return acc;
      }, {});
      
      return Object.values(grouped);
    }
    
    if (sqlLower.includes('group by quarter')) {
      // Mock time series query
      const grouped = mockData.reduce((acc: any, row) => {
        if (!acc[row.quarter]) {
          acc[row.quarter] = { quarter: row.quarter, total_sales: 0, count: 0 };
        }
        acc[row.quarter].total_sales += row.sales;
        acc[row.quarter].count += 1;
        return acc;
      }, {});
      
      return Object.values(grouped).sort((a: any, b: any) => a.quarter.localeCompare(b.quarter));
    }
    
    // Default: return all data
    return mockData;
    
  } catch (error) {
    console.error('Mock query execution failed:', error);
    throw error;
  }
};

export const getTableSchema = async (database: any, tableName: string): Promise<any[]> => {
  if (!database || !database.mock) {
    throw new Error('Mock database not initialized');
  }

  // Return mock schema
  return [
    { column: 'product', type: 'VARCHAR', null: 'YES', key: '', default: '', extra: '' },
    { column: 'quarter', type: 'VARCHAR', null: 'YES', key: '', default: '', extra: '' },
    { column: 'sales', type: 'INTEGER', null: 'YES', key: '', default: '', extra: '' },
    { column: 'region', type: 'VARCHAR', null: 'YES', key: '', default: '', extra: '' }
  ];
};

export const getTableNames = async (database: any): Promise<string[]> => {
  if (!database || !database.mock) {
    throw new Error('Mock database not initialized');
  }

  return ['sample_data'];
};

export const closeDatabase = async (): Promise<void> => {
  // Mock database close
  mockData = [];
};
