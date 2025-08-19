'use client';

import React, { useState, useEffect } from 'react';
import { 
    Card, 
    Collapse, 
    Select, 
    Tree, 
    Button, 
    Space, 
    Tooltip, 
    Modal,
    Tabs,
    Divider,
    Typography,
    Badge,
    Spin,
    Input
} from 'antd';
import { 
    DatabaseOutlined, 
    TableOutlined, 
    EyeOutlined,
    CodeOutlined,
    BarChartOutlined,
    LinkOutlined,
    ExpandOutlined,
    CompressOutlined,
    ReloadOutlined
} from '@ant-design/icons';
import { ExtendedTable, IDatabase } from '../../types';
import { IFileUpload } from '@/app/components/FileUpload/types';
import SQLEditor from '@/app/components/SQLEditor/SQLEditor';
import UniversalDataSourceModal from '@/app/components/UniversalDataSourceModal/UniversalDataSourceModal';
import './styles.css';

const { Panel } = Collapse;
const { Option } = Select;
// const { TabPane } = Tabs; // Deprecated - using items prop instead
const { Text, Title } = Typography;

interface EnhancedDataPanelProps {
    db?: IDatabase;
    schema?: string;
    tables?: ExtendedTable[];
    file?: IFileUpload;
    collapsed?: boolean;
    onDbChange?: (db?: IDatabase) => void;
    onSchemaChange?: (schema?: string) => void;
    onTableSelectChange?: (tables: ExtendedTable[]) => void;
    onFileChange?: (file?: IFileUpload) => void;
    onCollapsedChange?: (collapsed: boolean) => void;
    onSQLExecute?: (sql: string, results: any[]) => void;
    onChartGenerate?: (data: any[], query: string) => void;
}

interface DatabaseSchema {
    name: string;
    tables: Array<{
        name: string;
        type: 'table' | 'view';
        columns: Array<{
            name: string;
            type: string;
            nullable: boolean;
        }>;
    }>;
}

