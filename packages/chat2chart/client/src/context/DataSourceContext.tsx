'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';

export interface DataSource {
  id: string;
  name: string;
  type: 'file' | 'database' | 'warehouse' | 'api' | 'cube';
  format?: string;
  db_type?: string;
  description?: string;
  connection_config?: Record<string, any>;
  connection_status?: 'connected' | 'failed' | 'unknown' | null;
  schema?: Record<string, any> | null;
  row_count?: number;
  size?: number;
  file_path?: string;
  original_filename?: string;
  sample_data?: any[];
  created_at?: string;
  updated_at?: string;
  last_accessed?: string;
  is_active?: boolean;
  user_id?: string;
  metadata?: Record<string, any>;
}

export interface SchemaInfo {
  tables?: Array<{
    name: string;
    schema?: string;
    columns: Array<{
      name: string;
      type: string;
      nullable: boolean;
      primary_key?: boolean;
      unique?: boolean;
      foreign_key?: string;
      default?: string;
    }>;
    rowCount?: number;
    description?: string;
  }>;
  views?: Array<{
    name: string;
    schema?: string;
    columns: Array<{
      name: string;
      type: string;
      nullable?: boolean;
    }>;
    description?: string;
  }>;
  schemas?: string[];
  cubes?: Array<{
    name: string;
    title: string;
    description?: string;
    dimensions: Array<{
      name: string;
      title: string;
      type: string;
      sql?: string;
    }>;
    measures: Array<{
      name: string;
      title: string;
      type: string;
      sql?: string;
      format?: string;
      shortTitle?: string;
    }>;
    segments?: Array<{
      name: string;
      title: string;
      sql: string;
    }>;
    preAggregations?: Array<{
      name: string;
      type: string;
      timeDimension?: string;
      granularity?: string;
    }>;
  }>;
  metadata?: {
    total_cubes?: number;
    total_dimensions?: number;
    total_measures?: number;
    has_time_dimensions?: boolean;
    has_pre_aggregations?: boolean;
  };
  database_info?: {
    name: string;
    type: string;
    host: string;
    port: number;
    username: string;
  };
  warning?: string;
  error?: string;
}

interface CreateDataSourceData {
  name: string;
  type: string;
  format?: string;
  description?: string;
  connection_config?: Record<string, any>;
}

interface DataSourceContextValue {
  // State
  dataSources: DataSource[];
  selectedDataSourceId: string | null;
  dataSourceSchemas: Map<string, SchemaInfo>; // Cache schemas by data source ID
  isLoading: boolean;
  isTestingConnection: boolean;
  lastError: string | null;

  // Actions
  loadDataSources: () => Promise<void>;
  selectDataSource: (dataSourceId: string) => Promise<void>; // Tests connection + loads schema
  createDataSource: (data: CreateDataSourceData) => Promise<DataSource>;
  deleteDataSource: (dataSourceId: string) => Promise<void>;
  refreshDataSources: () => Promise<void>;
  getSelectedDataSource: () => DataSource | null;
  getDataSourceSchema: (dataSourceId: string) => SchemaInfo | null;
}

const DataSourceContext = createContext<DataSourceContextValue | undefined>(undefined);

