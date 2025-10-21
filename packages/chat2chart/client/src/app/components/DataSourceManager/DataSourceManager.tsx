'use client';

import React, { useState, useEffect } from 'react';
import { Card, Tabs, List, Button, Modal, Radio, Space, Tag, message, Form, Input } from 'antd';
import { FileOutlined, DatabaseOutlined, EyeOutlined, DeleteOutlined, PlusOutlined, ExperimentOutlined, EditOutlined } from '@ant-design/icons';
import UploadDragger from '../FileUpload/Dragger';
import { enhancedDataService } from '@/services/enhancedDataService';
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
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingSource, setEditingSource] = useState<DataSource | null>(null);
    const [form] = Form.useForm();
    const [activeTab, setActiveTab] = useState('files');
    const [loading, setLoading] = useState(false);
    const [modelingVisible, setModelingVisible] = useState(false);
    const [modelingData, setModelingData] = useState<any>(null);
    const [modelingFileMetadata, setModelingFileMetadata] = useState<any>(null);
    const [modelingWorkflowVisible, setModelingWorkflowVisible] = useState(false);
    const [currentDataSourceForModeling, setCurrentDataSourceForModeling] = useState<string | null>(null);

    // Load data sources from backend
    const loadDataSources = async () => {
        setLoading(true);
        try {
            const res = await enhancedDataService.listDataSources();
            if (res.success) {
                // Backend shape may differ; normalize entries minimally to satisfy DataSource[]
                const normalized = (res.data_sources || []).map((ds: any) => ({
                    id: ds.id || ds.data_source_id || ds.name,
                    name: ds.name || ds.title || ds.id,
                    type: ds.type === 'database' || ds.db_type ? 'database' : 'file',
                    data: ds,
                    metadata: ds.connection_config || ds.metadata || {},
                    createdAt: ds.created_at ? new Date(ds.created_at) : new Date()
                }));
                setDataSources(normalized as DataSource[]);
            } else {
                message.error('Failed to load data sources: ' + (res.error || 'unknown'));
            }
        } catch (err) {
            console.error('Failed to load data sources:', err);
            message.error('Failed to load data sources');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadDataSources();
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
            const response = await fetch('/api/data/connect-database', {
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
            const response = await fetch('/api/data/connect-database', {
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

    const handlePreview = async (source: DataSource) => {
        setLoading(true);
        try {
            const res = await enhancedDataService.getDataSourceSchema(source.id);
            if (res.success && res.schema) {
                // Convert schema to previewData format
                const schemaObj = res.schema;
                const cols: any[] = [];
                // If schema is a mapping of table->columns, pick first table
                if (schemaObj && typeof schemaObj === 'object') {
                    const firstKey = Object.keys(schemaObj)[0];
                    const colList = Array.isArray(schemaObj[firstKey]) ? schemaObj[firstKey] : [];
                    for (const c of colList) {
                        cols.push({ name: c.column_name || c.name || c[0], type: c.data_type || c.type || 'string' });
                    }
                }

                setPreviewData({ schema: cols, data: [] });
                setPreviewVisible(true);
            } else {
                message.warning('Schema not available for preview');
            }
        } catch (err) {
            console.error('Failed to load schema preview:', err);
            message.error('Failed to load schema preview');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (sourceId: string) => {
        Modal.confirm({
            title: 'Delete Data Source',
            content: 'Are you sure you want to delete this data source?',
            onOk: async () => {
                try {
                    const resp = await enhancedDataService.deleteDataSource(sourceId);
                    if (!resp.success) throw new Error(resp.error || 'Delete failed');
                    setDataSources(prev => prev.filter(s => s.id !== sourceId));
                    try { onSourceDelete && onSourceDelete(sourceId); } catch (e) {}
                    message.success('Data source deleted successfully!');
                } catch (err) {
                    console.error('Failed to delete data source:', err);
                    message.error('Failed to delete data source: ' + (err instanceof Error ? err.message : String(err)));
                }
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
                <Button type="text" key="edit" icon={<EditOutlined />} onClick={() => openEditModal(source)}>Edit</Button>,
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
                            {source.type?.toUpperCase() || 'UNKNOWN'}
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

    const openEditModal = (source: DataSource) => {
        setEditingSource(source);
        const initial: any = { name: source.name, description: source.metadata?.description || '' };
        // If database source, prefill editable connection fields (mask sensitive ones)
        if (source.type === 'database') {
            initial.host = (source.data && source.data.host) || source.metadata?.host || '';
            initial.port = (source.data && source.data.port) || '';
            initial.database = (source.data && source.data.database) || source.metadata?.database || '';
            initial.username = (source.data && source.data.username) || '';
            // Mask password in the UI; only send if changed
            initial.password = (source.data && source.data.password) ? '****' : '';
        }
        form.setFieldsValue(initial);
        setEditModalVisible(true);
    };

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
                                    
                <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                    <List
                        dataSource={fileSources}
                        renderItem={renderSourceItem}
                        locale={{ emptyText: 'No files uploaded yet' }}
                    />
                </div>
                </div>
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
                                    
                                    <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                                        <List
                                            dataSource={dbSources}
                                            renderItem={renderSourceItem}
                                            locale={{ emptyText: 'No databases connected yet' }}
                                        />
                                    </div>
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

            {/* Edit Modal */}
            <Modal
                title="Edit Data Source"
                open={editModalVisible}
                onCancel={() => { setEditModalVisible(false); setEditingSource(null); form.resetFields(); }}
                onOk={async () => {
                    try {
                        const values = await form.validateFields();
                        if (!editingSource) throw new Error('No source selected');
                        // Build optimistic update and payload
                        const optimistic = { ...editingSource, name: values.name, metadata: { ...(editingSource.metadata || {}), description: values.description } };
                        setDataSources(prev => prev.map(s => s.id === editingSource.id ? optimistic : s));

                        const connConfig: any = editingSource.type === 'database' ? { ...(editingSource.data || {}) } : undefined;
                        if (editingSource.type === 'database') {
                            if (values.host !== undefined) connConfig.host = values.host;
                            if (values.port !== undefined) connConfig.port = values.port;
                            if (values.database !== undefined) connConfig.database = values.database;
                            if (values.username !== undefined) connConfig.username = values.username;
                            // Only send password if changed (not '****')
                            if (values.password && values.password !== '****') connConfig.password = values.password;
                        }

                        const updatePayload = {
                            name: values.name,
                            description: values.description,
                            connection_config: connConfig
                        };

                        const resp = await enhancedDataService.updateDataSource(editingSource.id, updatePayload);
                        if (!resp.success) {
                            // Rollback optimistic update if update failed
                            setDataSources(prev => prev.map(s => s.id === editingSource.id ? editingSource : s));
                            throw new Error(resp.error || 'Update failed');
                        }

                        // Merge returned data source metadata if provided
                        const updated = resp.data_source || { id: editingSource.id, name: values.name };
                        setDataSources(prev => prev.map(s => s.id === editingSource.id ? { ...s, ...updated } : s));
                        // Refresh authoritative list from backend
                        try { await loadDataSources(); } catch (e) { /* ignore */ }
                        message.success('Data source updated');
                        setEditModalVisible(false);
                        setEditingSource(null);
                        form.resetFields();
                    } catch (err) {
                        console.error('Update failed:', err);
                        message.error('Update failed: ' + (err instanceof Error ? err.message : String(err)));
                    }
                }}
                width={600}
                destroyOnHidden
            >
                <Form form={form} layout="vertical" initialValues={{ name: '', description: '' }}>
                    <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Name is required' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                        <Input.TextArea rows={3} />
                    </Form.Item>

                    {/* Database-specific editable fields */}
                    <Form.Item shouldUpdate={(prev, cur) => prev !== cur} noStyle>
                        {() => (
                            form.getFieldValue('host') !== undefined || editingSource?.type === 'database' ? (
                                <>
                                    <Form.Item name="host" label="Host">
                                        <Input />
                                    </Form.Item>
                                    <Form.Item name="port" label="Port">
                                        <Input />
                                    </Form.Item>
                                    <Form.Item name="database" label="Database">
                                        <Input />
                                    </Form.Item>
                                    <Form.Item name="username" label="Username">
                                        <Input />
                                    </Form.Item>
                                    <Form.Item name="password" label="Password" extra="Leave as '****' to keep existing password">
                                        <Input.Password />
                                    </Form.Item>
                                </>
                            ) : null
                        )}
                    </Form.Item>
                </Form>
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
                destroyOnHidden
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