const EnhancedDataPanel: React.FC<EnhancedDataPanelProps> = ({
    db,
    schema,
    tables,
    file,
    collapsed = false,
    onDbChange,
    onSchemaChange,
    onTableSelectChange,
    onFileChange,
    onCollapsedChange,
    onSQLExecute,
    onChartGenerate
}) => {
    const [activeTab, setActiveTab] = useState<string>('browser');
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [schemas, setSchemas] = useState<string[]>([]);
    const [databaseSchema, setDatabaseSchema] = useState<DatabaseSchema | null>(null);
    const [loading, setLoading] = useState(false);
    const [dataSourceModalVisible, setDataSourceModalVisible] = useState(false);
    const [showUniversalDataSourceModal, setShowUniversalDataSourceModal] = useState(false);
    const [sqlResults, setSqlResults] = useState<any[]>([]);
    const [currentSQL, setCurrentSQL] = useState<string>('');

    // Mock data for demonstration - replace with actual API calls
    useEffect(() => {
        if (db) {
            setLoading(true);
            // Simulate API call to fetch schemas
            setTimeout(() => {
                setSchemas(['public', 'analytics', 'staging']);
                setLoading(false);
            }, 500);
        }
    }, [db]);

    useEffect(() => {
        if (db && schema) {
            setLoading(true);
            // Simulate API call to fetch schema details
            setTimeout(() => {
                setDatabaseSchema({
                    name: schema,
                    tables: [
                        {
                            name: 'users',
                            type: 'table',
                            columns: [
                                { name: 'id', type: 'integer', nullable: false },
                                { name: 'name', type: 'varchar', nullable: false },
                                { name: 'email', type: 'varchar', nullable: false },
                                { name: 'created_at', type: 'timestamp', nullable: false }
                            ]
                        },
                        {
                            name: 'orders',
                            type: 'table',
                            columns: [
                                { name: 'id', type: 'integer', nullable: false },
                                { name: 'user_id', type: 'integer', nullable: false },
                                { name: 'amount', type: 'decimal', nullable: false },
                                { name: 'status', type: 'varchar', nullable: false },
                                { name: 'created_at', type: 'timestamp', nullable: false }
                            ]
                        },
                        {
                            name: 'user_analytics',
                            type: 'view',
                            columns: [
                                { name: 'user_id', type: 'integer', nullable: false },
                                { name: 'total_orders', type: 'integer', nullable: false },
                                { name: 'total_spent', type: 'decimal', nullable: false }
                            ]
                        }
                    ]
                });
                setLoading(false);
            }, 300);
        }
    }, [db, schema]);

    const handleTableSelect = (tableName: string) => {
        setSelectedTable(tableName);
        const table = databaseSchema?.tables.find(t => t.name === tableName);
        if (table) {
            // Generate a sample SQL query
            const sampleSQL = `SELECT * FROM ${schema}.${tableName} LIMIT 100;`;
            setCurrentSQL(sampleSQL);
        }
    };

    const handleSQLExecute = async (sql: string) => {
        setLoading(true);
        try {
            // Simulate SQL execution - replace with actual API call
            setTimeout(() => {
                const mockResults = [
                    { id: 1, name: 'John Doe', email: 'john@example.com', created_at: '2024-01-01' },
                    { id: 2, name: 'Jane Smith', email: 'jane@example.com', created_at: '2024-01-02' },
                    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', created_at: '2024-01-03' }
                ];
                setSqlResults(mockResults);
                onSQLExecute?.(sql, mockResults);
                setLoading(false);
            }, 1000);
        } catch (error) {
            console.error('SQL execution failed:', error);
            setLoading(false);
        }
    };

    const handleChartGenerate = () => {
        if (sqlResults.length > 0) {
            onChartGenerate?.(sqlResults, currentSQL);
        }
    };

    const loadDataSources = async () => {
        try {
            const response = await fetch('http://localhost:8000/data/sources');
            const result = await response.json();
            
            if (result.success && result.data_sources) {
                // Update database schema with real data sources
                const realSources = result.data_sources.map((source: any) => ({
                    name: source.name,
                    type: source.type,
                    status: source.status,
                    tables: source.tables || []
                }));
                
                if (realSources.length > 0) {
                    setDatabaseSchema({
                        name: 'Connected Data Sources',
                        tables: realSources.flatMap((source: any) => 
                            source.tables.map((table: any) => ({
                                name: `${source.name}.${table.name}`,
                                type: 'table',
                                columns: table.columns || []
                            }))
                        )
                    });
                }
            }
        } catch (error) {
            console.error('Failed to load data sources:', error);
        }
    };

    useEffect(() => {
        loadDataSources();
    }, []);

    const renderDatabaseBrowser = () => (
        <div className="database-browser">
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {/* Removed duplicate Connect Data Source card - now only in header */}

                {/* Data Structure Browser */}
                {databaseSchema && databaseSchema.tables.length > 0 ? (
                    <Card size="small" title="Data Structure">
                        <Space direction="vertical" style={{ width: '100%' }} size="small">
                            {/* Database Type */}
                            <div>
                                <Text strong>Database Type:</Text>
                                <Select
                                    style={{ width: '100%', marginTop: 4 }}
                                    placeholder="Select database type"
                                    value={db?.type || 'unknown'}
                                    disabled
                                >
                                    <Option value="postgresql">PostgreSQL</Option>
                                    <Option value="mysql">MySQL</Option>
                                    <Option value="snowflake">Snowflake</Option>
                                    <Option value="bigquery">BigQuery</Option>
                                    <Option value="file">File Upload</Option>
                                </Select>
                            </div>

                            {/* Schema Selector */}
                            <div>
                                <Text strong>Schema:</Text>
                                <Select
                                    style={{ width: '100%', marginTop: 4 }}
                                    placeholder="Select schema"
                                    value={schema}
                                    onChange={onSchemaChange}
                                    loading={loading}
                                >
                                    {schemas.map(s => (
                                        <Option key={s} value={s}>{s}</Option>
                                    ))}
                                </Select>
                            </div>

                            {/* Tables and Views */}
                            <div>
                                <Text strong>Tables & Views:</Text>
                                <div className="tables-list" style={{ marginTop: 4 }}>
                                    {databaseSchema.tables.map(table => (
                                        <div 
                                            key={table.name}
                                            className={`table-item ${selectedTable === table.name ? 'selected' : ''}`}
                                            onClick={() => handleTableSelect(table.name)}
                                            style={{ 
                                                padding: '8px', 
                                                border: '1px solid #d9d9d9', 
                                                borderRadius: '4px',
                                                marginBottom: '4px',
                                                cursor: 'pointer',
                                                backgroundColor: selectedTable === table.name ? '#f0f8ff' : '#ffffff'
                                            }}
                                        >
                                            <Space>
                                                <TableOutlined />
                                                <Text>{table.name}</Text>
                                                <Badge count={table.columns?.length || 0} />
                                            </Space>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Space>
                    </Card>
                ) : (
                    <Card size="small" title="Data Structure">
                        <div style={{ textAlign: 'center', padding: '20px' }}>
                            <DatabaseOutlined style={{ fontSize: '24px', color: '#d9d9d9', marginBottom: '8px' }} />
                            <Text type="secondary">Connect a data source to see structure</Text>
                        </div>
                    </Card>
                )}

                {/* Removed duplicate schema selector - now integrated in Data Structure section */}

                {/* Tables and Views */}
                {databaseSchema && (
                    <Card 
                        size="small" 
                        title={
                            <Space>
                                <TableOutlined />
                                Tables & Views
                                <Badge count={databaseSchema.tables.length} />
                            </Space>
                        }
                    >
                        <div className="tables-list">
                            {databaseSchema.tables.map(table => (
                                <div 
                                    key={table.name}
                                    className={`table-item ${selectedTable === table.name ? 'selected' : ''}`}
                                    onClick={() => handleTableSelect(table.name)}
                                >
                                    <Space>
                                        {table.type === 'table' ? 
                                            <TableOutlined style={{ color: '#1890ff' }} /> : 
                                            <EyeOutlined style={{ color: '#52c41a' }} />
                                        }
                                        <div>
                                            <Text strong>{table.name}</Text>
                                            <div>
                                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                                    {table.columns.length} columns
                                                </Text>
                                            </div>
                                        </div>
                                    </Space>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

                {/* Table Schema Details */}
                {selectedTable && databaseSchema && (
                    <Card size="small" title={`${selectedTable} Schema`}>
                        <div className="table-schema">
                            {databaseSchema.tables
                                .find(t => t.name === selectedTable)
                                ?.columns.map(column => (
                                <div key={column.name} className="column-item">
                                    <Space>
                                        <Text code style={{ fontSize: '12px' }}>
                                            {column.type}
                                        </Text>
                                        <Text>{column.name}</Text>
                                        {!column.nullable && (
                                            <Text type="secondary" style={{ fontSize: '10px' }}>
                                                NOT NULL
                                            </Text>
                                        )}
                                    </Space>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}
            </Space>
        </div>
    );

    const renderSQLEditor = () => (
        <div className="sql-editor-container">
            <div style={{ padding: '12px' }}>
                {/* Compact SQL Editor */}
                <Card size="small" style={{ marginBottom: '12px' }}>
                    <div style={{ marginBottom: '12px' }}>
                        <Text strong style={{ fontSize: '13px' }}>SQL Query</Text>
                    </div>
                    <Input.TextArea
                        value={currentSQL}
                        onChange={(e) => setCurrentSQL(e.target.value)}
                        placeholder="SELECT * FROM table LIMIT 10;"
                        rows={4}
                        style={{ 
                            fontFamily: 'monospace',
                            fontSize: '13px',
                            backgroundColor: 'var(--background)',
                            border: '1px solid var(--border-color-base)',
                            color: 'var(--text-color)'
                        }}
                    />
                    <div style={{ marginTop: '12px', textAlign: 'right' }}>
                        <Button 
                            type="primary" 
                            size="small"
                            onClick={() => handleSQLExecute(currentSQL)}
                            loading={loading}
                            disabled={!currentSQL.trim()}
                            icon={<CodeOutlined />}
                        >
                            Execute
                        </Button>
                    </div>
                </Card>

                {/* Compact Query Results */}
                {sqlResults.length > 0 && (
                    <Card size="small" style={{ marginBottom: '12px' }}>
                        <div style={{ marginBottom: '8px' }}>
                            <Text strong style={{ fontSize: '13px' }}>Results ({sqlResults.length})</Text>
                        </div>
                        <div style={{ 
                            maxHeight: '200px', 
                            overflow: 'auto',
                            border: '1px solid var(--border-color-base)',
                            borderRadius: '4px',
                            backgroundColor: 'var(--background)'
                        }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: 'var(--component-background)' }}>
                                        {Object.keys(sqlResults[0]).map(key => (
                                            <th key={key} style={{ 
                                                padding: '6px 8px', 
                                                border: '1px solid var(--border-color-base)',
                                                textAlign: 'left',
                                                fontSize: '11px',
                                                color: 'var(--text-color)',
                                                fontWeight: '600'
                                            }}>
                                                {key}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {sqlResults.map((row, index) => (
                                        <tr key={index} style={{ 
                                            backgroundColor: index % 2 === 0 ? 'var(--background)' : 'var(--component-background)'
                                        }}>
                                            {Object.values(row).map((value, colIndex) => (
                                                <td key={colIndex} style={{ 
                                                    padding: '6px 8px', 
                                                    border: '1px solid var(--border-color-base)',
                                                    fontSize: '11px',
                                                    color: 'var(--text-color)'
                                                }}>
                                                    {String(value)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ marginTop: '8px', textAlign: 'center' }}>
                            <Button 
                                size="small"
                                onClick={handleChartGenerate}
                                icon={<BarChartOutlined />}
                            >
                                Generate Chart
                            </Button>
                        </div>
                    </Card>
                )}

                {/* Compact Sample Queries */}
                <Card size="small">
                    <div style={{ marginBottom: '8px' }}>
                        <Text strong style={{ fontSize: '13px' }}>Quick Queries</Text>
                    </div>
                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                        <Button 
                            type="text" 
                            size="small"
                            style={{ fontSize: '11px', padding: '2px 8px', height: 'auto' }}
                            onClick={() => setCurrentSQL('SELECT * FROM users LIMIT 10;')}
                        >
                            SELECT * FROM users LIMIT 10;
                        </Button>
                        <Button 
                            type="text" 
                            size="small"
                            style={{ fontSize: '11px', padding: '2px 8px', height: 'auto' }}
                            onClick={() => setCurrentSQL('SELECT COUNT(*) as total FROM users;')}
                        >
                            SELECT COUNT(*) as total FROM users;
                        </Button>
                        <Button 
                            type="text" 
                            size="small"
                            style={{ fontSize: '11px', padding: '2px 8px', height: 'auto' }}
                            onClick={() => setCurrentSQL('SELECT status, COUNT(*) FROM orders GROUP BY status;')}
                        >
                            SELECT status, COUNT(*) FROM orders GROUP BY status;
                        </Button>
                    </Space>
                </Card>
            </div>
        </div>
    );

    const handleDataSourceCreated = (dataSource: any) => {
        console.log('New data source created:', dataSource);
        setShowUniversalDataSourceModal(false);
        
        // Update the data panel with the new data source
        if (dataSource.type === 'file' && onFileChange) {
            onFileChange({
                filename: dataSource.config.connectionDetails.filename,
                content_type: dataSource.config.connectionDetails.content_type,
                storage_type: dataSource.config.connectionDetails.storage_type,
                file_size: dataSource.config.connectionDetails.file_size,
                uuid_filename: dataSource.config.connectionDetails.uuid_filename
            });
        }
        
        // You can add additional logic here for database/warehouse connections
    };

    if (collapsed) {
        return (
            <div className="data-panel-collapsed">
                <Button
                    type="text"
                    icon={<ExpandOutlined />}
                    onClick={() => onCollapsedChange?.(false)}
                    style={{ 
                        writingMode: 'vertical-rl',
                        height: '100px',
                        border: 'none'
                    }}
                >
                    Data Panel
                </Button>
            </div>
        );
    }

    return (
        <div className="enhanced-data-panel">
            <div className="data-panel-header">
                <Space>
                    <Title level={5} style={{ margin: 0 }}>Data Panel</Title>
                    <Button
                        type="primary"
                        size="small"
                        icon={<DatabaseOutlined />}
                        onClick={() => setShowUniversalDataSourceModal(true)}
                    >
                        Connect Data
                    </Button>
                    <Tooltip title="Collapse">
                        <Button
                            type="text"
                            size="small"
                            icon={<CompressOutlined />}
                            onClick={() => onCollapsedChange?.(true)}
                        />
                    </Tooltip>
                </Space>
            </div>

            <Tabs 
                activeKey={activeTab} 
                onChange={setActiveTab}
                size="small"
                style={{ height: 'calc(100% - 40px)' }}
                items={[
                    {
                        key: 'browser',
                        label: (
                            <Space>
                                <DatabaseOutlined />
                                Browser
                            </Space>
                        ),
                        children: renderDatabaseBrowser()
                    },
                    {
                        key: 'sql',
                        label: (
                            <Space>
                                <CodeOutlined />
                                SQL Editor
                            </Space>
                        ),
                        children: renderSQLEditor()
                    }
                ]}
            />

            {/* Universal Data Source Modal */}
            <UniversalDataSourceModal
                isOpen={showUniversalDataSourceModal}
                onClose={() => setShowUniversalDataSourceModal(false)}
                onDataSourceCreated={handleDataSourceCreated}
                initialDataSourceType="file"
                isChatIntegration={true}
            />
        </div>
    );
};

export default EnhancedDataPanel;