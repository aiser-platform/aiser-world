'use client';

import React, { useState, useEffect } from 'react';
import {
    Card,
    Table,
    Button,
    Space,
    Tag,
    Typography,
    message,
    Popconfirm,
    Modal,
    Descriptions,
    Tabs,
    Empty,
    Tooltip
} from 'antd';
import {
    DatabaseOutlined,
    FileOutlined,
    DeleteOutlined,
    EyeOutlined,
    ReloadOutlined,
    PlusOutlined,
    TableOutlined
} from '@ant-design/icons';
import { IDataSource } from '../FileUpload/types';
import UploadDragger from '../FileUpload/Dragger';
import DatabaseConnector from '../DatabaseConnector/DatabaseConnector';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

export interface DataSourceManagerProps {
    onDataSourceSelect?: (dataSource: IDataSource) => void;
    selectedDataSourceId?: string;
}

const DataSourceManager: React.FC<DataSourceManagerProps> = ({
    onDataSourceSelect,
    selectedDataSourceId
}) => {
    const [dataSources, setDataSources] = useState<IDataSource[]>([]);
    const [loading, setLoading] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [showDatabaseConnector, setShowDatabaseConnector] = useState(false);
    const [previewModalVisible, setPreviewModalVisible] = useState(false);
    const [selectedDataSource, setSelectedDataSource] = useState<IDataSource | null>(null);

    useEffect(() => {
        loadDataSources();
    }, []);

    const loadDataSources = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:8000/data/sources');
            const data = await response.json();
            
            if (data.success) {
                setDataSources(data.data_sources);
            } else {
                message.error('Failed to load data sources');
            }
        } catch (error) {
            console.error('Error loading data sources:', error);
            message.error('Failed to load data sources');
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = (dataSource?: IDataSource) => {
        if (dataSource) {
            setDataSources(prev => [dataSource, ...prev]);
            setShowUpload(false);
            message.success(`File uploaded: ${dataSource.name}`);
            
            if (onDataSourceSelect) {
                onDataSourceSelect(dataSource);
            }
        }
    };

    const handleDatabaseConnect = (dataSource: IDataSource) => {
        setDataSources(prev => [dataSource, ...prev]);
        setShowDatabaseConnector(false);
        message.success(`Database connected: ${dataSource.name}`);
        
        if (onDataSourceSelect) {
            onDataSourceSelect(dataSource);
        }
    };

    const handleDeleteDataSource = async (dataSourceId: string) => {
        try {
            const response = await fetch(`http://localhost:8000/data/sources/${dataSourceId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                setDataSources(prev => prev.filter(ds => ds.id !== dataSourceId));
                message.success('Data source deleted successfully');
            } else {
                message.error(`Failed to delete data source: ${data.error}`);
            }
        } catch (error) {
            console.error('Error deleting data source:', error);
            message.error('Failed to delete data source');
        }
    };

    const handlePreviewDataSource = async (dataSource: IDataSource) => {
        setSelectedDataSource(dataSource);
        setPreviewModalVisible(true);
    };

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return 'N/A';
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    };

    const getDataSourceIcon = (dataSource: IDataSource) => {
        return dataSource.type === 'file' ? <FileOutlined /> : <DatabaseOutlined />;
    };

    const getDataSourceTag = (dataSource: IDataSource) => {
        if (dataSource.type === 'file') {
            return <Tag color="blue">{dataSource.format?.toUpperCase()}</Tag>;
        } else {
            return <Tag color="green">{dataSource.dbType?.toUpperCase()}</Tag>;
        }
    };

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record: IDataSource) => (
                <Space>
                    {getDataSourceIcon(record)}
                    <Text strong>{text}</Text>
                    {getDataSourceTag(record)}
                </Space>
            ),
        },
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            render: (type: string) => (
                <Tag color={type === 'file' ? 'blue' : 'green'}>
                    {type.toUpperCase()}
                </Tag>
            ),
        },
        {
            title: 'Rows',
            dataIndex: 'rowCount',
            key: 'rowCount',
            render: (count?: number) => count ? count.toLocaleString() : 'N/A',
        },
        {
            title: 'Size',
            dataIndex: 'size',
            key: 'size',
            render: (size?: number) => formatFileSize(size),
        },
        {
            title: 'Created',
            key: 'created',
            render: (record: IDataSource) => {
                const date = record.uploadedAt || record.createdAt;
                return date ? new Date(date).toLocaleDateString() : 'N/A';
            },
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (record: IDataSource) => (
                <Space>
                    <Tooltip title="Preview Data">
                        <Button
                            type="text"
                            icon={<EyeOutlined />}
                            onClick={() => handlePreviewDataSource(record)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="Are you sure you want to delete this data source?"
                        onConfirm={() => handleDeleteDataSource(record.id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Tooltip title="Delete">
                            <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                            />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <Card
                title={
                    <Space>
                        <TableOutlined />
                        <Title level={4} style={{ margin: 0 }}>Data Sources</Title>
                    </Space>
                }
                extra={
                    <Space>
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={loadDataSources}
                            loading={loading}
                        >
                            Refresh
                        </Button>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setShowUpload(true)}
                        >
                            Upload File
                        </Button>
                        <Button
                            icon={<DatabaseOutlined />}
                            onClick={() => setShowDatabaseConnector(true)}
                        >
                            Connect Database
                        </Button>
                    </Space>
                }
            >
                <Table
                    columns={columns}
                    dataSource={dataSources}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total) => `Total ${total} data sources`,
                    }}
                    rowSelection={onDataSourceSelect ? {
                        type: 'radio',
                        selectedRowKeys: selectedDataSourceId ? [selectedDataSourceId] : [],
                        onSelect: (record) => onDataSourceSelect(record),
                    } : undefined}
                    locale={{
                        emptyText: (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description="No data sources yet"
                            >
                                <Button type="primary" onClick={() => setShowUpload(true)}>
                                    Upload Your First File
                                </Button>
                            </Empty>
                        )
                    }}
                />
            </Card>

            {/* File Upload Modal */}
            <Modal
                title="Upload Data File"
                open={showUpload}
                onCancel={() => setShowUpload(false)}
                footer={null}
                width={600}
            >
                <UploadDragger
                    onUpload={handleFileUpload}
                    validFileTypes={['csv', 'xlsx', 'xls', 'json', 'tsv']}
                    includePreview={true}
                />
            </Modal>

            {/* Database Connector Modal */}
            <Modal
                title="Connect Database"
                open={showDatabaseConnector}
                onCancel={() => setShowDatabaseConnector(false)}
                footer={null}
                width={700}
            >
                <DatabaseConnector
                    onConnect={handleDatabaseConnect}
                    onCancel={() => setShowDatabaseConnector(false)}
                />
            </Modal>

            {/* Data Preview Modal */}
            <Modal
                title={`Preview: ${selectedDataSource?.name}`}
                open={previewModalVisible}
                onCancel={() => setPreviewModalVisible(false)}
                footer={null}
                width={1000}
            >
                {selectedDataSource && (
                    <Tabs defaultActiveKey="data">
                        <TabPane tab="Data Preview" key="data">
                            {selectedDataSource.preview && selectedDataSource.preview.length > 0 ? (
                                <Table
                                    dataSource={selectedDataSource.preview}
                                    columns={Object.keys(selectedDataSource.preview[0]).map(key => ({
                                        title: key,
                                        dataIndex: key,
                                        key: key,
                                        ellipsis: true,
                                    }))}
                                    pagination={false}
                                    scroll={{ x: true }}
                                    size="small"
                                />
                            ) : (
                                <Empty description="No preview data available" />
                            )}
                        </TabPane>
                        <TabPane tab="Schema" key="schema">
                            <Descriptions column={1} bordered size="small">
                                <Descriptions.Item label="Rows">
                                    {selectedDataSource.rowCount?.toLocaleString() || 'N/A'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Columns">
                                    {selectedDataSource.schema?.columns.length || 'N/A'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Size">
                                    {formatFileSize(selectedDataSource.size)}
                                </Descriptions.Item>
                            </Descriptions>
                            
                            {selectedDataSource.schema?.columns && (
                                <div style={{ marginTop: 16 }}>
                                    <Title level={5}>Columns</Title>
                                    <Table
                                        dataSource={selectedDataSource.schema.columns}
                                        columns={[
                                            { title: 'Name', dataIndex: 'name', key: 'name' },
                                            { 
                                                title: 'Type', 
                                                dataIndex: 'type', 
                                                key: 'type',
                                                render: (type: string) => <Tag>{type.toUpperCase()}</Tag>
                                            },
                                            { 
                                                title: 'Nullable', 
                                                dataIndex: 'nullable', 
                                                key: 'nullable',
                                                render: (nullable: boolean) => nullable ? 'Yes' : 'No'
                                            },
                                        ]}
                                        pagination={false}
                                        size="small"
                                    />
                                </div>
                            )}
                        </TabPane>
                    </Tabs>
                )}
            </Modal>
        </div>
    );
};

export default DataSourceManager;