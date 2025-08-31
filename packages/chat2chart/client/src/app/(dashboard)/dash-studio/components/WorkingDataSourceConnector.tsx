'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Card, Input, Button, Space, Tabs, Table, message, Select, Row, Col, Divider } from 'antd';
import { 
  PlayCircleOutlined, 
  DatabaseOutlined, 
  FileTextOutlined,
  DownloadOutlined,
  PlusOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { initDuckDB, executeQuery } from '../utils/duckdb-utils';

const { TextArea } = Input;
const { TabPane } = Tabs;
const { Option } = Select;

interface WorkingDataSourceConnectorProps {
  onDataSourceConnect: (dataSource: any) => void;
  onQueryExecute: (sql: string, results: any[]) => void;
  dataSources: any[];
}

export const WorkingDataSourceConnector: React.FC<WorkingDataSourceConnectorProps> = ({
  onDataSourceConnect,
  onQueryExecute,
  dataSources
}) => {
  const [sqlQuery, setSqlQuery] = useState<string>('');
  const [queryResults, setQueryResults] = useState<any[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState('editor');
  const [duckDB, setDuckDB] = useState<any>(null);
  const [sampleData, setSampleData] = useState<any[]>([]);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  const [selectedDataSource, setSelectedDataSource] = useState<string>('');

  // Initialize DuckDB
  useEffect(() => {
    const initDB = async () => {
      try {
        const db = await initDuckDB();
        setDuckDB(db);
        
        // Load sample data
        const sampleQuery = `
          SELECT 
            'Product A' as product,
            'Q1' as quarter,
            1000 as sales,
            'North' as region
          UNION ALL
          SELECT 
            'Product B' as product,
            'Q1' as quarter,
            1500 as sales,
            'South' as region
          UNION ALL
          SELECT 
            'Product A' as product,
            'Q2' as quarter,
            1200 as sales,
            'North' as region
          UNION ALL
          SELECT 
            'Product B' as product,
            'Q2' as quarter,
            1800 as sales,
            'South' as region
        `;
        
        const results = await executeQuery(db, sampleQuery);
        setSampleData(results);
        message.success('DuckDB initialized with sample data');
      } catch (error) {
        message.error('Failed to initialize DuckDB');
        console.error(error);
      }
    };
    
    initDB();
  }, []);

  // Execute SQL query
  const handleExecuteQuery = useCallback(async () => {
    if (!sqlQuery.trim() || !duckDB) {
      message.warning('Please enter a SQL query');
      return;
    }

    setIsExecuting(true);
    try {
      const results = await executeQuery(duckDB, sqlQuery);
      setQueryResults(results);
      setQueryHistory(prev => [sqlQuery, ...prev.slice(0, 9)]); // Keep last 10 queries
      
      // Notify parent component about query execution
      onQueryExecute(sqlQuery, results);
      
      message.success(`Query executed successfully. ${results.length} rows returned.`);
    } catch (error) {
      message.error(`Query execution failed: ${error}`);
      console.error(error);
    } finally {
      setIsExecuting(false);
    }
  }, [sqlQuery, duckDB, onQueryExecute]);

  // Load sample queries
  const loadSampleQuery = (type: string) => {
    const samples: { [key: string]: string } = {
      basic: 'SELECT * FROM sample_data LIMIT 10',
      aggregation: `
        SELECT 
          product,
          SUM(sales) as total_sales,
          AVG(sales) as avg_sales,
          COUNT(*) as count
        FROM sample_data 
        GROUP BY product
        ORDER BY total_sales DESC
      `,
      pivot: `
        SELECT 
          region,
          SUM(CASE WHEN quarter = 'Q1' THEN sales ELSE 0 END) as Q1_sales,
          SUM(CASE WHEN quarter = 'Q2' THEN sales ELSE 0 END) as Q2_sales
        FROM sample_data 
        GROUP BY region
      `,
      timeSeries: `
        SELECT 
          quarter,
          SUM(sales) as total_sales,
          AVG(sales) as avg_sales
        FROM sample_data 
        GROUP BY quarter
        ORDER BY quarter
      `
    };
    
    setSqlQuery(samples[type] || '');
  };

  // Export results
  const exportResults = (format: 'csv' | 'json') => {
    if (queryResults.length === 0) {
      message.warning('No results to export');
      return;
    }

    let content = '';
    let filename = 'query_results';
    let mimeType = '';

    if (format === 'csv') {
      const headers = Object.keys(queryResults[0]);
      content = [headers.join(','), ...queryResults.map(row => 
        headers.map(header => JSON.stringify(row[header])).join(',')
      )].join('\n');
      filename += '.csv';
      mimeType = 'text/csv';
    } else {
      content = JSON.stringify(queryResults, null, 2);
      filename += '.json';
      mimeType = 'application/json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    
    message.success(`Results exported as ${format.toUpperCase()}`);
  };

  // Connect data source
  const handleConnectDataSource = () => {
    if (!selectedDataSource) {
      message.warning('Please select a data source');
      return;
    }

    const newDataSource = {
      id: `ds-${Date.now()}`,
      name: selectedDataSource,
      type: 'database',
      connectionString: `duckdb://${selectedDataSource}`,
      status: 'connected'
    };

    onDataSourceConnect(newDataSource);
    message.success(`Connected to ${selectedDataSource}`);
  };

  return (
    <div className="data-source-connector">
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="SQL Editor" key="editor">
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {/* Sample Queries */}
            <Card size="small" title="Sample Queries">
              <Space wrap>
                <Button size="small" onClick={() => loadSampleQuery('basic')}>
                  Basic Select
                </Button>
                <Button size="small" onClick={() => loadSampleQuery('aggregation')}>
                  Aggregation
                </Button>
                <Button size="small" onClick={() => loadSampleQuery('pivot')}>
                  Pivot Table
                </Button>
                <Button size="small" onClick={() => loadSampleQuery('timeSeries')}>
                  Time Series
                </Button>
              </Space>
            </Card>

            {/* SQL Editor */}
            <Card title="SQL Query Editor" size="small">
              <TextArea
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                placeholder="Enter your SQL query here..."
                rows={8}
                style={{ fontFamily: 'monospace', fontSize: '14px' }}
              />
              <Space style={{ marginTop: 16 }}>
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={handleExecuteQuery}
                  loading={isExecuting}
                >
                  Execute Query
                </Button>
                <Button onClick={() => setSqlQuery('')}>
                  Clear
                </Button>
              </Space>
            </Card>

            {/* Query History */}
            {queryHistory.length > 0 && (
              <Card size="small" title="Query History">
                <Space direction="vertical" style={{ width: '100%' }}>
                  {queryHistory.map((query, index) => (
                    <div key={index} style={{ 
                      padding: '8px', 
                      background: '#f5f5f5', 
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }} onClick={() => setSqlQuery(query)}>
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#666',
                        marginBottom: '4px'
                      }}>
                        Query #{index + 1}
                      </div>
                      <div style={{ 
                        fontFamily: 'monospace', 
                        fontSize: '11px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {query}
                      </div>
                    </div>
                  ))}
                </Space>
              </Card>
            )}
          </Space>
        </TabPane>

        <TabPane tab="Results" key="results">
          <Card title="Query Results" size="small">
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {queryResults.length > 0 ? (
                <>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center' 
                  }}>
                    <span>{queryResults.length} rows returned</span>
                    <Space>
                      <Button 
                        size="small" 
                        icon={<DownloadOutlined />}
                        onClick={() => exportResults('csv')}
                      >
                        Export CSV
                      </Button>
                      <Button 
                        size="small" 
                        icon={<DownloadOutlined />}
                        onClick={() => exportResults('json')}
                      >
                        Export JSON
                      </Button>
                    </Space>
                  </div>
                  
                  <Table
                    dataSource={queryResults}
                    columns={Object.keys(queryResults[0] || {}).map(key => ({
                      title: key,
                      dataIndex: key,
                      key: key,
                      render: (value: any) => 
                        typeof value === 'number' ? value.toLocaleString() : String(value)
                    }))}
                    size="small"
                    pagination={{ 
                      pageSize: 10, 
                      showSizeChanger: true,
                      showQuickJumper: true
                    }}
                    scroll={{ x: 'max-content' }}
                  />
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  <DatabaseOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                  <div>No query results yet</div>
                  <div style={{ fontSize: '12px' }}>Execute a query to see results here</div>
                </div>
              )}
            </Space>
          </Card>
        </TabPane>

        <TabPane tab="Data Sources" key="sources">
          <Card title="Connect Data Sources" size="small">
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Row gutter={16}>
                <Col span={12}>
                  <Select
                    placeholder="Select data source type"
                    style={{ width: '100%' }}
                    value={selectedDataSource}
                    onChange={setSelectedDataSource}
                  >
                    <Option value="sample_data">Sample Data (DuckDB)</Option>
                    <Option value="csv_upload">CSV Upload</Option>
                    <Option value="api_endpoint">API Endpoint</Option>
                    <Option value="database">Database Connection</Option>
                  </Select>
                </Col>
                <Col span={12}>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />}
                    onClick={handleConnectDataSource}
                    disabled={!selectedDataSource}
                  >
                    Connect
                  </Button>
                </Col>
              </Row>

              <Divider />

              <div>
                <h4>Connected Sources:</h4>
                {dataSources.length > 0 ? (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {dataSources.map((ds) => (
                      <Card 
                        key={ds.id} 
                        size="small" 
                        style={{ background: '#f6ffed', borderColor: '#52c41a' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong>{ds.name}</strong>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                              {ds.connectionString}
                            </div>
                          </div>
                          <span style={{ 
                            color: '#52c41a', 
                            fontSize: '12px',
                            background: '#f6ffed',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            border: '1px solid #52c41a'
                          }}>
                            {ds.status}
                          </span>
                        </div>
                      </Card>
                    ))}
                  </Space>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                    <DatabaseOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
                    <div>No data sources connected</div>
                    <div style={{ fontSize: '12px' }}>Connect a data source to get started</div>
                  </div>
                )}
              </div>
            </Space>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};
