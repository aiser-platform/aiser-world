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
   * Get data from backend API (project-scoped)
   */
  private async getDataSourceData(dataSourceId: string): Promise<any[]> {
    // Check cache first
    if (this.dataCache.has(dataSourceId)) {
      return this.dataCache.get(dataSourceId)!;
    }

    try {
                 // Get organization and project context from URL or context
           const organizationId = 'aiser-dev-org'; // Real development organization
           const projectId = 'development-project'; // Real development project
      
      let response;
      try {
        // Try project-scoped API first
        response = await fetch(`http://localhost:8000/data/api/organizations/${organizationId}/projects/${projectId}/data-sources/${dataSourceId}/data`);
        if (!response.ok) {
          throw new Error(`Project-scoped API failed: ${response.status}`);
        }
      } catch (projectError) {
        console.log('Project-scoped API not available, falling back to global API');
        // Fallback to global API
        response = await fetch(`http://localhost:8000/data/sources/${dataSourceId}/data`);
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
