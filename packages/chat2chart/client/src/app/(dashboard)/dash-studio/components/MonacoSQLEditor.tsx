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
  BarChartOutlined
} from '@ant-design/icons';

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

const MonacoSQLEditor: React.FC<MonacoSQLEditorProps> = ({ isDarkMode = false }) => {
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM sales_data LIMIT 100;');
  const [selectedDatabase, setSelectedDatabase] = useState('duckdb');
  const [selectedSchema, setSelectedSchema] = useState('public');
  const [selectedTable, setSelectedTable] = useState('sales_data');
  const [isExecuting, setExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState('results');
  const [openTableTabs, setOpenTableTabs] = useState<string[]>(['sales_data', 'user_analytics']);
  const [selectedTables, setSelectedTables] = useState<string[]>(['sales_data', 'user_analytics']);
  const [showTableSchema, setShowTableSchema] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [results, setResults] = useState<any[]>([]);
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
      // Fetch real data sources from the Universal Data Modal API
      const response = await fetch('/api/data/sources');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setDataSources(result.data_sources || []);
        } else {
          throw new Error(result.message || 'Failed to load data sources');
        }
      } else {
        throw new Error('Failed to fetch data sources');
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

  const handleExecuteQuery = async () => {
    setExecuting(true);
    setExecutionTime(null);
    
    try {
      // Simulate query execution
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
        queryType: sqlQuery.trim().toUpperCase().split(' ')[0]
      };
      
      setQueryHistory(prev => [historyItem, ...prev.slice(0, 49)]);
      
      message.success(`Query executed successfully. ${mockResults.length} rows returned.`);
      
    } catch (error) {
      message.error('Query execution failed');
      console.error('Query execution error:', error);
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
              
              <TabPane tab="Chart" key="chart">
                <div style={{ marginBottom: '16px' }}>
                  {results.length > 0 ? (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <Text strong style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
                          📊 Chart from Query Results
                        </Text>
                        <Button 
                          type="primary" 
                          icon={<BarChartOutlined />}
                          onClick={() => {
                            // Navigate to Chart Tab in Dashboard Studio
                            const url = new URL(window.location.href);
                            url.searchParams.set('tab', 'chart');
                            window.history.pushState({}, '', url.toString());
                            // Trigger tab change event
                            window.dispatchEvent(new CustomEvent('tabChange', { detail: 'chart' }));
                          }}
                        >
                          Open in Chart Designer
                        </Button>
                      </div>
                      
                      {/* Auto-generated Chart Preview */}
                      <div style={{ 
                        height: '300px', 
                        background: isDarkMode ? '#1a1a1a' : '#fafafa',
                        border: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
                        borderRadius: '8px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                          <BarChartOutlined style={{ fontSize: '48px', color: isDarkMode ? '#1890ff' : '#1890ff', marginBottom: '8px' }} />
                          <Text style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
                            Chart Preview
                          </Text>
                        </div>
                        
                        {/* Chart Type Suggestions */}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                          {suggestChartTypes(results).map((chartType, index) => (
                            <Tag key={index} color="blue" style={{ cursor: 'pointer' }}>
                              {chartType.icon} {chartType.name}
                            </Tag>
                          ))}
                        </div>
                        
                        <Text style={{ 
                          fontSize: '12px', 
                          color: isDarkMode ? '#999' : '#666', 
                          marginTop: '16px',
                          textAlign: 'center'
                        }}>
                          Click "Open in Chart Designer" to customize this chart
                        </Text>
                      </div>
                    </div>
                  ) : (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '40px 20px',
                      color: isDarkMode ? '#999' : '#666'
                    }}>
                      <BarChartOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                      <div>Execute a query to see chart suggestions</div>
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
