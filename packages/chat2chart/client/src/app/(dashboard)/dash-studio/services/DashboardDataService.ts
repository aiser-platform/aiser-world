/**
 * Dashboard Data Service
 * Real data integration for dashboard studio widgets
 */

import { enhancedDataService, QueryResult, DataSource, SchemaInfo } from '@/services/enhancedDataService';
import { dashboardAPIService } from './DashboardAPIService';

export interface WidgetDataConfig {
  dataSourceId: string;
  query: string;
  filters?: Array<{ field: string; op: string; value?: any; values?: any[]; from?: any; to?: any }>;
  refreshInterval?: number;
  autoRefresh?: boolean;
  cache?: boolean;
  cacheTimeout?: number;
}

export interface WidgetDataResult {
  success: boolean;
  data: any[];
  columns: string[];
  rowCount: number;
  executionTime: number;
  error?: string;
  lastUpdated: Date;
}

class DashboardDataService {
  private dataCache: Map<string, { data: any; timestamp: number; timeout: number }> = new Map();

  /**
   * Execute query for widget data
   */
  async executeWidgetQuery(config: WidgetDataConfig): Promise<WidgetDataResult> {
    const cacheKey = `${config.dataSourceId}:${config.query}`;
    
    // Check cache if enabled
    if (config.cache && this.dataCache.has(cacheKey)) {
      const cached = this.dataCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < cached.timeout) {
        return {
          success: true,
          data: cached.data.data,
          columns: cached.data.columns,
          rowCount: cached.data.row_count,
          executionTime: cached.data.execution_time,
          lastUpdated: new Date(cached.timestamp)
        };
      }
    }

