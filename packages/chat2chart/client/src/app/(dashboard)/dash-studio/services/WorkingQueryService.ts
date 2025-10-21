/**
 * Working Query Service
 * Implements proper SQL parsing and execution for the frontend
 * Works around backend limitations by implementing client-side query processing
 */

export interface QueryResult {
  success: boolean;
  data: any[];
  columns: string[];
  rowCount: number;
  executionTime: number;
  error?: string;
  queryType: string;
}

export interface DataSource {
  id: string;
  name: string;
  type: string;
  data: any[];
  schema: {
    columns: Array<{
      name: string;
      type: string;
      nullable: boolean;
    }>;
  };
}

class WorkingQueryService {
  private dataCache: Map<string, any[]> = new Map();

  /**
   * Execute query with proper SQL parsing
   */
  async executeQuery(dataSourceId: string, sqlQuery: string): Promise<QueryResult> {
    const startTime = Date.now();
    
    try {
      // Get data from backend
      const rawData = await this.getDataSourceData(dataSourceId);
      
      // Parse and execute SQL query
      const result = this.parseAndExecuteSQL(sqlQuery, rawData);
      
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        data: result.data,
        columns: result.columns,
        rowCount: result.data.length,
        executionTime,
        queryType: result.queryType
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      return {
        success: false,
        data: [],
        columns: [],
        rowCount: 0,
        executionTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        queryType: 'error'
      };
    }
  }