export function DataSourceProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const authenticatedFetch = useAuthenticatedFetch();
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [selectedDataSourceId, setSelectedDataSourceId] = useState<string | null>(null);
  const [dataSourceSchemas, setDataSourceSchemas] = useState<Map<string, SchemaInfo>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const accessToken = session?.access_token;

  // Load data sources (fast, no connection testing)
  const loadDataSources = async () => {
    setIsLoading(true);
    setLastError(null);

    try {
      const response = await authenticatedFetch('/api/data/sources', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load data sources: ${response.statusText}`);
      }
      const data = await response.json();

      const loadedDataSources: DataSource[] = (data.data_sources || []).map((ds: any) => ({
        id: ds.id,
        name: ds.name,
        type: ds.type,
        format: ds.format,
        db_type: ds.db_type,
        description: ds.description,
        connection_config: ds.connection_config,
        connection_status: ds.connection_status || null,
        schema: ds.schema || null,
        row_count: ds.row_count,
        size: ds.size,
        file_path: ds.file_path,
        original_filename: ds.original_filename,
        sample_data: ds.sample_data,
        created_at: ds.created_at,
        updated_at: ds.updated_at,
        last_accessed: ds.last_accessed,
        is_active: ds.is_active,
        user_id: ds.user_id,
        metadata: ds.metadata || {}
      }));

      // De-duplicate by id and by name (case-insensitive)
      const seenIds = new Set<string>();
      const seenNames = new Set<string>();
      const uniqueDataSources = loadedDataSources.filter((ds) => {
        const id = ds?.id;
        const nameKey = (ds?.name || '').toLowerCase();
        if (id && seenIds.has(id)) return false;
        if (nameKey && seenNames.has(nameKey)) return false;
        if (id) seenIds.add(id);
        if (nameKey) seenNames.add(nameKey);
        return true;
      });

      setDataSources(uniqueDataSources);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load data sources';
      setLastError(errorMessage);
      console.error('Failed to load data sources:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Select data source (tests connection + loads schema)
  const selectDataSource = async (dataSourceId: string) => {
    setIsTestingConnection(true);
    setLastError(null);

    try {
      const response = await authenticatedFetch(`/api/data/sources/${dataSourceId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load data source: ${response.statusText}`);
      }
      
      const data = await response.json();
      const dataSource: DataSource = data.data_source;

      // Update data source in list with connection status and schema
      setDataSources(prev => 
        prev.map(ds => ds.id === dataSourceId ? dataSource : ds)
      );

      // Cache schema if available
      if (dataSource.schema) {
        setDataSourceSchemas(prev => {
          const newMap = new Map(prev);
          newMap.set(dataSourceId, dataSource.schema as SchemaInfo);
          return newMap;
        });
      }

      setSelectedDataSourceId(dataSourceId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to data source';
      setLastError(errorMessage);
      console.error('Failed to select data source:', error);
      throw error;
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Create data source
  const createDataSource = async (data: CreateDataSourceData): Promise<DataSource> => {
    setIsLoading(true);
    setLastError(null);

    try {
      // Determine the endpoint based on type
      let endpoint = '/api/data/upload';
      let body: any = {};

      if (data.type === 'database' || data.type === 'warehouse') {
        endpoint = '/api/data/database/connect';
        body = {
          name: data.name,
          type: data.type,
          description: data.description,
          ...data.connection_config
        };
      } else if (data.type === 'file') {
        endpoint = '/api/data/upload';
        body = {
          name: data.name,
          description: data.description,
          ...data.connection_config
        };
      } else {
        throw new Error(`Unsupported data source type: ${data.type}`);
      }

      const response = await authenticatedFetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create data source: ${errorText}`);
      }

      const result = await response.json();
      const newDataSource: DataSource = result.data_source || result;

      // Add to data sources list (prepend to show newest first)
      setDataSources(prev => [newDataSource, ...prev]);

      return newDataSource;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create data source';
      setLastError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Delete data source
  const deleteDataSource = async (dataSourceId: string) => {
    try {
      const response = await authenticatedFetch(`/api/data/sources/${dataSourceId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete data source: ${response.statusText}`);
      }

      // Remove from data sources list
      setDataSources(prev => prev.filter(ds => ds.id !== dataSourceId));

      // Remove schema from cache
      setDataSourceSchemas(prev => {
        const newMap = new Map(prev);
        newMap.delete(dataSourceId);
        return newMap;
      });

      // If deleted data source was selected, clear selection
      if (selectedDataSourceId === dataSourceId) {
        setSelectedDataSourceId(null);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete data source';
      setLastError(errorMessage);
      console.error('Failed to delete data source:', error);
      throw error;
    }
  };

  // Refresh data sources
  const refreshDataSources = async () => {
    await loadDataSources();
  };

  // Get selected data source
  const getSelectedDataSource = (): DataSource | null => {
    if (!selectedDataSourceId) return null;
    return dataSources.find(ds => ds.id === selectedDataSourceId) || null;
  };

  // Get schema for a data source (from cache)
  const getDataSourceSchema = (dataSourceId: string): SchemaInfo | null => {
    return dataSourceSchemas.get(dataSourceId) || null;
  };

  // Initialize: Load data sources when authenticated
  useEffect(() => {
    if (accessToken && !isLoading) {
      loadDataSources();
    }
  }, [accessToken]); // Run when accessToken becomes available

  const value: DataSourceContextValue = {
    dataSources,
    selectedDataSourceId,
    dataSourceSchemas,
    isLoading,
    isTestingConnection,
    lastError,
    loadDataSources,
    selectDataSource,
    createDataSource,
    deleteDataSource,
    refreshDataSources,
    getSelectedDataSource,
    getDataSourceSchema
  };

  return (
    <DataSourceContext.Provider value={value}>
      {children}
    </DataSourceContext.Provider>
  );
}

export function useDataSources() {
  const context = useContext(DataSourceContext);
  if (context === undefined) {
    throw new Error('useDataSources must be used within DataSourceProvider');
  }
  return context;
}

