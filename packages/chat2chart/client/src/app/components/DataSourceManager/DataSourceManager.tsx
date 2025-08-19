'use client';

import React, { useState, useEffect } from 'react';
import { Card, Tabs, List, Button, Modal, Radio, Space, Tag, message } from 'antd';
import { FileOutlined, DatabaseOutlined, EyeOutlined, DeleteOutlined, PlusOutlined, ExperimentOutlined } from '@ant-design/icons';
import UploadDragger from '../FileUpload/Dragger';
import DatabaseConnector, { DatabaseConnection } from '../DatabaseConnector';
import DataModelingWorkflow from '../IntelligentModeling/DataModelingWorkflow';
import { IFileUpload } from '../FileUpload/types';

// const { TabPane } = Tabs; // Deprecated - using items prop instead

interface DataSource {
    id: string;
    name: string;
    type: 'file' | 'database';
    data?: any;
    metadata?: any;
    createdAt: Date;
}

interface DataSourceManagerProps {
    selectedSource?: DataSource;
    onSourceSelect: (source: DataSource) => void;
    onSourceDelete: (sourceId: string) => void;
    onDataSourceSelect?: (source: DataSource) => void;
    onFileUpload?: (file: IFileUpload) => void;
    loading?: boolean;
    showUploadOption?: boolean;
    showDatabaseOption?: boolean;
    compact?: boolean;
}