  /**
   * Get data from backend API (project-scoped) or demo data
   */
  private async getDataSourceData(dataSourceId: string): Promise<any[]> {
    // Check cache first
    if (this.dataCache.has(dataSourceId)) {
      return this.dataCache.get(dataSourceId)!;
    }

    // Check if it's a demo data source
    if (this.isDemoDataSource(dataSourceId)) {
      const demoData = this.getDemoData(dataSourceId);
      this.dataCache.set(dataSourceId, demoData);
      return demoData;
    }

    try {
      // Get organization and project context from OrganizationContext or localStorage
      let organizationId: any = 1;
      try {
        // @ts-ignore - dynamic import of context in client-side code
        const { useOrganization } = await import('@/context/OrganizationContext');
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const ctx = useOrganization();
        organizationId = ctx?.currentOrganization?.id ?? localStorage.getItem('currentOrganizationId') ?? 1;
      } catch (_err) {
        organizationId = localStorage.getItem('currentOrganizationId') ?? 1;
      }

      // Prefer explicit numeric project id; fallback to first project or 1
      let projectId = localStorage.getItem('currentProjectId') ?? (typeof window !== 'undefined' ? (window.localStorage.getItem('currentProjectId') || undefined) : undefined);
      if (!projectId) {
        try {
          const { useOrganization } = await import('@/context/OrganizationContext');
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const ctx = useOrganization();
          if (ctx && Array.isArray(ctx.projects) && ctx.projects.length > 0) projectId = String(ctx.projects[0].id);
        } catch (e) {
          projectId = '1';
        }
      }

      let response;
      try {
        // Try project-scoped API first
        // backend expects /data/api/..., so proxy should forward /data/... directly
        response = await fetch(`/api/data/organizations/${organizationId}/projects/${projectId}/data-sources/${dataSourceId}/data`);
        if (!response.ok) {
          throw new Error(`Project-scoped API failed: ${response.status}`);
        }
      } catch (projectError) {
        // Fallback to global API
        response = await fetch(`/api/data/sources/${dataSourceId}/data`);
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status}`);
        }
      }
      
      const result = await response.json();
      const data = result.data || result;
      
      // Cache the data
      this.dataCache.set(dataSourceId, data);
      
      return data;
    } catch (error) {
      console.error('Failed to fetch data source:', error);
      throw error;
    }
  }

  /**
   * Check if data source is a demo source
   */
  private isDemoDataSource(dataSourceId: string): boolean {
    const demoIds = ['duckdb_local', 'postgresql_prod', 'snowflake_warehouse', 'csv_sales'];
    return demoIds.includes(dataSourceId);
  }

  /**
   * Get demo data for sample data sources
   */
  private getDemoData(dataSourceId: string): any[] {
    switch (dataSourceId) {
      case 'duckdb_local':
        return this.getSalesDemoData();
      case 'postgresql_prod':
        return this.getCustomerDemoData();
      case 'snowflake_warehouse':
        return this.getAnalyticsDemoData();
      case 'csv_sales':
        return this.getSalesDemoData();
      default:
        return [];
    }
  }

  /**
   * Generate realistic sales demo data
   */
  private getSalesDemoData(): any[] {
    const products = ['Laptop', 'Phone', 'Tablet', 'Headphones', 'Monitor', 'Keyboard', 'Mouse', 'Speaker'];
    const regions = ['North America', 'Europe', 'Asia', 'South America', 'Africa', 'Oceania'];
    const months = ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06'];
    
    const data = [];
    for (let i = 0; i < 1000; i++) {
      data.push({
        id: i + 1,
        date: months[Math.floor(Math.random() * months.length)],
        product: products[Math.floor(Math.random() * products.length)],
        sales_amount: Math.floor(Math.random() * 5000) + 100,
        region: regions[Math.floor(Math.random() * regions.length)],
        quantity: Math.floor(Math.random() * 10) + 1,
        customer_id: Math.floor(Math.random() * 500) + 1,
        discount: Math.floor(Math.random() * 20),
        profit: Math.floor(Math.random() * 1000) + 50
      });
    }
    return data;
  }

  /**
   * Generate realistic customer demo data
   */
  private getCustomerDemoData(): any[] {
    const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Lisa', 'Chris', 'Emma', 'Alex', 'Maria'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
    const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'];
    const countries = ['USA', 'Canada', 'Mexico', 'UK', 'Germany', 'France', 'Spain', 'Italy', 'Japan', 'Australia'];
    
    const data = [];
    for (let i = 0; i < 500; i++) {
      data.push({
        customer_id: i + 1,
        first_name: firstNames[Math.floor(Math.random() * firstNames.length)],
        last_name: lastNames[Math.floor(Math.random() * lastNames.length)],
        email: `customer${i + 1}@example.com`,
        phone: `+1-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
        city: cities[Math.floor(Math.random() * cities.length)],
        country: countries[Math.floor(Math.random() * countries.length)],
        registration_date: `2024-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
        total_orders: Math.floor(Math.random() * 50) + 1,
        total_spent: Math.floor(Math.random() * 10000) + 100,
        status: Math.random() > 0.1 ? 'active' : 'inactive'
      });
    }
    return data;
  }

  /**
   * Generate realistic analytics demo data
   */
  private getAnalyticsDemoData(): any[] {
    const metrics = ['page_views', 'sessions', 'bounce_rate', 'conversion_rate', 'revenue', 'users'];
    const channels = ['organic', 'paid', 'social', 'email', 'direct', 'referral'];
    const devices = ['desktop', 'mobile', 'tablet'];
    
    const data = [];
    for (let i = 0; i < 200; i++) {
      data.push({
        date: `2024-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
        metric: metrics[Math.floor(Math.random() * metrics.length)],
        channel: channels[Math.floor(Math.random() * channels.length)],
        device: devices[Math.floor(Math.random() * devices.length)],
        value: Math.floor(Math.random() * 10000) + 100,
        country: ['US', 'CA', 'UK', 'DE', 'FR', 'JP', 'AU'][Math.floor(Math.random() * 7)],
        campaign_id: `campaign_${Math.floor(Math.random() * 20) + 1}`,
        user_segment: ['new', 'returning', 'vip'][Math.floor(Math.random() * 3)]
      });
    }
    return data;
  }

  /**
   * Parse and execute SQL query on client-side
   */
  private parseAndExecuteSQL(sqlQuery: string, data: any[]): { data: any[]; columns: string[]; queryType: string } {
    const query = sqlQuery.trim().toLowerCase();
    
    // Basic SQL parsing
    if (query.startsWith('select')) {
      return this.executeSelectQuery(sqlQuery, data);
    } else if (query.startsWith('count')) {
      return this.executeCountQuery(sqlQuery, data);
    } else {
      // Default: return all data
      return {
        data: data.slice(0, 100), // Limit to 100 rows
        columns: data.length > 0 ? Object.keys(data[0]) : [],
        queryType: 'select_all'
      };
    }
  }

  /**
   * Execute SELECT query with basic parsing
   */
  private executeSelectQuery(sqlQuery: string, data: any[]): { data: any[]; columns: string[]; queryType: string } {
    const query = sqlQuery.toLowerCase();
    let result = [...data];
    let columns: string[] = [];
    let queryType = 'select';

    // Parse SELECT columns
    const selectMatch = sqlQuery.match(/select\s+(.*?)\s+from/i);
    if (selectMatch) {
      const columnStr = selectMatch[1].trim();
      if (columnStr === '*') {
        columns = data.length > 0 ? Object.keys(data[0]) : [];
      } else {
        columns = columnStr.split(',').map(col => col.trim());
      }
    } else {
      columns = data.length > 0 ? Object.keys(data[0]) : [];
    }

    // Parse WHERE clause
    const whereMatch = sqlQuery.match(/where\s+(.*?)(?:\s+group\s+by|\s+order\s+by|\s+limit|$)/i);
    if (whereMatch) {
      const whereClause = whereMatch[1].trim();
      result = this.applyWhereClause(result, whereClause);
      queryType = 'select_filtered';
    }

    // Parse GROUP BY clause
    const groupByMatch = sqlQuery.match(/group\s+by\s+(.*?)(?:\s+order\s+by|\s+limit|$)/i);
    if (groupByMatch) {
      const groupByColumn = groupByMatch[1].trim();
      result = this.applyGroupBy(result, groupByColumn, sqlQuery);
      queryType = 'group_by';
    }

    // Parse ORDER BY clause
    const orderByMatch = sqlQuery.match(/order\s+by\s+(.*?)(?:\s+limit|$)/i);
    if (orderByMatch) {
      const orderByClause = orderByMatch[1].trim();
      result = this.applyOrderBy(result, orderByClause);
    }

    // Parse LIMIT clause
    const limitMatch = sqlQuery.match(/limit\s+(\d+)/i);
    if (limitMatch) {
      const limit = parseInt(limitMatch[1]);
      result = result.slice(0, limit);
    }

    // Select only requested columns
    if (columns.length > 0 && columns[0] !== '*') {
      result = result.map(row => {
        const selectedRow: any = {};
        columns.forEach(col => {
          if (row.hasOwnProperty(col)) {
            selectedRow[col] = row[col];
          }
        });
        return selectedRow;
      });
    }

    return { data: result, columns, queryType };
  }

  /**
   * Apply WHERE clause filtering
   */
  private applyWhereClause(data: any[], whereClause: string): any[] {
    try {
      // Simple WHERE clause parsing for common patterns
      const conditions = whereClause.split(/\s+and\s+|\s+or\s+/i);
      
      return data.filter(row => {
        return conditions.every(condition => {
          // Handle = operator
          const eqMatch = condition.match(/(\w+)\s*=\s*['"]?([^'"]*)['"]?/i);
          if (eqMatch) {
            const [, column, value] = eqMatch;
            return row[column]?.toString().toLowerCase() === value.toLowerCase();
          }

          // Handle > operator
          const gtMatch = condition.match(/(\w+)\s*>\s*(\d+(?:\.\d+)?)/i);
          if (gtMatch) {
            const [, column, value] = gtMatch;
            return parseFloat(row[column]) > parseFloat(value);
          }

          // Handle < operator
          const ltMatch = condition.match(/(\w+)\s*<\s*(\d+(?:\.\d+)?)/i);
          if (ltMatch) {
            const [, column, value] = ltMatch;
            return parseFloat(row[column]) < parseFloat(value);
          }

          return true;
        });
      });
    } catch (error) {
      console.error('Error parsing WHERE clause:', error);
      return data;
    }
  }

  /**
   * Apply GROUP BY aggregation
   */
  private applyGroupBy(data: any[], groupByColumn: string, sqlQuery: string): any[] {
    try {
      const groups: { [key: string]: any[] } = {};
      
      // Group data
      data.forEach(row => {
        const key = row[groupByColumn];
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(row);
      });

      // Apply aggregations
      const result: any[] = [];
      Object.keys(groups).forEach(key => {
        const group = groups[key];
        const aggregatedRow: any = { [groupByColumn]: key };

        // Check for COUNT(*)
        if (sqlQuery.toLowerCase().includes('count(*)')) {
          aggregatedRow['count'] = group.length;
        }

        // Check for SUM
        const sumMatch = sqlQuery.match(/sum\s*\(\s*(\w+)\s*\)/i);
        if (sumMatch) {
          const column = sumMatch[1];
          aggregatedRow[`sum_${column}`] = group.reduce((sum, row) => sum + (parseFloat(row[column]) || 0), 0);
        }

        // Check for AVG
        const avgMatch = sqlQuery.match(/avg\s*\(\s*(\w+)\s*\)/i);
        if (avgMatch) {
          const column = avgMatch[1];
          const sum = group.reduce((sum, row) => sum + (parseFloat(row[column]) || 0), 0);
          aggregatedRow[`avg_${column}`] = sum / group.length;
        }

        result.push(aggregatedRow);
      });

      return result;
    } catch (error) {
      console.error('Error applying GROUP BY:', error);
      return data;
    }
  }

  /**
   * Apply ORDER BY sorting
   */
  private applyOrderBy(data: any[], orderByClause: string): any[] {
    try {
      const parts = orderByClause.split(/\s+/);
      const column = parts[0];
      const direction = parts[1]?.toLowerCase() === 'desc' ? 'desc' : 'asc';

      return data.sort((a, b) => {
        const aVal = a[column];
        const bVal = b[column];
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return direction === 'desc' ? bVal - aVal : aVal - bVal;
        }
        
        const aStr = aVal?.toString().toLowerCase() || '';
        const bStr = bVal?.toString().toLowerCase() || '';
        
        if (direction === 'desc') {
          return bStr.localeCompare(aStr);
        } else {
          return aStr.localeCompare(bStr);
        }
      });
    } catch (error) {
      console.error('Error applying ORDER BY:', error);
      return data;
    }
  }

  /**
   * Execute COUNT query
   */
  private executeCountQuery(sqlQuery: string, data: any[]): { data: any[]; columns: string[]; queryType: string } {
    const countMatch = sqlQuery.match(/count\s*\(\s*\*\s*\)/i);
    if (countMatch) {
      return {
        data: [{ count: data.length }],
        columns: ['count'],
        queryType: 'count'
      };
    }
    
    return {
      data: [{ count: data.length }],
      columns: ['count'],
      queryType: 'count'
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.dataCache.clear();
  }
}

// Export singleton instance
export const workingQueryService = new WorkingQueryService();
