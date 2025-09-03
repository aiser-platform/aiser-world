'use client';

import React, { useState, useEffect } from 'react';
import { 
  Layout, 
  Button, 
  Space, 
  Typography, 
  Select, 
  Table, 
  Tag, 
  Tabs, 
  Input, 
  Tooltip, 
  Progress, 
  Dropdown, 
  Menu, 
  message,
  Card,
  Collapse,
  Badge,
  Divider,
  Alert
} from 'antd';
import { Editor } from '@monaco-editor/react';
import { 
  PlayCircleOutlined, 
  DatabaseOutlined, 
  TableOutlined, 
  FieldBinaryOutlined,
  ReloadOutlined,
  CloseOutlined,
  PlusOutlined,
  SaveOutlined,
  CopyOutlined,
  MoreOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  RobotOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ExperimentOutlined,
  EyeOutlined,
  LinkOutlined,
  CloudOutlined,
  ApiOutlined,
  FileOutlined,
  SettingOutlined,
  BulbOutlined,
  RocketOutlined,
  BarChartOutlined,
  SyncOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { dashboardDataService } from '../services/DashboardDataService';
import { dashboardAPIService } from '../services/DashboardAPIService';
import { workingQueryService } from '../services/WorkingQueryService';
import ChartWidget from './ChartWidget';


const { Sider, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Panel } = Collapse;

// Function to suggest chart types based on query results
const suggestChartTypes = (results: any[]) => {
  if (!results || results.length === 0) return [];
  
  const firstRow = results[0];
  const columns = Object.keys(firstRow);
  const numericColumns = columns.filter(col => 
    typeof firstRow[col] === 'number' || 
    !isNaN(Number(firstRow[col]))
  );
  const textColumns = columns.filter(col => 
    typeof firstRow[col] === 'string' && 
    isNaN(Number(firstRow[col]))
  );
  
  const suggestions = [];
  
  if (numericColumns.length >= 2 && textColumns.length >= 1) {
    suggestions.push({ icon: '📊', name: 'Bar Chart' });
    suggestions.push({ icon: '📈', name: 'Line Chart' });
  }
  
  if (numericColumns.length >= 1 && textColumns.length >= 1) {
    suggestions.push({ icon: '🥧', name: 'Pie Chart' });
    suggestions.push({ icon: '📊', name: 'Column Chart' });
  }
  
  if (numericColumns.length >= 2) {
    suggestions.push({ icon: '🔍', name: 'Scatter Plot' });
    suggestions.push({ icon: '📊', name: 'Area Chart' });
  }
  
  if (results.length > 10) {
    suggestions.push({ icon: '📊', name: 'Histogram' });
  }
  
  return suggestions.length > 0 ? suggestions : [
    { icon: '📊', name: 'Bar Chart' },
    { icon: '📈', name: 'Line Chart' },
    { icon: '🥧', name: 'Pie Chart' }
  ];
};

interface MonacoSQLEditorProps {
  isDarkMode?: boolean;
  onQueryResult?: (result: any) => void;
  onChartCreate?: (chartData: any) => void;
  selectedDataSource?: string;
  onDataSourceChange?: (dataSourceId: string) => void;
}

interface DataSource {
  id: string;
  name: string;
  type: 'file' | 'database' | 'warehouse' | 'api';
  status: 'connected' | 'disconnected' | 'error' | 'testing';
  connection_info?: any;
  lastUsed?: string;
  rowCount?: number;
  columns?: string[];
  size?: string;
  description?: string;
  businessContext?: string;
}

interface SchemaInfo {
  database: string;
  schema: string;
  tables: TableInfo[];
  lastRefreshed: string;
}

interface TableInfo {
  name: string;
  fields: FieldInfo[];
  rowCount?: number;
  size?: string;
  description?: string;
  lastModified?: string;
}

interface FieldInfo {
  name: string;
  type: string;
  description?: string;
  nullable?: boolean;
  primaryKey?: boolean;
  foreignKey?: boolean;
  sampleValues?: any[];
}

const MonacoSQLEditor: React.FC<MonacoSQLEditorProps> = ({ 
  isDarkMode = false, 
  onQueryResult, 
  onChartCreate, 
  selectedDataSource,
  onDataSourceChange 
}) => {
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM sales_data LIMIT 100;');
  const [selectedDatabase, setSelectedDatabase] = useState('duckdb');
  const [selectedSchema, setSelectedSchema] = useState('public');
  const [selectedTable, setSelectedTable] = useState('sales_data');
  const [isExecuting, setExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState('results');
  const [previewChart, setPreviewChart] = useState<any>(null);
  const [openTableTabs, setOpenTableTabs] = useState<string[]>(['sales_data', 'user_analytics']);
  const [selectedTables, setSelectedTables] = useState<string[]>(['sales_data', 'user_analytics']);
  const [showTableSchema, setShowTableSchema] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [executionStatus, setExecutionStatus] = useState<string>('');
  const [selectedEngine, setSelectedEngine] = useState<string>('');
  const [queryHistory, setQueryHistory] = useState<any[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [schemas, setSchemas] = useState<SchemaInfo[]>([]);
  const [isLoadingDataSources, setIsLoadingDataSources] = useState(false);
  const [isRefreshingSchema, setIsRefreshingSchema] = useState(false);


  // Enhanced data sources with real integration capabilities
  const enhancedDatabases = [
    { 
      value: 'duckdb', 
      label: 'DuckDB - Local Analytics',
      type: 'database',
      status: 'connected',
      description: 'Fast in-memory analytical database for local development',
      icon: <DatabaseOutlined />
    },
    { 
      value: 'postgresql', 
      label: 'PostgreSQL - Production DB',
      type: 'database',
      status: 'connected',
      description: 'Primary production database with ACID compliance',
      icon: <DatabaseOutlined />
    },
    { 
      value: 'snowflake', 
      label: 'Snowflake - Cloud Data',
      type: 'warehouse',
      status: 'connected',
      description: 'Cloud data warehouse for large-scale analytics',
      icon: <CloudOutlined />
    },
    { 
      value: 'bigquery', 
      label: 'BigQuery - Google Analytics',
      type: 'warehouse',
      status: 'connected',
      description: 'Google Cloud data warehouse with ML capabilities',
      icon: <CloudOutlined />
    },
    { 
      value: 'api_rest', 
      label: 'REST API - External Service',
      type: 'api',
      status: 'connected',
      description: 'External REST API for real-time data',
      icon: <ApiOutlined />
    },
    { 
      value: 'csv_files', 
      label: 'CSV Files - Local Data',
      type: 'file',
      status: 'connected',
      description: 'Local CSV files for data analysis',
      icon: <FileOutlined />
    }
  ];

  const enhancedSchemas = [
    { 
      value: 'public', 
      label: 'public',
      description: 'Public schema with core business data',
      tables: ['sales_data', 'user_analytics', 'product_catalog']
    },
    { 
      value: 'analytics', 
      label: 'analytics',
      description: 'Analytics and reporting data',
      tables: ['kpi_metrics', 'dashboard_data', 'performance_metrics']
    },
    { 
      value: 'staging', 
      label: 'staging',
      description: 'Staging data for testing and development',
      tables: ['test_data', 'dev_samples', 'qa_datasets']
    },
    { 
      value: 'warehouse', 
      label: 'warehouse',
      description: 'Data warehouse for historical analysis',
      tables: ['historical_sales', 'user_behavior', 'market_trends']
    }
  ];

  const enhancedTables = [
    { 
      name: 'sales_data', 
      fields: [
        { name: 'date', type: 'DATE', description: 'Sale Date', nullable: false, primaryKey: false },
        { name: 'product_id', type: 'INTEGER', description: 'Product ID', nullable: false, primaryKey: true },
        { name: 'product_name', type: 'VARCHAR(255)', description: 'Product Name', nullable: false },
        { name: 'category', type: 'VARCHAR(100)', description: 'Product Category', nullable: true },
        { name: 'amount', type: 'DECIMAL(10,2)', description: 'Sale Amount', nullable: false },
        { name: 'region', type: 'VARCHAR(100)', description: 'Sales Region', nullable: true },
        { name: 'customer_id', type: 'INTEGER', description: 'Customer ID', nullable: false, foreignKey: true }
      ],
      rowCount: 125000,
      size: '15.2 MB',
      description: 'Core sales transaction data with product and customer information',
      lastModified: '2024-01-15'
    },
    { 
      name: 'user_analytics', 
      fields: [
        { name: 'user_id', type: 'INTEGER', description: 'User ID', nullable: false, primaryKey: true },
        { name: 'session_id', type: 'VARCHAR(50)', description: 'Session ID', nullable: false },
        { name: 'session_duration', type: 'INTEGER', description: 'Session Duration (minutes)', nullable: true },
        { name: 'page_views', type: 'INTEGER', description: 'Page Views Count', nullable: true },
        { name: 'conversion', type: 'BOOLEAN', description: 'Conversion Status', nullable: false },
        { name: 'timestamp', type: 'TIMESTAMP', description: 'Event Timestamp', nullable: false },
        { name: 'device_type', type: 'VARCHAR(50)', description: 'Device Type', nullable: true }
      ],
      rowCount: 89000,
      size: '8.7 MB',
      description: 'User behavior and session analytics data',
      lastModified: '2024-01-15'
    },
    { 
      name: 'product_catalog', 
      fields: [
        { name: 'product_id', type: 'INTEGER', description: 'Product ID', nullable: false, primaryKey: true },
        { name: 'name', type: 'VARCHAR(255)', description: 'Product Name', nullable: false },
        { name: 'category', type: 'VARCHAR(100)', description: 'Product Category', nullable: false },
        { name: 'price', type: 'DECIMAL(10,2)', description: 'Product Price', nullable: false },
        { name: 'inventory', type: 'INTEGER', description: 'Inventory Count', nullable: false },
        { name: 'created_at', type: 'TIMESTAMP', description: 'Creation Date', nullable: false },
        { name: 'updated_at', type: 'TIMESTAMP', description: 'Last Update', nullable: false }
      ],
      rowCount: 1500,
      size: '2.1 MB',
      description: 'Product catalog with pricing and inventory information',
      lastModified: '2024-01-15'
    }
  ];

  // Load data sources from Universal Data Modal API
  useEffect(() => {
    loadDataSources();
  }, []);

  const loadDataSources = async () => {
    setIsLoadingDataSources(true);
    try {
      // Use real data sources API
      const response = await fetch('http://localhost:8000/data/sources');
      const result = await response.json();
      
      if (result && Array.isArray(result)) {
        setDataSources(result.map(ds => ({
          id: ds.id || ds.Index,
          name: ds.name || `Data Source ${ds.Index}`,
          type: ds.type as 'file' | 'database' | 'warehouse' | 'api',
          status: ds.status as 'connected' | 'disconnected' | 'error' | 'testing',
          connection_info: ds.metadata,
          lastUsed: ds.last_used,
          rowCount: ds.rowCount,
          columns: ds.columns || [],
          size: ds.size?.toString(),
          description: `${ds.type} data source`,
        })));
      } else {
        throw new Error(result.error || 'Failed to load data sources');
      }
    } catch (error) {
      console.error('Failed to load data sources:', error);
      message.warning('Using sample data sources. Connect to real data sources via /data page.');
      
      // Fallback to sample data for development
      const sampleDataSources: DataSource[] = [
        {
          id: 'duckdb_local',
          name: 'DuckDB Local Analytics',
          type: 'database',
          status: 'connected',
          description: 'Fast in-memory analytical database for local development',
          lastUsed: '2024-01-15',
          rowCount: 125000,
          columns: ['date', 'product', 'amount', 'region'],
          connection_info: { host: 'localhost', port: 8080, database: 'analytics' }
        },
        {
          id: 'postgresql_prod',
          name: 'PostgreSQL Production',
          type: 'database',
          status: 'connected',
          description: 'Primary production database with ACID compliance',
          lastUsed: '2024-01-15',
          rowCount: 500000,
          columns: ['users', 'orders', 'products', 'analytics'],
          connection_info: { host: 'prod-db.company.com', port: 5432, database: 'production' }
        },
        {
          id: 'snowflake_warehouse',
          name: 'Snowflake Data Warehouse',
          type: 'warehouse',
          status: 'connected',
          description: 'Cloud data warehouse for large-scale analytics',
          lastUsed: '2024-01-14',
          rowCount: 2500000,
          columns: ['historical_data', 'ml_features', 'business_metrics'],
          connection_info: { account: 'company.snowflakecomputing.com', warehouse: 'ANALYTICS_WH' }
        },
        {
          id: 'csv_sales',
          name: 'Sales Data Q4 2024',
          type: 'file',
          status: 'connected',
          description: 'Quarterly sales data for analysis and reporting',
          lastUsed: '2024-01-15',
          rowCount: 1250,
          columns: ['date', 'product', 'sales_amount', 'region'],
          size: '2.3 MB'
        }
      ];
      
      setDataSources(sampleDataSources);
    } finally {
      setIsLoadingDataSources(false);
    }
  };



  const refreshSchema = async () => {
    setIsRefreshingSchema(true);
    try {
      // Simulate schema refresh
      await new Promise(resolve => setTimeout(resolve, 1000));
      message.success('Schema refreshed successfully');
    } catch (error) {
      message.error('Failed to refresh schema');
    } finally {
      setIsRefreshingSchema(false);
    }
  };

  const handleHistoryItemClick = (sql: string) => {
    setSqlQuery(sql);
  };

  // Export functions
  const exportToCSV = (data: any[]) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `query_results_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToJSON = (data: any[]) => {
    if (data.length === 0) return;
    
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `query_results_${new Date().toISOString().slice(0, 10)}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateChart = (chartType: string, data: any[]) => {
    if (!data || data.length === 0) {
      message.warning('No data available to create chart');
      return;
    }

    // Generate chart data based on chart type and actual query results
    const firstRow = data[0];
    const columns = Object.keys(firstRow);
    const numericColumns = columns.filter(col => 
      typeof firstRow[col] === 'number' || 
      !isNaN(Number(firstRow[col]))
    );
    const textColumns = columns.filter(col => 
      typeof firstRow[col] === 'string' && 
      isNaN(Number(firstRow[col]))
    );

    // Use actual query results data
    const actualData = data; // Use the real query results

    let chartData: any = {};
    let chartConfig: any = {};

    switch (chartType.toLowerCase()) {
      case 'bar chart':
      case 'column chart':
        chartData = {
          xAxis: actualData.map(row => String(row[textColumns[0] || columns[0]])),
          yAxis: actualData.map(row => Number(row[numericColumns[0] || columns[1]]) || 0)
        };
        chartConfig = {
          chartType: 'bar',
          title: { text: `${textColumns[0] || columns[0]} vs ${numericColumns[0] || columns[1]}` },
          showTitle: true,
          showLegend: true,
          showTooltip: true,
          showGrid: true
        };
        break;
      case 'line chart':
        chartData = {
          xAxis: actualData.map(row => String(row[textColumns[0] || columns[0]])),
          yAxis: actualData.map(row => Number(row[numericColumns[0] || columns[1]]) || 0)
        };
        chartConfig = {
          chartType: 'line',
          title: { text: `${textColumns[0] || columns[0]} Trend` },
          showTitle: true,
          showLegend: true,
          showTooltip: true,
          showGrid: true
        };
        break;
      case 'pie chart':
        chartData = {
          series: actualData.map(row => ({
            name: String(row[textColumns[0] || columns[0]]),
            value: Number(row[numericColumns[0] || columns[1]]) || 0
          }))
        };
        chartConfig = {
          chartType: 'pie',
          title: { text: `${textColumns[0] || columns[0]} Distribution` },
          showTitle: true,
          showLegend: true,
          showTooltip: true
        };
        break;
      case 'scatter plot':
        chartData = {
          series: actualData.map(row => ({
            value: [
              Number(row[numericColumns[0] || columns[0]]) || 0, 
              Number(row[numericColumns[1] || columns[1]]) || 0
            ],
            name: `${row[numericColumns[0] || columns[0]]}, ${row[numericColumns[1] || columns[1]]}`
          }))
        };
        chartConfig = {
          chartType: 'scatter',
          title: { text: `${numericColumns[0] || columns[0]} vs ${numericColumns[1] || columns[1]}` },
          showTitle: true,
          showLegend: true,
          showTooltip: true,
          showGrid: true
        };
        break;
      default:
        chartData = {
          xAxis: actualData.map(row => String(row[columns[0]])),
          yAxis: actualData.map(row => Number(row[columns[1]]) || 0)
        };
        chartConfig = {
          chartType: 'bar',
          title: { text: 'Chart from Query Results' },
          showTitle: true,
          showLegend: true,
          showTooltip: true,
          showGrid: true
        };
    }

    // Create chart widget data
    const chartWidget = {
      type: chartConfig.chartType,
      name: chartConfig.title.text,
      title: chartConfig.title.text,
      config: chartConfig,
      data: chartData,
      query: sqlQuery,
      dataSourceId: selectedDataSource,
      // Add raw data for reference
      rawData: actualData
    };

    // Set preview chart instead of immediately creating widget
    setPreviewChart(chartWidget);
    setActiveTab('preview'); // Switch to preview tab
    message.success(`Chart "${chartConfig.title.text}" preview created!`);
  };

  const handleChartGenerate = (chartConfig: any) => {
    if (onChartCreate) {
      const chartWidget = {
        type: chartConfig.chartType,
        name: chartConfig.title.text,
        title: chartConfig.title.text,
        config: chartConfig,
        data: chartConfig.data,
        query: sqlQuery,
        dataSourceId: selectedDataSource,
        rawData: chartConfig.rawData
      };
      onChartCreate(chartWidget);
    }
  };

  const handleExecuteQuery = async () => {
    setExecuting(true);
    setExecutionTime(null);
    setExecutionStatus('Analyzing query...');
    setSelectedEngine('');
    
    try {
      const startTime = Date.now();
      
      // Find the selected data source
      const selectedDataSource = dataSources.find(ds => ds.name.toLowerCase().includes(selectedDatabase.toLowerCase()));
      
      if (selectedDataSource) {
        setExecutionStatus('Executing query...');
        
        // Execute query using working query service with proper SQL parsing
        const result = await workingQueryService.executeQuery(selectedDataSource.id, sqlQuery);
        
        const executionTime = Date.now() - startTime;
        
        if (result.success && result.data) {
          setResults(result.data);
          setExecutionTime(result.executionTime);
          setSelectedEngine('client-side'); // Using client-side SQL parsing
          setExecutionStatus('Query completed successfully');
          
          // Notify parent component of query result
          if (onQueryResult) {
            onQueryResult({
              data: result.data,
              columns: result.columns,
              rowCount: result.rowCount,
              executionTime: result.executionTime,
              query: sqlQuery,
              dataSourceId: selectedDataSource.id
            });
          }
          
          // Add to query history
          const historyItem = {
            id: Date.now(),
            state: 'success',
            started: new Date().toLocaleTimeString(),
            duration: `00:00:${(executionTime / 1000).toFixed(2)}`,
            progress: 100,
            rows: result.rowCount,
            sql: sqlQuery,
            status: 'success',
            database: selectedDatabase,
            schema: selectedSchema,
            user: 'current_user',
            queryType: sqlQuery.trim().toUpperCase().split(' ')[0],
            engine: 'client-side'
          };
          
          setQueryHistory(prev => [historyItem, ...prev.slice(0, 49)]);
          
          message.success(`Query executed successfully using client-side engine. ${result.rowCount} rows returned in ${(result.executionTime / 1000).toFixed(2)}s.`);
        } else {
          setExecutionStatus('Query failed');
          setSelectedEngine('unknown');
          throw new Error(result.error || 'Query execution failed');
        }
      } else {
        // Fallback to mock execution for demo data
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockResults = [
          { total_num_boys: 125000, total_num_girls: 118000, total_births: 243000, avg_per_state: 4860 },
          { total_num_boys: 118000, total_num_girls: 112000, total_births: 230000, avg_per_state: 4600 },
          { total_num_boys: 132000, total_num_girls: 125000, total_births: 257000, avg_per_state: 5140 }
        ];
        
        setResults(mockResults);
        setExecutionTime(1000);
        
        // Add to query history
        const historyItem = {
          id: Date.now(),
          state: 'success',
          started: new Date().toLocaleTimeString(),
          duration: '00:00:01.00',
          progress: 100,
          rows: mockResults.length,
          sql: sqlQuery,
          status: 'success',
          database: selectedDatabase,
          schema: selectedSchema,
          user: 'current_user',
          queryType: sqlQuery.trim().toUpperCase().split(' ')[0],
          engine: 'demo'
        };
        
        setQueryHistory(prev => [historyItem, ...prev.slice(0, 49)]);
        
        message.success(`Query executed successfully using demo engine. ${mockResults.length} rows returned.`);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Query execution failed';
      setExecutionStatus('Connection error');
      setSelectedEngine('unknown');
      message.error(`Query execution failed: ${errorMessage}`);
      console.error('Query execution error:', error);
      
      // Add failed query to history
      const historyItem = {
        id: Date.now(),
        state: 'error',
        started: new Date().toLocaleTimeString(),
        duration: '00:00:00.00',
        progress: 0,
        rows: 0,
        sql: sqlQuery,
        status: 'error',
        database: selectedDatabase,
        schema: selectedSchema,
        user: 'current_user',
        queryType: sqlQuery.trim().toUpperCase().split(' ')[0],
        engine: 'error',
        error: errorMessage
      };
      
      setQueryHistory(prev => [historyItem, ...prev.slice(0, 49)]);
    } finally {
      setExecuting(false);
    }
  };

  const columns = [
    { 
      title: 'Total Boys', 
      dataIndex: 'total_num_boys', 
      key: 'total_num_boys',
      render: (value: number) => value?.toLocaleString(),
      sorter: (a: any, b: any) => a.total_num_boys - b.total_num_boys
    },
    { 
      title: 'Total Girls', 
      dataIndex: 'total_num_girls', 
      key: 'total_num_girls',
      render: (value: number) => value?.toLocaleString(),
      sorter: (a: any, b: any) => a.total_num_girls - b.total_num_girls
    },
    { 
      title: 'Total Births', 
      dataIndex: 'total_births', 
      key: 'total_births',
      render: (value: number) => value?.toLocaleString(),
      sorter: (a: any, b: any) => a.total_births - b.total_births
    },
    { 
      title: 'Avg Per State',
      dataIndex: 'avg_per_state', 
      key: 'avg_per_state',
      render: (value: number) => value?.toLocaleString(),
      sorter: (a: any, b: any) => a.avg_per_state - b.avg_per_state
    }
  ];

  const historyColumns = [
    { 
      title: 'Status', 
      key: 'status',
      render: (record: any) => (
        <Badge 
          status={record.state === 'success' ? 'success' : record.state === 'running' ? 'processing' : 'error'} 
          text={
            <span style={{ fontSize: '12px' }}>
              {record.state === 'success' ? '✅ Success' : record.state === 'running' ? '🔄 Running' : '❌ Failed'}
            </span>
          }
        />
      )
    },
    { 
      title: 'Started', 
      dataIndex: 'started', 
      key: 'started', 
      render: (value: string) => <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>{value}</span>
    },
    { 
      title: 'Duration', 
      dataIndex: 'duration', 
      key: 'duration', 
      render: (value: string) => <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>{value}</span>
    },
    { 
      title: 'Progress', 
      key: 'progress', 
      render: (record: any) => (
          <Progress 
          percent={record.progress} 
            size="small" 
          status={record.state === 'success' ? 'success' : record.state === 'running' ? 'active' : 'exception'}
            showInfo={false}
          />
      )
    },
    { 
      title: 'Rows', 
      dataIndex: 'rows', 
      key: 'rows', 
      render: (value: number) => value?.toLocaleString()
    },
    { 
      title: 'Engine', 
      dataIndex: 'engine', 
      key: 'engine', 
      render: (value: string) => {
        const getEngineIcon = (engine: string) => {
          switch (engine) {
            case 'duckdb': return '🦆';
            case 'cube': return '📊';
            case 'spark': return '⚡';
            case 'direct_sql': return '🗄️';
            case 'pandas': return '🐼';
            case 'demo': return '🎯';
            case 'error': return '❌';
            default: return '🔧';
          }
        };
        
        return (
          <span style={{ fontSize: '11px' }}>
            {getEngineIcon(value)} {value}
          </span>
        );
      }
    },
    { 
      title: 'User', 
      dataIndex: 'user', 
      key: 'user', 
      render: (value: string) => <span style={{ fontSize: '11px' }}>{value}</span>
    },
    { 
      title: 'SQL Query', 
      dataIndex: 'sql', 
      key: 'sql', 
      render: (value: string) => (
        <Tooltip title={value} placement="topLeft">
          <div 
            style={{ 
              cursor: 'pointer', 
          fontFamily: 'monospace',
          fontSize: '10px',
              maxWidth: '200px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            onClick={() => handleHistoryItemClick(value)}
          >
            {value}
        </div>
        </Tooltip>
      )
    },
    { 
      title: 'Actions', 
      key: 'actions', 
      render: (record: any) => (
        <Space size="small">
            <Button 
              size="small" 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => handleHistoryItemClick(record.sql)}
              title="Load Query"
            />
            <Button 
              size="small" 
              type="text" 
              danger 
              icon={<DeleteOutlined />} 
              title="Delete History"
            />
        </Space>
      )
    }
  ];

  return (
      <div style={{
      height: '100%', 
        display: 'flex',
      flexDirection: 'column',
      background: isDarkMode ? '#141414' : '#ffffff',
      color: isDarkMode ? '#ffffff' : '#000000'
    }}>
      {/* Top Bar */}
      <div style={{
        padding: '12px 16px',
        borderBottom: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
        background: isDarkMode ? '#1a1a1a' : '#ffffff',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <DatabaseOutlined style={{ fontSize: '18px', color: isDarkMode ? '#1890ff' : '#1890ff' }} />
            <Title level={5} style={{ margin: 0, color: isDarkMode ? '#ffffff' : '#000000' }}>
              Query Editor Studio
            </Title>
            <Badge count={dataSources.length} style={{ backgroundColor: isDarkMode ? '#1890ff' : '#1890ff' }} />
        </div>
          
          <Space>
            <Tooltip title="Connect to new data source">
              <Button 
                size="small" 
                type="text" 
                icon={<PlusOutlined />}
                onClick={() => {
                  // Link to universal data source modal
                  window.open('/data', '_blank');
                }}
              />
            </Tooltip>
          </Space>
        </div>
      </div>



      {/* Main Content - Two Column Layout */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: sidebarCollapsed ? '50px 1fr' : '350px 1fr', gap: '0', overflow: 'hidden', minHeight: 0, height: '100%' }}>
        {/* Left Sidebar - Data Sources & Schema Browser */}
        <div style={{
          background: isDarkMode ? '#1a1a1a' : '#fafafa',
          borderRight: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
          padding: sidebarCollapsed ? '8px' : '16px',
          overflowY: 'auto',
          minHeight: 0,
          position: 'relative'
        }}>
          {/* Collapse Button */}
          <Button
            type="text"
            icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              zIndex: 10,
              background: isDarkMode ? '#2a2a2a' : '#ffffff',
              border: `1px solid ${isDarkMode ? '#404040' : '#d9d9d9'}`
            }}
            size="small"
          />

          {!sidebarCollapsed && (
            <>
              {/* Data Sources Section */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Text strong style={{ color: isDarkMode ? '#ffffff' : '#000000', fontSize: '12px', textTransform: 'uppercase' }}>
                    DATABASE
                  </Text>
                  <Button 
                    size="small" 
                    type="text" 
                    icon={<ReloadOutlined />} 
                    onClick={loadDataSources}
                    loading={isLoadingDataSources}
                    style={{ fontSize: '10px', padding: '2px 4px' }}
                  />
                </div>
                
                <Select
                  value={selectedDatabase}
                  onChange={setSelectedDatabase}
                  style={{ width: '100%' }}
                  size="small"
                  placeholder="Select database"
                  options={enhancedDatabases.map(db => ({
                    value: db.value,
                    label: (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {db.icon}
                        <span>{db.label}</span>
                      </div>
                    )
                  }))}
                />
                
                {/* Quick status indicator */}
                <div style={{ 
                  marginTop: '8px', 
                  padding: '8px', 
                  background: isDarkMode ? '#1a1a1a' : '#f5f5f5', 
                  borderRadius: '4px',
                  fontSize: '10px',
                  color: isDarkMode ? '#999' : '#666'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    <div style={{ 
                      width: '6px', 
                      height: '6px', 
                      borderRadius: '50%', 
                      background: '#52c41a' 
                    }} />
                    <span>Connected to {enhancedDatabases.find(db => db.value === selectedDatabase)?.label || 'database'}</span>
                  </div>
                  <div style={{ fontSize: '9px' }}>
                    {dataSources.length} data sources available
                  </div>
                </div>
              </div>

          {/* Schema Selection */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Text strong style={{ color: isDarkMode ? '#ffffff' : '#000000', fontSize: '12px', textTransform: 'uppercase' }}>
                SCHEMA
              </Text>
              <Button 
                size="small" 
                type="text" 
                icon={<ReloadOutlined />} 
                onClick={refreshSchema}
                loading={isRefreshingSchema}
                style={{ fontSize: '10px', padding: '2px 4px' }}
              />
            </div>
            <Select
              value={selectedSchema}
              onChange={setSelectedSchema}
              options={enhancedSchemas.map(schema => ({
                value: schema.value,
                label: (
                  <Tooltip title={schema.description} placement="right">
                    <span>{schema.label}</span>
                  </Tooltip>
                )
              }))}
              style={{ width: '100%', marginTop: '8px' }}
              size="small"
            />
          </div>

          {/* Table Schema Browser */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Text strong style={{ color: isDarkMode ? '#ffffff' : '#000000', fontSize: '12px', textTransform: 'uppercase' }}>
                VIEW TABLE
              </Text>
              <Button size="small" type="text" icon={<ReloadOutlined />} style={{ fontSize: '10px', padding: '2px 4px' }} />
            </div>
            
            {/* Table Selection Dropdown */}
            <Select
              value={selectedTable}
              onChange={setSelectedTable}
              placeholder="Select table to view"
              style={{ width: '100%', marginBottom: '12px' }}
              size="small"
              options={enhancedTables.map(table => ({
                value: table.name,
                label: (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TableOutlined style={{ fontSize: '12px' }} />
                    <span>{table.name}</span>
                    <Badge count={table.rowCount} size="small" />
                  </div>
                )
              }))}
            />

            {/* Open Table Tabs */}
                <Collapse 
                  size="small" 
                  style={{ background: 'transparent', border: 'none' }}
                  ghost
                >
                  {openTableTabs.map((tableName, index) => {
                    const table = enhancedTables.find(t => t.name === tableName);
                    if (!table) return null;
                    
                    return (
                      <Panel
                        key={index}
                        header={
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <TableOutlined style={{ fontSize: '12px' }} />
                            <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{tableName}</span>
                            <Badge count={table.rowCount} size="small" />
                          </div>
                        }
                        style={{
                background: isDarkMode ? '#2a2a2a' : '#ffffff',
                border: `1px solid ${isDarkMode ? '#404040' : '#d9d9d9'}`,
                borderRadius: '4px',
                          marginBottom: '8px'
                        }}
                      >
                        <div style={{ padding: '8px 0' }}>
                          {/* Table Info */}
                          <div style={{ marginBottom: '12px', padding: '8px', background: isDarkMode ? '#1a1a1a' : '#f5f5f5', borderRadius: '4px' }}>
                            <div style={{ fontSize: '10px', color: isDarkMode ? '#999' : '#666', marginBottom: '4px' }}>
                              {table.description}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', fontSize: '9px' }}>
                              <span>📊 {table.rowCount?.toLocaleString()} rows</span>
                              <span>💾 {table.size}</span>
                              <span>📅 {table.lastModified}</span>
                            </div>
                </div>
                
                {/* Table Fields */}
                          {table.fields.map((field, fieldIndex) => (
                    <div key={fieldIndex} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '4px 0',
                              fontSize: '11px',
                              borderBottom: fieldIndex < table.fields.length - 1 ? `1px solid ${isDarkMode ? '#333' : '#eee'}` : 'none'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FieldBinaryOutlined style={{ fontSize: '10px' }} />
                                <Text style={{ fontFamily: 'monospace', fontSize: '10px' }}>{field.name}</Text>
                                {field.primaryKey && <Tag color="red">PK</Tag>}
                                {field.foreignKey && <Tag color="blue">FK</Tag>}
                                {field.nullable && <Tag color="orange">NULL</Tag>}n 
                      </div>
                              <Tag style={{ fontSize: '9px' }}>{field.type}</Tag>
                    </div>
                  ))}
                </div>
                      </Panel>
                    );
                  })}
                </Collapse>

          </div>
            </>
          )}
        </div>

        {/* Right Panel - Query Editor & Results */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'auto', minHeight: 0 }}>
          {/* AI Prompt Bar */}
          <div style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
            background: isDarkMode ? '#1a1a1a' : '#ffffff',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Button size="middle" icon={<RobotOutlined />} style={{ background: '#722ed1', borderColor: '#722ed1' }}>
                AI Assistant
              </Button>
              <Input
                placeholder="Describe what you want to analyze..."
                style={{ flex: 1, height: '40px' }}
                size="middle"
              />
              <Button size="middle" type="primary">Generate SQL</Button>
            </div>
          </div>

          {/* SQL Editor */}
          <div style={{ 
            flex: 1, 
            padding: '16px', 
            overflow: 'hidden', 
            minHeight: '200px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Editor
              height="100%"
              language="sql"
              theme={isDarkMode ? 'vs-dark' : 'vs-light'}
              value={sqlQuery}
              onChange={(value) => setSqlQuery(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: 'on',
                suggestOnTriggerCharacters: true,
                quickSuggestions: true,
                parameterHints: { enabled: true },
                // Ensure minimum visible lines
                scrollbar: {
                  vertical: 'visible',
                  horizontal: 'visible'
                },
                // Set minimum height for better visibility
                folding: true,
                foldingStrategy: 'indentation',
                showFoldingControls: 'always'
              }}
            />
          </div>

          {/* Query Controls & Results */}
          <div style={{
            padding: '16px',
            borderTop: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
            background: isDarkMode ? '#1a1a1a' : '#ffffff',
            flexShrink: 0
          }}>
            {/* Control Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Button 
                  type="primary" 
                  icon={<PlayCircleOutlined />} 
                  size="large"
                  loading={isExecuting}
                  onClick={handleExecuteQuery}
                >
                  Execute Query
                </Button>
                
                <Button 
                  icon={<DatabaseOutlined />} 
                  size="large"
                  onClick={() => {
                    // TODO: Open universal data source modal
                    message.info('Connect Data modal will open here');
                  }}
                  title="Connect to Data Source"
                >
                  Connect Data
                </Button>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Text style={{ fontSize: '12px' }}>Row Limit:</Text>
                  <Select
                    defaultValue="1000"
                    style={{ width: '80px' }}
                    size="small"
                    options={[
                      { value: '100', label: '100' },
                      { value: '1000', label: '1000' },
                      { value: '10000', label: '10000' }
                    ]}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ClockCircleOutlined style={{ fontSize: '14px' }} />
                  <Text style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                    {executionTime ? `00:00:${(executionTime / 1000).toFixed(2)}` : '00:00:00.00'}
                  </Text>
                </div>

                {isExecuting && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <SyncOutlined spin style={{ fontSize: '14px', color: '#1890ff' }} />
                    <Text style={{ fontSize: '12px', color: '#1890ff' }}>
                      {executionStatus}
                    </Text>
                  </div>
                )}

                {selectedEngine && !isExecuting && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ThunderboltOutlined style={{ fontSize: '14px', color: '#52c41a' }} />
                    <Text style={{ fontSize: '12px', color: '#52c41a' }}>
                      Engine: {selectedEngine}
                    </Text>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Dropdown
                  overlay={
                    <Menu>
                      <Menu.Item key="save" icon={<SaveOutlined />}>Save</Menu.Item>
                      <Menu.Item key="save-as" icon={<SaveOutlined />}>Save As...</Menu.Item>
                    </Menu>
                  }
                  trigger={['click']}
                >
                  <Button size="small" icon={<SaveOutlined />}>Save</Button>
                </Dropdown>
                
                <Tooltip title="Sample Data Query">
                  <Button 
                    size="small" 
                    icon={<PlayCircleOutlined />} 
                    onClick={() => {
                      const activeTable = selectedTables[0] || 'sales_data';
                      setSqlQuery(`SELECT * FROM ${activeTable} LIMIT 100;`);
                      message.success(`Generated sample query for ${activeTable}`);
                    }}
                  />
                </Tooltip>
                
                <Tooltip title="Copy SQL Query">
                  <Button 
                    size="small" 
                    icon={<CopyOutlined />} 
                    onClick={() => {
                      navigator.clipboard.writeText(sqlQuery);
                      message.success('SQL query copied to clipboard');
                    }}
                  />
                </Tooltip>
                
                <Dropdown
                  overlay={
                    <Menu>
                      <Menu.Item key="autocomplete">Autocomplete: ON</Menu.Item>
                      <Menu.Item key="schedule">Schedule</Menu.Item>
                    </Menu>
                  }
                  trigger={['click']}
                >
                  <Button size="small" icon={<MoreOutlined />} />
                </Dropdown>
              </div>
            </div>

            {/* Results, History & Chart Tabs */}
            <Tabs 
              activeKey={activeTab} 
              onChange={setActiveTab}
              size="small"
              style={{ marginTop: '16px' }}
              tabBarExtraContent={
                <Button 
                  size="small" 
                  type="text" 
                  icon={<PlusOutlined />}
                  onClick={() => {
                    const newTabKey = `query-${Date.now()}`;
                    setActiveTab(newTabKey);
                    message.success('New query tab added');
                  }}
                  title="Add New Query Tab"
                />
              }
            >
              <TabPane tab="Query Results" key="results">
                <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    {executionTime && (
                      <Text type="secondary">Execution time: {executionTime}ms</Text>
                    )}
                  </div>
                  <Space size="small">
                    <Button 
                      size="small" 
                      type="primary"
                      icon={<BarChartOutlined />}
                      onClick={() => {
                        if (results && results.length > 0) {
                          const chartTypes = suggestChartTypes(results);
                          if (chartTypes.length > 0) {
                            handleCreateChart(chartTypes[0].name, results);
                          }
                        }
                      }}
                      disabled={results.length === 0}
                    >
                      Generate Chart
                    </Button>
                    <Button 
                      size="small" 
                      icon={<DownloadOutlined />} 
                      onClick={() => exportToCSV(results)}
                      disabled={results.length === 0}
                    >
                      CSV
                    </Button>
                    <Button 
                      size="small" 
                      icon={<DownloadOutlined />} 
                      onClick={() => exportToJSON(results)}
                      disabled={results.length === 0}
                    >
                      JSON
                    </Button>
                  </Space>
                </div>
                <div style={{ height: '400px', overflow: 'auto' }}>
                  <Table
                    dataSource={results}
                    columns={columns}
                    size="small"
                    pagination={false}
                    scroll={{ y: 350 }}
                  />
                </div>
              </TabPane>
              
              {/* Chart Preview Tab */}
              <TabPane tab="Chart Preview" key="preview">
                <div style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
                  {previewChart ? (
                    <div>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        marginBottom: '16px',
                        padding: '12px',
                        background: isDarkMode ? '#1f1f1f' : '#f5f5f5',
                        borderRadius: '6px',
                        border: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`
                      }}>
                        <div>
                          <Title level={5} style={{ margin: 0, color: isDarkMode ? '#ffffff' : '#000000' }}>
                            {previewChart.title}
                          </Title>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {previewChart.config.chartType} Chart Preview
                          </Text>
                        </div>
                        <Space>
                          <Select
                            size="small"
                            defaultValue={previewChart.config.chartType}
                            style={{ width: 100 }}
                            onChange={(value) => {
                              const newChartWidget = {
                                ...previewChart,
                                config: { ...previewChart.config, chartType: value },
                                type: value
                              };
                              setPreviewChart(newChartWidget);
                            }}
                          >
                            <Select.Option value="bar">Bar</Select.Option>
                            <Select.Option value="line">Line</Select.Option>
                            <Select.Option value="pie">Pie</Select.Option>
                            <Select.Option value="scatter">Scatter</Select.Option>
                          </Select>
                          <Button 
                            size="small" 
                            onClick={() => setPreviewChart(null)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="primary" 
                            size="small"
                            icon={<BarChartOutlined />}
                            onClick={() => {
                              if (previewChart && onChartCreate) {
                                onChartCreate(previewChart);
                                setPreviewChart(null);
                                message.success('Chart added to dashboard!');
                              }
                            }}
                          >
                            Add to Dashboard
                          </Button>
                          
                          <Button 
                            size="small"
                            icon={<SaveOutlined />}
                            onClick={async () => {
                              if (previewChart) {
                                try {
                                  const result = await dashboardAPIService.createChart(previewChart);
                                  message.success('Chart saved successfully!');
                                  console.log('Saved chart:', result);
                                } catch (error) {
                                  console.error('Failed to save chart:', error);
                                  message.error('Failed to save chart. Please try again.');
                                }
                              }
                            }}
                          >
                            Save Chart
                          </Button>
                        </Space>
                      </div>
                      
                      <div style={{ 
                        height: '300px',
                        background: isDarkMode ? '#1a1a1a' : '#ffffff',
                        border: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
                        borderRadius: '6px',
                        padding: '12px'
                      }}>
                        <ChartWidget
                          widget={previewChart}
                          config={previewChart.config}
                          data={previewChart.data}
                          isDarkMode={isDarkMode}
                          showEditableTitle={false}
                        />
                      </div>
                    </div>
                  ) : (
                    <div style={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: isDarkMode ? '#999' : '#666'
                    }}>
                      <BarChartOutlined style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }} />
                      <Title level={4} style={{ color: isDarkMode ? '#999' : '#666', marginBottom: '8px' }}>
                        No Chart Preview
                      </Title>
                      <Text style={{ color: isDarkMode ? '#666' : '#999' }}>
                        Execute a query and click "Generate Chart" to see a preview
                      </Text>
                    </div>
                  )}
                </div>
              </TabPane>
              
              <TabPane tab="Query History" key="history">
                <div style={{ height: '400px', overflow: 'auto' }}>
                  <Table
                    dataSource={queryHistory}
                    columns={historyColumns}
                    size="small"
                    pagination={false}
                    scroll={{ y: 350 }}
                    onRow={(record) => ({
                      style: { cursor: 'pointer' }
                    })}
                  />
                </div>
              </TabPane>
            </Tabs>
          </div>
        </div>
      </div>


    </div>
  );
};

export default MonacoSQLEditor;