const DataSourceManager: React.FC<DataSourceManagerProps> = ({
    selectedSource,
    onSourceSelect,
    onSourceDelete,
    onDataSourceSelect,
    onFileUpload,
    loading: externalLoading = false,
    showUploadOption = true,
    showDatabaseOption = true,
    compact = false
}) => {
    const [dataSources, setDataSources] = useState<DataSource[]>([]);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewData, setPreviewData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('files');
    const [loading, setLoading] = useState(false);
    const [modelingVisible, setModelingVisible] = useState(false);
    const [modelingData, setModelingData] = useState<any>(null);
    const [modelingFileMetadata, setModelingFileMetadata] = useState<any>(null);
    const [modelingWorkflowVisible, setModelingWorkflowVisible] = useState(false);
    const [currentDataSourceForModeling, setCurrentDataSourceForModeling] = useState<string | null>(null);

    // Mock data for demonstration
    useEffect(() => {
        // Load existing data sources
        const mockSources: DataSource[] = [
            {
                id: '1',
                name: 'Sales Data Q4.csv',
                type: 'file',
                metadata: { size: '2.5MB', rows: 1500, columns: 8 },
                createdAt: new Date('2024-01-15')
            },
            {
                id: '2',
                name: 'Production DB',
                type: 'database',
                metadata: { type: 'PostgreSQL', tables: 25, status: 'connected' },
                createdAt: new Date('2024-01-10')
            }
        ];
        setDataSources(mockSources);
    }, []);

    const handleFileUpload = (fileData?: IFileUpload) => {
        if (!fileData) return;
        
        const newSource: DataSource = {
            id: fileData.uuid_filename,
            name: fileData.filename,
            type: 'file',
            data: fileData,
            metadata: {
                size: `${(fileData.file_size / 1024 / 1024).toFixed(2)}MB`,
                type: fileData.content_type,
                uuid: fileData.uuid_filename
            },
            createdAt: new Date()
        };

        setDataSources(prev => [newSource, ...prev]);
        message.success('File uploaded successfully!');
        
        // Call external handler if provided
        if (onFileUpload) {
            onFileUpload(fileData);
        }
        
        // Trigger AI data modeling workflow
        setCurrentDataSourceForModeling(newSource.id);
        setModelingWorkflowVisible(true);
    };

    const handleDatabaseConnect = async (connection: DatabaseConnection) => {
        try {
            setLoading(true);
            
            // Call the backend to create database connection
            const response = await fetch('http://localhost:8000/data/connect-database', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(connection),
            });

            if (!response.ok) {
                throw new Error('Failed to connect to database');
            }

            const result = await response.json();
            
            if (result.success) {
                const newSource: DataSource = {
                    id: result.data_source.id,
                    name: result.data_source.name,
                    type: 'database',
                    data: connection,
                    metadata: {
                        type: result.data_source.db_type,
                        host: connection.host,
                        database: connection.database,
                        status: 'connected',
                        cube_integration: result.data_source.cube_integration
                    },
                    createdAt: new Date()
                };

                setDataSources(prev => [newSource, ...prev]);
                message.success('Database connected successfully!');
                
                // Trigger AI data modeling workflow
                setCurrentDataSourceForModeling(newSource.id);
                setModelingWorkflowVisible(true);
            } else {
                throw new Error(result.error || 'Database connection failed');
            }
        } catch (error) {
            console.error('Database connection error:', error);
            message.error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDatabaseTest = async (connection: DatabaseConnection): Promise<boolean> => {
        try {
            const response = await fetch('http://localhost:8000/data/connect-database', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...connection,
                    test_only: true
                }),
            });

            if (!response.ok) {
                return false;
            }

            const result = await response.json();
            return result.success;
        } catch (error) {
            console.error('Database test error:', error);
            return false;
        }
    };

    const handlePreview = (source: DataSource) => {
        // Mock preview data
        const mockPreviewData = {
            schema: [
                { name: 'id', type: 'integer' },
                { name: 'name', type: 'string' },
                { name: 'value', type: 'decimal' },
                { name: 'date', type: 'datetime' }
            ],
            data: [
                { id: 1, name: 'Product A', value: 299.99, date: '2024-01-15' },
                { id: 2, name: 'Product B', value: 199.99, date: '2024-01-16' },
                { id: 3, name: 'Product C', value: 399.99, date: '2024-01-17' }
            ]
        };
        
        setPreviewData(mockPreviewData);
        setPreviewVisible(true);
    };

    const handleDelete = (sourceId: string) => {
        Modal.confirm({
            title: 'Delete Data Source',
            content: 'Are you sure you want to delete this data source?',
            onOk: () => {
                setDataSources(prev => prev.filter(s => s.id !== sourceId));
                onSourceDelete(sourceId);
                message.success('Data source deleted successfully!');
            }
        });
    };

    const renderSourceItem = (source: DataSource) => (
        <List.Item
            key={source.id}
            actions={[
                <Button 
                    key="preview"
                    type="text" 
                    icon={<EyeOutlined />} 
                    onClick={() => handlePreview(source)}
                >
                    Preview
                </Button>,
                <Button 
                    key="model"
                    type="text" 
                    icon={<ExperimentOutlined />} 
                    onClick={() => {
                        setCurrentDataSourceForModeling(source.id);
                        setModelingWorkflowVisible(true);
                    }}
                >
                    AI Model
                </Button>,
                <Button 
                    key="delete"
                    type="text" 
                    danger 
                    icon={<DeleteOutlined />} 
                    onClick={() => handleDelete(source.id)}
                >
                    Delete
                </Button>
            ]}
            style={{
                backgroundColor: selectedSource?.id === source.id ? '#f0f8ff' : 'transparent',
                border: selectedSource?.id === source.id ? '1px solid #1890ff' : '1px solid transparent',
                borderRadius: 4,
                padding: 8,
                margin: '4px 0'
            }}
        >
            <List.Item.Meta
                avatar={source.type === 'file' ? <FileOutlined /> : <DatabaseOutlined />}
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{source.name}</span>
                        <Tag color={source.type === 'file' ? 'blue' : 'green'}>
                            {source.type.toUpperCase()}
                        </Tag>
                    </div>
                }
                description={
                    <div>
                        {source.type === 'file' && (
                            <span>Size: {source.metadata?.size} | Type: {source.metadata?.type}</span>
                        )}
                        {source.type === 'database' && (
                            <span>Type: {source.metadata?.type} | Status: {source.metadata?.status}</span>
                        )}
                        <br />
                        <small>Created: {source.createdAt.toLocaleDateString()}</small>
                    </div>
                }
            />
            <Radio 
                checked={selectedSource?.id === source.id}
                onChange={() => {
                    if (onSourceSelect && typeof onSourceSelect === 'function') {
                        onSourceSelect(source);
                    }
                    if (onDataSourceSelect && typeof onDataSourceSelect === 'function') {
                        onDataSourceSelect(source);
                    }
                }}
            />
        </List.Item>
    );

    const fileSources = dataSources.filter(s => s.type === 'file');
    const dbSources = dataSources.filter(s => s.type === 'database');

    return (
        <div style={{ width: '100%' }}>
            <Card title="Data Source Manager" style={{ marginBottom: 16 }}>
                <Tabs 
                    activeKey={activeTab} 
                    onChange={setActiveTab}
                    items={[
                        {
                            key: 'files',
                            label: (
                                <span>
                                    <FileOutlined />
                                    Files ({fileSources.length})
                                </span>
                            ),
                            children: (
                                <div>
                                    <div style={{ marginBottom: 16 }}>
                                        <UploadDragger onUpload={handleFileUpload} />
                                    </div>
                                    
                                    <List
                                        dataSource={fileSources}
                                        renderItem={renderSourceItem}
                                        locale={{ emptyText: 'No files uploaded yet' }}
                                    />
                                </div>
                            )
                        },
                        {
                            key: 'databases',
                            label: (
                                <span>
                                    <DatabaseOutlined />
                                    Databases ({dbSources.length})
                                </span>
                            ),
                            children: (
                                <div>
                                    <div style={{ marginBottom: 16 }}>
                                        <DatabaseConnector
                                            onConnect={handleDatabaseConnect}
                                            onTest={handleDatabaseTest}
                                            loading={loading}
                                        />
                                    </div>
                                    
                                    <List
                                        dataSource={dbSources}
                                        renderItem={renderSourceItem}
                                        locale={{ emptyText: 'No databases connected yet' }}
                                    />
                                </div>
                            )
                        }
                    ]}
                />
            </Card>

            {/* Preview Modal */}
            <Modal
                title="Data Preview"
                open={previewVisible}
                onCancel={() => setPreviewVisible(false)}
                footer={null}
                width={800}
            >
                {previewData && (
                    <div>
                        <h4>Schema</h4>
                        <div style={{ marginBottom: 16 }}>
                            {previewData.schema.map((col: any, idx: number) => (
                                <Tag key={idx} color="blue">
                                    {col.name}: {col.type}
                                </Tag>
                            ))}
                        </div>
                        
                        <h4>Sample Data</h4>
                        <div style={{ maxHeight: 300, overflow: 'auto' }}>
                            <pre>{JSON.stringify(previewData.data, null, 2)}</pre>
                        </div>
                    </div>
                )}
            </Modal>

            {/* AI Data Modeling Workflow Modal */}
            <Modal
                title="AI Data Modeling"
                open={modelingWorkflowVisible}
                onCancel={() => {
                    setModelingWorkflowVisible(false);
                    setCurrentDataSourceForModeling(null);
                }}
                footer={null}
                width={1200}
                centered
                destroyOnClose
            >
                {currentDataSourceForModeling && (
                    <DataModelingWorkflow
                        dataSourceId={currentDataSourceForModeling}
                        onComplete={(result) => {
                            console.log('Data modeling completed:', result);
                            message.success('Data model deployed successfully! You can now create charts.');
                            setModelingWorkflowVisible(false);
                            setCurrentDataSourceForModeling(null);
                        }}
                        onCancel={() => {
                            setModelingWorkflowVisible(false);
                            setCurrentDataSourceForModeling(null);
                        }}
                    />
                )}
            </Modal>
        </div>
    );
};

export default DataSourceManager;