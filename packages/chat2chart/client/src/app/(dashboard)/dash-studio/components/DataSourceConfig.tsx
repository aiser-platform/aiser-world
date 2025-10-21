'use client';

import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  Button,
  Card,
  Row,
  Col,
  Space,
  Typography,
  Divider,
  Upload,
  Table,
  Tag,
  Tooltip,
  message,
  Modal,
  Tabs,
  InputNumber,
  Switch
} from 'antd';
import {
  DatabaseOutlined,
  ApiOutlined,
  FileOutlined,
  CloudUploadOutlined,
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  DownloadOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { dashboardDataService } from '../services/DashboardDataService';
import { getBackendUrlForApi } from '@/utils/backendUrl';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

interface DataSourceConfigProps {
  widget: any;
  onUpdate: (config: any) => void;
}

const DataSourceConfig: React.FC<DataSourceConfigProps> = ({ widget, onUpdate }) => {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('connect');
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [dataSources, setDataSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Load real data sources
  useEffect(() => {
    loadDataSources();
  }, []);

  const loadDataSources = async () => {
    setLoading(true);
    try {
                 // Get organization and project context from URL or context
          const organizationId = localStorage.getItem('currentOrganizationId') ?? 1;
          const projectIdRaw = localStorage.getItem('currentProjectId');
          // If a projects list is available in localStorage, prefer its first id
          let projectId = projectIdRaw ?? 1;
          try {
            const projList = JSON.parse(localStorage.getItem('projects') || 'null');
            if (Array.isArray(projList) && projList.length > 0 && projList[0].id) {
              projectId = projectIdRaw ?? projList[0].id;
            }
          } catch (e) {
            // ignore parse errors and keep fallback
          }
      
      // Try project-scoped data sources first
      let response;
      try {
        response = await fetch(`${getBackendUrlForApi()}/data/api/organizations/${organizationId}/projects/${projectId}/data-sources?user_id=current_user`);
        if (!response.ok) {
          throw new Error(`Project-scoped API failed: ${response.status}`);
        }
      } catch (projectError) {
        // Fallback to global data sources API
        response = await fetch(`${getBackendUrlForApi()}/data/sources`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }
      
      const result = await response.json();
      const sources = result.data_sources || result || [];
      
      // All sources are available (no status filtering needed for demo data)
      const availableSources = sources;
      
      // Check enterprise connections
      try {
        const enterpriseResponse = await fetch(`${getBackendUrlForApi()}/data/enterprise/connections`);
        if (enterpriseResponse.ok) {
          const enterpriseResult = await enterpriseResponse.json();
          if (enterpriseResult.connections && enterpriseResult.connections.length > 0) {
            enterpriseResult.connections.forEach((conn: any) => {
              availableSources.push({
                id: `enterprise_${conn.id}`,
                name: `${conn.name} (Enterprise)`,
                type: 'enterprise',
                status: 'connected',
                lastSync: 'Active',
                tables: 0,
                icon: 'database',
                connection_info: conn
              });
            });
          }
        }
      } catch (enterpriseError) {
      }
      
      setDataSources(availableSources.map((source: any) => ({
        id: source.id,
        name: source.name,
        type: source.type,
        status: 'connected', // All demo sources are connected
        lastSync: source.updated_at ? new Date(source.updated_at).toLocaleString() : 'Never',
        tables: source.schema?.columns?.length || 0,
        icon: getDataSourceIcon(source.type),
        connection_info: source,
        rowCount: source.row_count,
        size: source.size
      })));
    } catch (error) {
      console.error('Failed to load data sources:', error);
      message.error('Failed to load data sources');
      // Fallback to empty array
      setDataSources([]);
    } finally {
      setLoading(false);
    }
  };

  const getDataSourceIcon = (type: string) => {
    switch (type) {
      case 'database':
        return 'database';
      case 'api':
        return 'api';
      case 'file':
        return 'file';
      case 'cube':
        return 'cube';
      case 'warehouse':
        return 'database';
      default:
        return 'database';
    }
  };

  const handleConfigUpdate = (values: any) => {
    onUpdate(values);
  };

  const handlePreviewData = async (source: any) => {
    try {
      setLoading(true);
      const result = await dashboardDataService.getSampleData(source.id, 'sample_table', 10);
      if (result.success) {
        setPreviewData(result.data);
        setPreviewModalVisible(true);
      } else {
        message.error('Failed to load preview data: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to preview data:', error);
      message.error('Failed to load preview data');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'database' ? 'blue' : type === 'api' ? 'green' : 'orange'}>
          {type.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'connected' ? 'green' : 'red'}>
          {status === 'connected' ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
          {status}
        </Tag>
      ),
    },
    {
      title: 'Last Sync',
      dataIndex: 'lastSync',
      key: 'lastSync',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Tooltip title="Preview Data">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              onClick={() => handlePreviewData(record)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button type="text" icon={<EditOutlined />} />
          </Tooltip>
          <Tooltip title="Delete">
            <Button type="text" icon={<DeleteOutlined />} danger />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const renderConnectTab = () => (
    <div>
      <Title level={5} style={{ marginBottom: '12px' }}>Select Data Source</Title>
      <Text type="secondary" style={{ fontSize: 'var(--font-size-sm)' }}>Choose from your connected data sources</Text>
      
      <div style={{ marginTop: '16px' }}>
        <Form.Item label="Data Source" name="dataSource" style={{ marginBottom: '12px' }}>
          <Select placeholder="Select data source" size="small">
            {dataSources.map(source => (
              <Option key={source.id} value={source.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {source.icon === 'database' ? <DatabaseOutlined /> : 
                   source.icon === 'api' ? <ApiOutlined /> : 
                   source.icon === 'file' ? <FileOutlined /> : <DatabaseOutlined />}
                  <span>{source.name}</span>
                  <Tag color={source.status === 'connected' ? 'green' : 'red'}>
                    {source.status}
                  </Tag>
                </div>
              </Option>
            ))}
          </Select>
        </Form.Item>
        
        <Form.Item label="Table/Query" name="table" style={{ marginBottom: '12px' }}>
          <Select placeholder="Select table or enter query" size="small">
            <Option value="sales_data">Sales Data</Option>
            <Option value="user_analytics">User Analytics</Option>
            <Option value="product_catalog">Product Catalog</Option>
            <Option value="custom_query">Custom Query</Option>
          </Select>
        </Form.Item>
        
        <Form.Item label="Refresh Interval" name="refreshInterval" style={{ marginBottom: '12px' }}>
          <Select placeholder="Auto refresh" size="small">
            <Option value="0">No auto refresh</Option>
            <Option value="30">30 seconds</Option>
            <Option value="60">1 minute</Option>
            <Option value="300">5 minutes</Option>
            <Option value="900">15 minutes</Option>
          </Select>
        </Form.Item>
      </div>
    </div>
  );

  const renderDatabaseTab = () => (
    <div>
      <Title level={5}>Database Connection</Title>
      <Form layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Database Type" name="dbType">
              <Select placeholder="Select database type">
                <Option value="postgresql">PostgreSQL</Option>
                <Option value="mysql">MySQL</Option>
                <Option value="sqlserver">SQL Server</Option>
                <Option value="oracle">Oracle</Option>
                <Option value="sqlite">SQLite</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Host" name="host">
              <Input placeholder="localhost" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Port" name="port">
              <InputNumber placeholder="5432" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Database Name" name="database">
              <Input placeholder="mydatabase" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Username" name="username">
              <Input placeholder="username" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Password" name="password">
              <Input.Password placeholder="password" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item label="Connection String" name="connectionString">
          <TextArea rows={2} placeholder="postgresql://username:password@localhost:5432/database" />
        </Form.Item>
        <Button type="primary" icon={<ThunderboltOutlined />}>
          Test Connection
        </Button>
      </Form>
    </div>
  );

  const renderApiTab = () => (
    <div>
      <Title level={5}>API Connection</Title>
      <Form layout="vertical">
        <Form.Item label="API URL" name="apiUrl">
          <Input placeholder="https://api.example.com/data" />
        </Form.Item>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Method" name="method">
              <Select defaultValue="GET">
                <Option value="GET">GET</Option>
                <Option value="POST">POST</Option>
                <Option value="PUT">PUT</Option>
                <Option value="DELETE">DELETE</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Authentication" name="auth">
              <Select placeholder="Select authentication">
                <Option value="none">None</Option>
                <Option value="bearer">Bearer Token</Option>
                <Option value="basic">Basic Auth</Option>
                <Option value="api-key">API Key</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Form.Item label="Headers" name="headers">
          <TextArea rows={3} placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}' />
        </Form.Item>
        <Form.Item label="Query Parameters" name="queryParams">
          <TextArea rows={2} placeholder='{"limit": 100, "offset": 0}' />
        </Form.Item>
        <Button type="primary" icon={<ThunderboltOutlined />}>
          Test API
        </Button>
      </Form>
    </div>
  );

  const renderFileTab = () => (
    <div>
      <Title level={5}>File Upload</Title>
      <Upload.Dragger
        name="file"
        multiple={false}
        accept=".csv,.xlsx,.xls,.json"
        style={{ marginBottom: '16px' }}
      >
        <p className="ant-upload-drag-icon">
          <CloudUploadOutlined />
        </p>
        <p className="ant-upload-text">Click or drag file to this area to upload</p>
        <p className="ant-upload-hint">
          Support CSV, Excel, and JSON files
        </p>
      </Upload.Dragger>
      
      <Form layout="vertical">
        <Form.Item label="File Format" name="fileFormat">
          <Select placeholder="Auto-detect">
            <Option value="csv">CSV</Option>
            <Option value="excel">Excel</Option>
            <Option value="json">JSON</Option>
          </Select>
        </Form.Item>
        <Form.Item label="Delimiter" name="delimiter">
          <Select placeholder="Auto-detect">
            <Option value=",">Comma (,)</Option>
            <Option value=";">Semicolon (;)</Option>
            <Option value="\t">Tab</Option>
          </Select>
        </Form.Item>
        <Form.Item label="Has Header" name="hasHeader" valuePropName="checked">
          <Switch defaultChecked />
        </Form.Item>
      </Form>
    </div>
  );

  return (
    <div>
      {renderConnectTab()}
      
      <Divider style={{ margin: '16px 0' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <Title level={5} style={{ margin: 0, fontSize: 'var(--font-size-base)' }}>Available Sources</Title>
        <Button type="text" icon={<PlusOutlined />} size="small" style={{ fontSize: 'var(--font-size-sm)' }}>
          Manage
        </Button>
      </div>

      <div style={{ maxHeight: '200px', overflow: 'auto' }}>
        {dataSources.map(source => (
          <Card 
            key={source.id} 
            size="small" 
            style={{ 
              marginBottom: '8px',
              border: '1px solid var(--color-border-primary)',
              cursor: 'pointer'
            }}
            onClick={() => handlePreviewData(source)}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {source.icon === 'database' ? <DatabaseOutlined /> : 
                 source.icon === 'api' ? <ApiOutlined /> : 
                 source.icon === 'file' ? <FileOutlined /> : <DatabaseOutlined />}
                <div>
                  <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: '500' }}>{source.name}</div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>{source.tables} tables</div>
                </div>
              </div>
              <Tag color={source.status === 'connected' ? 'green' : 'red'}>
                {source.status}
              </Tag>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        title="Data Preview"
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPreviewModalVisible(false)}>
            Close
          </Button>,
          <Button key="select" type="primary" onClick={() => {
            message.success('Data source selected!');
            setPreviewModalVisible(false);
          }}>
            Select This Data
          </Button>
        ]}
        width={600}
      >
        <Table 
          dataSource={previewData} 
          columns={[
            { title: 'ID', dataIndex: 'id', key: 'id' },
            { title: 'Name', dataIndex: 'name', key: 'name' },
            { title: 'Value', dataIndex: 'value', key: 'value' },
            { title: 'Category', dataIndex: 'category', key: 'category' }
          ]}
          pagination={false}
          size="small"
        />
      </Modal>
    </div>
  );
};

export default DataSourceConfig;