    try {
      // Apply global filters by wrapping original query if provided
      const finalQuery = this.applyFiltersToQuery(config.query, config.filters);

      // Execute query using enhanced data service (multi-engine)
      const result: QueryResult = await enhancedDataService.executeMultiEngineQuery(
        finalQuery,
        config.dataSourceId
      );

      if (result.success) {
        // Cache result if enabled
        if (config.cache) {
          this.dataCache.set(cacheKey, {
            data: result,
            timestamp: Date.now(),
            timeout: config.cacheTimeout || 300000 // 5 minutes default
          });
        }

        return {
          success: true,
          data: result.data,
          columns: result.columns,
          rowCount: result.row_count,
          executionTime: result.execution_time,
          lastUpdated: new Date()
        };
      } else {
        return {
          success: false,
          data: [],
          columns: [],
          rowCount: 0,
          executionTime: 0,
          error: result.error,
          lastUpdated: new Date()
        };
      }
    } catch (error) {
      console.error('Widget query execution failed:', error);
      return {
        success: false,
        data: [],
        columns: [],
        rowCount: 0,
        executionTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastUpdated: new Date()
      };
    }
  }

  /**
   * Safely apply filters to SQL by wrapping the original query.
   * SELECT * FROM (original_query) AS q WHERE ...
   */
  private applyFiltersToQuery(originalQuery: string, filters?: Array<{ field: string; op: string; value?: any; values?: any[]; from?: any; to?: any }>): string {
    if (!filters || filters.length === 0) return originalQuery;

    const safeField = (f: string) => (/^[a-zA-Z0-9_\.]+$/.test(f) ? f : '');
    const sqlValue = (v: any) => {
      if (v === null || v === undefined) return 'NULL';
      if (typeof v === 'number') return String(v);
      if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
      // basic string escape
      const s = String(v).replace(/'/g, "''");
      return `'${s}'`;
    };

    const clauses: string[] = [];
    for (const f of filters) {
      const field = safeField(f.field || '');
      if (!field) continue;
      const op = (f.op || '=').toLowerCase();
      if (op === 'between' && f.from !== undefined && f.to !== undefined) {
        clauses.push(`${field} BETWEEN ${sqlValue(f.from)} AND ${sqlValue(f.to)}`);
      } else if ((op === 'in' || op === 'not in') && Array.isArray(f.values) && f.values.length > 0) {
        const list = f.values.map(sqlValue).join(', ');
        clauses.push(`${field} ${op.toUpperCase()} (${list})`);
      } else if (['=','!=','>','<','>=','<=','like','ilike'].includes(op) && f.value !== undefined) {
        clauses.push(`${field} ${op.toUpperCase()} ${sqlValue(f.value)}`);
      }
    }

    if (clauses.length === 0) return originalQuery;
    const where = clauses.join(' AND ');
    return `SELECT * FROM (${originalQuery}) AS q WHERE ${where}`;
  }

  /**
   * Get available data sources
   */
  async getDataSources(): Promise<DataSource[]> {
    try {
      const res = await enhancedDataService.listDataSources();
      return res.success ? (res.data_sources || []) : [];
    } catch (error) {
      console.error('Failed to get data sources:', error);
      return [];
    }
  }

  /**
   * Get schema information for a data source
   */
  async getDataSourceSchema(dataSourceId: string): Promise<SchemaInfo | null> {
    try {
      const res = await enhancedDataService.getDataSourceSchema(dataSourceId);
      if (res && (res as any).success && (res as any).schema) {
        return (res as any).schema as SchemaInfo;
      }
      return null;
    } catch (error) {
      console.error('Failed to get data source schema:', error);
      return null;
    }
  }

  /**
   * Test data source connection
   */
  async testDataSourceConnection(dataSourceId: string): Promise<boolean> {
    try {
      // Fallback: attempt fetching schema as a lightweight connectivity check
      const res = await enhancedDataService.getDataSource(dataSourceId);
      return !!res.success;
    } catch (error) {
      console.error('Failed to test data source connection:', error);
      return false;
    }
  }

  /**
   * Get sample data for a table
   */
  async getSampleData(dataSourceId: string, tableName: string, limit: number = 100): Promise<WidgetDataResult> {
    const query = `SELECT * FROM ${tableName} LIMIT ${limit}`;
    return this.executeWidgetQuery({
      dataSourceId,
      query,
      cache: true,
      cacheTimeout: 60000 // 1 minute cache for sample data
    });
  }

  /**
   * Generate chart data from query result
   */
  generateChartData(queryResult: WidgetDataResult, chartType: string, xAxis?: string, yAxis?: string) {
    if (!queryResult.success || queryResult.data.length === 0) {
      return { xAxis: [], yAxis: [] };
    }

    const data = queryResult.data;
    const columns = queryResult.columns;

    switch (chartType) {
      case 'bar':
      case 'line':
      case 'area':
        if (xAxis && yAxis && columns.includes(xAxis) && columns.includes(yAxis)) {
          return {
            xAxis: data.map(row => row[xAxis]),
            yAxis: data.map(row => row[yAxis])
          };
        }
        // Fallback to first two columns
        return {
          xAxis: data.map(row => row[columns[0]]),
          yAxis: data.map(row => row[columns[1]])
        };

      case 'pie':
      case 'doughnut':
        if (xAxis && yAxis && columns.includes(xAxis) && columns.includes(yAxis)) {
          return {
            series: data.map(row => ({
              name: row[xAxis],
              value: row[yAxis]
            }))
          };
        }
        // Fallback to first two columns
        return {
          series: data.map(row => ({
            name: row[columns[0]],
            value: row[columns[1]]
          }))
        };

      case 'scatter':
        if (xAxis && yAxis && columns.includes(xAxis) && columns.includes(yAxis)) {
          return {
            series: data.map(row => ({
              value: [row[xAxis], row[yAxis]],
              name: `${row[xAxis]}, ${row[yAxis]}`
            }))
          };
        }
        // Fallback to first two columns
        return {
          series: data.map(row => ({
            value: [row[columns[0]], row[columns[1]]],
            name: `${row[columns[0]]}, ${row[columns[1]]}`
          }))
        };

      default:
        return { xAxis: [], yAxis: [] };
    }
  }

  /**
   * Clear cache for a specific data source
   */
  clearCache(dataSourceId?: string) {
    if (dataSourceId) {
      // Clear cache for specific data source
      for (const [key] of this.dataCache) {
        if (key.startsWith(`${dataSourceId}:`)) {
          this.dataCache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.dataCache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.dataCache.size,
      keys: Array.from(this.dataCache.keys())
    };
  }
}

// Export singleton instance
export const dashboardDataService = new DashboardDataService();
