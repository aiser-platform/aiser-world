'use client';

// Simple dynamic configuration that actually works

import React, { useState, useEffect } from 'react';
import {
    Card,
    Button,
    Table,
    Space,
    Tag,
    Modal,
    message,
    Tooltip,
    Row,
    Col,
    Statistic,
    Typography,
    Divider
} from 'antd';
import {
    DatabaseOutlined,
    FileOutlined,
    PlusOutlined,
    EyeOutlined,
    DeleteOutlined,
    ExperimentOutlined,
    CloudUploadOutlined,
    LinkOutlined,
    BarChartOutlined
} from '@ant-design/icons';
import AiserLogo from '@/app/components/Logo/AiserLogo';
import { apiService } from '@/services/apiService';
import UniversalDataSourceModal from '@/app/components/UniversalDataSourceModal/UniversalDataSourceModal';
import { IFileUpload } from '@/app/components/FileUpload/types';
import { getBackendUrlForApi } from '@/utils/backendUrl';

const { Title, Text } = Typography;

interface DataSource {
    id: string;
    name: string;
    type: 'file' | 'database';
    status: 'connected' | 'disconnected' | 'error';
    lastUsed: string;
    rowCount?: number;
    columns?: string[];
    size?: string;
}

const DataSourcesPage: React.FC = () => {
    const [dataSources, setDataSources] = useState<DataSource[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedDataSource, setSelectedDataSource] = useState<DataSource | null>(null);
    const [aiModelingLoading, setAiModelingLoading] = useState(false);
    const [uploadModalVisible, setUploadModalVisible] = useState(false);
    const [stats, setStats] = useState({
        totalSources: 0,
        connectedSources: 0,
        totalRows: 0,
        fileUploads: 0
    });

    useEffect(() => {
        loadDataSources();
    }, []);

    const loadDataSources = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${getBackendUrlForApi()}/data/sources`);
            const result = await response.json();
            
            if (result.success) {
                setDataSources(result.data_sources || []);
                updateStats(result.data_sources || []);
            }
        } catch (error) {
            console.error('Failed to load data sources:', error);
            // Mock data for development
            const mockData: DataSource[] = [
                {
                    id: 'file_1',
                    name: 'Sales Data Q4 2024',
                    type: 'file',
                    status: 'connected',
                    lastUsed: '2024-01-10',
                    rowCount: 1250,
                    columns: ['date', 'product', 'sales_amount', 'region'],
                    size: '2.3 MB'
                },
                {
                    id: 'db_1',
                    name: 'Production Database',
                    type: 'database',
                    status: 'connected',
                    lastUsed: '2024-01-09',
                    rowCount: 50000,
                    columns: ['users', 'orders', 'products']
                }
            ];
            setDataSources(mockData);
            updateStats(mockData);
        } finally {
            setLoading(false);
        }
    };

    const updateStats = (sources: DataSource[]) => {
        const stats = {
            totalSources: sources.length,
            connectedSources: sources.filter(s => s.status === 'connected').length,
            totalRows: sources.reduce((sum, s) => sum + (s.rowCount || 0), 0),
            fileUploads: sources.filter(s => s.type === 'file').length
        };
        setStats(stats);
    };

    const handleDeleteDataSource = async (id: string) => {
        try {
            const response = await fetch(`${getBackendUrlForApi()}/data/sources/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                message.success('Data source deleted successfully');
                loadDataSources();
            } else {
                throw new Error('Failed to delete data source');
            }
        } catch (error) {
            message.error('Failed to delete data source');
        }
    };

    const handleViewDataSource = (dataSource: DataSource) => {
        setSelectedDataSource(dataSource);
        setModalVisible(true);
    };

    const handleAIDataModeling = async (dataSource: DataSource) => {
        setAiModelingLoading(true);
        try {
            // For file-based data sources, we need to provide sample data
            let sampleData: Record<string, any>[] = [];
            
            if (dataSource.type === 'file' && dataSource.columns) {
                // Create sample data structure based on columns
                sampleData = [
                    dataSource.columns.reduce((acc, col) => {
                        acc[col] = `sample_${col}`;
                        return acc;
                    }, {} as Record<string, any>)
                ];
            }
            
            const result = await apiService.performAIDataModeling(
                dataSource.id,
                `Business context for ${dataSource.name}`,
                sampleData
            );
            
            if (result.success) {
                message.success('AI data modeling completed successfully!');
                // Navigate to chat with the modeling results
                window.location.href = `/chat?dataSource=${dataSource.id}&modeling=complete`;
            } else {
                throw new Error(result.error || 'AI data modeling failed');
            }
        } catch (error) {
            console.error('AI data modeling error:', error);
            message.error('AI data modeling failed. Please try again.');
        } finally {
            setAiModelingLoading(false);
        }
    };

    const handleFileUpload = (fileData?: IFileUpload) => {
        if (fileData) {
            // Add the uploaded file to data sources
            const newDataSource: DataSource = {
                id: fileData.uuid_filename,
                name: fileData.filename,
                type: 'file',
                status: 'connected',
                lastUsed: new Date().toISOString().split('T')[0],
                rowCount: 0, // Will be updated when data is analyzed
                columns: [], // Will be populated when data is analyzed
                size: `${(fileData.file_size / 1024 / 1024).toFixed(2)} MB`
            };
            
            setDataSources(prev => [...prev, newDataSource]);
            updateStats([...dataSources, newDataSource]);
            message.success(`File ${fileData.filename} uploaded successfully!`);
            
            // Automatically start AI data modeling for the uploaded file
            setTimeout(() => {
                handleAIDataModeling(newDataSource);
            }, 1000);
        }
    };

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record: DataSource) => (
                <Space>
                    {record.type === 'file' ? <FileOutlined /> : <DatabaseOutlined />}
                    <span>{text}</span>
                </Space>
            )
        },
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            render: (type: string) => (
                <Tag color={type === 'file' ? 'blue' : 'green'}>
                    {type?.toUpperCase() || 'UNKNOWN'}
                </Tag>
            )
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: 'connected' | 'disconnected' | 'error') => {
                const color = status === 'connected' ? 'success' : status === 'error' ? 'error' : 'warning';
                return <Tag color={color}>{status?.toUpperCase() || 'UNKNOWN'}</Tag>;
            }
        },
        {
            title: 'Rows',
            dataIndex: 'rowCount',
            key: 'rowCount',
            render: (count: number) => count ? count.toLocaleString() : 'N/A'
        },
        {
            title: 'Last Used',
            dataIndex: 'lastUsed',
            key: 'lastUsed'
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: DataSource) => (
                <Space>
                    <Tooltip title="View Details">
                        <Button 
                            type="text" 
                            icon={<EyeOutlined />} 
                            onClick={() => handleViewDataSource(record)}
                        />
                    </Tooltip>
                    <Tooltip title="AI Data Modeling">
                        <Button 
                            type="text" 
                            icon={<ExperimentOutlined />}
                            loading={aiModelingLoading}
                            onClick={() => handleAIDataModeling(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Create Chart">
                        <Button 
                            type="text" 
                            icon={<BarChartOutlined />}
                            onClick={() => {
                                // Navigate to chart creation
                                window.location.href = `/chat?dataSource=${record.id}&action=chart`;
                            }}
                        />
                    </Tooltip>
                    <Tooltip title="Delete">
                        <Button 
                            type="text" 
                            danger 
                            icon={<DeleteOutlined />}
                            onClick={() => {
                                Modal.confirm({
                                    title: 'Delete Data Source',
                                    content: `Are you sure you want to delete "${record.name}"?`,
                                    onOk: () => handleDeleteDataSource(record.id)
                                });
                            }}
                        />
                    </Tooltip>
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: '24px', height: '100vh', overflowY: 'auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <DatabaseOutlined />
                            Data Sources
                        </Title>
                        <Text type="secondary">
                            Manage your data connections, files, and databases
                        </Text>
                    </div>
                    <AiserLogo size={48} />
                </div>
            </div>

            {/* Statistics */}
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="Total Sources"
                            value={stats.totalSources}
                            prefix={<DatabaseOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="Connected"
                            value={stats.connectedSources}
                            prefix={<LinkOutlined />}
                            valueStyle={{ color: '#3f8600' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="Total Rows"
                            value={stats.totalRows}
                            prefix={<BarChartOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card>
                        <Statistic
                            title="File Uploads"
                            value={stats.fileUploads}
                            prefix={<CloudUploadOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Quick Actions */}
            <Card style={{ marginBottom: '24px' }}>
                <Title level={4}>Quick Actions</Title>
                <Space wrap>
                    <Button 
                        type="primary" 
                        icon={<CloudUploadOutlined />}
                        onClick={() => setUploadModalVisible(true)}
                    >
                        Upload File
                    </Button>
                    <Button 
                        icon={<DatabaseOutlined />}
                        onClick={() => setModalVisible(true)}
                    >
                        Connect Data Source
                    </Button>
                    <Button 
                        icon={<ExperimentOutlined />}
                        onClick={() => window.location.href = '/chat'}
                    >
                        AI Analysis
                    </Button>
                    <Button 
                        type="dashed"
                        icon={<ExperimentOutlined />}
                        loading={aiModelingLoading}
                        onClick={() => {
                            if (dataSources.length > 0) {
                                const firstDataSource = dataSources[0];
                                handleAIDataModeling(firstDataSource);
                            } else {
                                message.info('Please add a data source first to perform AI data modeling');
                            }
                        }}
                    >
                        AI Data Modeling
                    </Button>
                </Space>
            </Card>

            {/* Data Sources Table */}
            <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <Title level={4} style={{ margin: 0 }}>Your Data Sources</Title>
                    <Button 
                        type="primary" 
                        icon={<PlusOutlined />}
                        onClick={() => setModalVisible(true)}
                    >
                        Add Data Source
                    </Button>
                </div>
                
                <Table
                    columns={columns}
                    dataSource={dataSources}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) => 
                            `${range[0]}-${range[1]} of ${total} data sources`
                    }}
                />
            </Card>

            {/* Universal Data Source Modal */}
            <UniversalDataSourceModal
                isOpen={modalVisible || uploadModalVisible}
                onClose={() => {
                    setModalVisible(false);
                    setUploadModalVisible(false);
                }}
                onDataSourceCreated={(dataSource) => {
                    // Add the new data source to the list
                    const newDataSource: DataSource = {
                        id: dataSource.id,
                        name: dataSource.name,
                        type: dataSource.type,
                        status: 'connected',
                        lastUsed: new Date().toISOString().split('T')[0],
                        rowCount: 0,
                        columns: [],
                        size: dataSource.type === 'file' ? 'N/A' : undefined
                    };
                    
                    setDataSources(prev => [...prev, newDataSource]);
                    updateStats([...dataSources, newDataSource]);
                    message.success(`Data source "${dataSource.name}" created successfully!`);
                    
                    // Close the modal
                    setModalVisible(false);
                    setUploadModalVisible(false);
                }}
            />

            {/* Data Source Details Modal */}
            <Modal
                title={`Data Source: ${selectedDataSource?.name}`}
                open={!!selectedDataSource && !modalVisible}
                onCancel={() => setSelectedDataSource(null)}
                footer={[
                    <Button key="close" onClick={() => setSelectedDataSource(null)}>
                        Close
                    </Button>,
                    <Button 
                        key="analyze" 
                        type="primary" 
                        icon={<ExperimentOutlined />}
                        onClick={() => {
                            window.location.href = `/chat?dataSource=${selectedDataSource?.id}`;
                        }}
                    >
                        Analyze with AI
                    </Button>
                ]}
                width={600}
            >
                {selectedDataSource && (
                    <div>
                        <Row gutter={[16, 16]}>
                            <Col span={12}>
                                <Text strong>Type:</Text>
                                <div>
                                    <Tag color={selectedDataSource.type === 'file' ? 'blue' : 'green'}>
                                        {selectedDataSource.type?.toUpperCase() || 'UNKNOWN'}
                                    </Tag>
                                </div>
                            </Col>
                            <Col span={12}>
                                <Text strong>Status:</Text>
                                <div>
                                    <Tag color={selectedDataSource.status === 'connected' ? 'success' : 'error'}>
                                        {selectedDataSource.status?.toUpperCase() || 'UNKNOWN'}
                                    </Tag>
                                </div>
                            </Col>
                            <Col span={12}>
                                <Text strong>Rows:</Text>
                                <div>{selectedDataSource.rowCount?.toLocaleString() || 'N/A'}</div>
                            </Col>
                            <Col span={12}>
                                <Text strong>Last Used:</Text>
                                <div>{selectedDataSource.lastUsed}</div>
                            </Col>
                        </Row>
                        
                        {selectedDataSource.columns && (
                            <>
                                <Divider />
                                <Text strong>Columns:</Text>
                                <div style={{ marginTop: '8px' }}>
                                    <Space wrap>
                                        {selectedDataSource.columns.map(col => (
                                            <Tag key={col}>{col}</Tag>
                                        ))}
                                    </Space>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default DataSourcesPage;