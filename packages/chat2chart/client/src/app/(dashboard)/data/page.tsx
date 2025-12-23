 'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo } from 'react';
import {
    Card,
    Button,
    Table,
    Space,
    Tag,
    Modal,
    message,
    Row,
    Col,
    Statistic,
    Typography,
    Divider,
    Tooltip,
    Input,
    Segmented,
    Empty,
    Alert,
    Progress,
} from 'antd';
import {
    PlusOutlined,
    DatabaseOutlined,
    FileOutlined,
    ApiOutlined,
    CloudOutlined,
    EyeOutlined,
    EditOutlined,
    DeleteOutlined,
    ReloadOutlined,
    SearchOutlined,
    FilterOutlined,
    ArrowUpOutlined,
} from '@ant-design/icons';
import UniversalDataSourceModal from '@/app/components/UniversalDataSourceModal/UniversalDataSourceModal';
import { usePlanRestrictions } from '@/hooks/usePlanRestrictions';
import { usePermissions, Permission } from '@/hooks/usePermissions';
import { PermissionGuard } from '@/components/PermissionGuard';
import { useDataSources, useDeleteDataSource } from '@/queries/dataSources';
import { useAuth } from '@/context/AuthContext';

const { Title, Text } = Typography;

interface DataSource {
    id: string;
    name: string;
    type: 'file' | 'database' | 'warehouse' | 'api' | 'cube';
    status: 'connected' | 'disconnected' | 'error' | 'testing';
    connection_info?: any;
    lastUsed?: string;
    rowCount?: number;
    columns?: any[];
    size?: string;
    description?: string;
}

const DataSourcesPage: React.FC = () => {
    const { showUpgradePrompt, UpgradeModal } = usePlanRestrictions();
    const { hasPermission } = usePermissions();
    const { session } = useAuth();
    const [dataSources, setDataSources] = useState<DataSource[]>([]);
    const [loading, setLoading] = useState(false);
    const deleteDataSourceMutation = useDeleteDataSource();
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedDataSource, setSelectedDataSource] = useState<DataSource | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | DataSource['status']>('all');
    const [typeFilter, setTypeFilter] = useState<'all' | DataSource['type']>('all');

    // Use React Query hook for data sources
    const { data: dataSourcesData, isLoading: dataSourcesLoading, error: dataSourcesError } = useDataSources();

    useEffect(() => {
        if (dataSourcesData) {
            const sources = dataSourcesData.data_sources || dataSourcesData.data || dataSourcesData || [];
            setDataSources(Array.isArray(sources) ? sources : []);
        }
        if (dataSourcesError) {
            message.error('Failed to load data sources');
        }
    }, [dataSourcesData, dataSourcesError]);

    useEffect(() => {
        setLoading(dataSourcesLoading);
    }, [dataSourcesLoading]);

    const handleAddDataSource = () => {
        if (!canAddDataSource) {
            const limitText = dataSourcesLimit > -1 ? `${dataSourcesLimit} data source${dataSourcesLimit === 1 ? '' : 's'}` : 'your current plan limits';
            showUpgradePrompt('data_sources_limit', `You've reached ${limitText}. Upgrade to connect more sources.`);
            return;
        }
        setSelectedDataSource(null);
        setModalVisible(true);
    };

    const handleEditDataSource = (dataSource: DataSource) => {
        setSelectedDataSource(dataSource);
        setModalVisible(true);
    };

    const handleModalClose = () => {
        setModalVisible(false);
        setSelectedDataSource(null);
        // React Query will automatically refetch data sources
    };

    const handleDeleteDataSource = async (dataSource: DataSource) => {
        Modal.confirm({
            title: 'Delete Data Source',
            content: `Are you sure you want to delete "${dataSource.name}"? This action cannot be undone.`,
            okText: 'Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    await deleteDataSourceMutation.mutateAsync(dataSource.id);
                    message.success('Data source deleted successfully');
                    // React Query will automatically refetch data sources
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Failed to delete data source';
                    message.error(errorMessage);
                    console.error('Error deleting data source:', error);
                }
            },
        });
    };

    const getDataSourceIcon = (type: string) => {
        switch (type) {
            case 'database':
                return <DatabaseOutlined style={{ color: 'var(--ant-color-primary)' }} />;
            case 'file':
                return <FileOutlined style={{ color: 'var(--ant-color-success)' }} />;
            case 'api':
                return <ApiOutlined style={{ color: 'var(--ant-color-info)' }} />;
            case 'warehouse':
                return <CloudOutlined style={{ color: 'var(--ant-color-warning)' }} />;
            default:
                return <DatabaseOutlined />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'connected':
                return 'success';
            case 'disconnected':
                return 'default';
            case 'error':
                return 'error';
            case 'testing':
                return 'processing';
            default:
                return 'default';
        }
    };

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record: DataSource) => (
                <Space>
                    {getDataSourceIcon(record.type)}
                    <Text strong>{text}</Text>
                </Space>
            ),
        },
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            render: (type: string) => (
                <Tag color="blue">{type.toUpperCase()}</Tag>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
                <Tag color={getStatusColor(status)}>
                    {status ? status.toUpperCase() : 'UNKNOWN'}
                </Tag>
            ),
        },
        {
            title: 'Rows',
            dataIndex: 'rowCount',
            key: 'rowCount',
            render: (count: number) => count ? count.toLocaleString() : '-',
        },
        {
            title: 'Size',
            dataIndex: 'size',
            key: 'size',
            render: (size: string) => size || '-',
        },
        {
            title: 'Last Used',
            dataIndex: 'lastUsed',
            key: 'lastUsed',
            render: (date: string) => date || '-',
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: DataSource) => (
                <Space>
                    <PermissionGuard permission={Permission.DATA_VIEW}>
                        <Tooltip title="View Details">
                            <Button
                                size="small"
                                icon={<EyeOutlined />}
                                onClick={() => handleEditDataSource(record)}
                            />
                        </Tooltip>
                    </PermissionGuard>
                    <PermissionGuard permission={Permission.DATA_EDIT}>
                        <Tooltip title="Edit">
                            <Button
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => handleEditDataSource(record)}
                            />
                        </Tooltip>
                    </PermissionGuard>
                    <PermissionGuard permission={Permission.DATA_DELETE}>
                        <Tooltip title="Delete">
                            <Button
                                size="small"
                                icon={<DeleteOutlined />}
                                danger
                                onClick={() => handleDeleteDataSource(record)}
                            />
                        </Tooltip>
                    </PermissionGuard>
                </Space>
            ),
        },
    ];

    const filteredDataSources = useMemo(() => {
        return dataSources.filter((ds) => {
            const matchesSearch = ds.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || ds.status === statusFilter;
            const matchesType = typeFilter === 'all' || ds.type === typeFilter;
            return matchesSearch && matchesStatus && matchesType;
        });
    }, [dataSources, searchTerm, statusFilter, typeFilter]);

    const stats = {
        total: dataSources.length,
        connected: dataSources.filter(ds => ds.status === 'connected').length,
        databases: dataSources.filter(ds => ds.type === 'database').length,
        files: dataSources.filter(ds => ds.type === 'file').length,
        apis: dataSources.filter(ds => ds.type === 'api').length,
        warehouses: dataSources.filter(ds => ds.type === 'warehouse' || ds.type === 'cube').length,
    };

    // No organization limits - unlimited data sources
    const dataSourcesLimit = -1;
    const dataSourcesUsedCount = stats.total;
    const dataSourcesPercent = 0;
    const canAddDataSource = true;

    return (
        <div className="page-wrapper" style={{ paddingLeft: '24px', paddingRight: '24px', paddingTop: '24px', paddingBottom: '24px' }}>
            <div className="page-header" style={{ marginBottom: '24px' }}>
                <Title level={2} className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <DatabaseOutlined style={{ color: 'var(--ant-color-primary)', fontSize: '24px' }} />
                    Data Sources
                </Title>
                <Text type="secondary" className="page-description" style={{ marginTop: '4px', marginBottom: '0' }}>
                    Connect and manage your data sources for analytics and visualization
                </Text>
            </div>
            <div className="page-body">
            {/* Statistics & quick actions */}
            <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
                <Col xs={24} lg={6}>
                    <Card className="stat-card" bodyStyle={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <Statistic title="Total Sources" value={stats.total} prefix={<DatabaseOutlined />} />
                        <Text type="secondary">Across all types</Text>
                    </Card>
                </Col>
                <Col xs={24} lg={6}>
                    <Card className="stat-card">
                        <Statistic title="Connected" value={stats.connected} valueStyle={{ color: 'var(--ant-color-success)' }} />
                        <Text type="secondary">Healthy connections</Text>
                    </Card>
                </Col>
                <Col xs={24} lg={6}>
                    <Card className="stat-card">
                        <Statistic title="Databases" value={stats.databases} />
                        <Text type="secondary">SQL & transactional</Text>
                    </Card>
                </Col>
                <Col xs={24} lg={6}>
                    <Card className="stat-card">
                        <Statistic title="Files & APIs" value={stats.files + stats.apis} />
                        <Text type="secondary">Flat files & services</Text>
                    </Card>
                </Col>
            </Row>

            <Card className="content-card" style={{ marginTop: 24, marginBottom: 24 }}>
                <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} md={18}>
                        <Space direction="vertical" size={4} style={{ width: '100%' }}>
                            <Text type="secondary">Connected data sources</Text>
                            <Progress
                                percent={dataSourcesPercent}
                                status={dataSourcesPercent >= 90 ? 'exception' : 'active'}
                                strokeColor={dataSourcesPercent >= 90 ? '#ff7875' : 'var(--ant-color-primary)'}
                                format={() =>
                                    dataSourcesLimit < 0
                                        ? `${dataSourcesUsedCount} connected`
                                        : `${dataSourcesUsedCount} / ${dataSourcesLimit}`
                                }
                            />
                            <Text>
                                {dataSourcesLimit < 0
                                    ? 'Unlimited source connections on this plan'
                                    : `${Math.max(dataSourcesLimit - dataSourcesUsedCount, 0)} connection${dataSourcesLimit - dataSourcesUsedCount === 1 ? '' : 's'} remaining`}
                            </Text>
                        </Space>
                    </Col>
                    <Col xs={24} md={6} style={{ textAlign: 'right' }}>
                        <Button
                            icon={<ArrowUpOutlined />}
                            onClick={() => showUpgradePrompt('data_sources_limit', 'Upgrade to connect more databases and APIs.')}
                            block
                        >
                            View Plans
                        </Button>
                    </Col>
                </Row>
                {!canAddDataSource && (
                    <Alert
                        type="warning"
                        showIcon
                        style={{ marginTop: 16 }}
                        message="You've reached your data source limit. Upgrade to connect more sources."
                    />
                )}
            </Card>

            <Card className="content-card" style={{ marginTop: 24 }}>
                <div className="page-toolbar" style={{ flexWrap: 'wrap', gap: 12 }}>
                    <Space size={12} wrap>
                        <PermissionGuard permission={Permission.DATA_EDIT}>
                            <Tooltip
                                title={
                                    canAddDataSource
                                        ? 'Connect a new database, file, or API'
                                        : `Reached your plan limit of ${dataSourcesLimit > -1 ? dataSourcesLimit : 1} data source${dataSourcesLimit === 1 ? '' : 's'}`
                                }
                            >
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={handleAddDataSource}
                                    disabled={!canAddDataSource}
                                >
                                    Add Data Source
                                </Button>
                            </Tooltip>
                        </PermissionGuard>
                        <Button 
                            icon={<ReloadOutlined />} 
                            onClick={() => window.location.reload()} 
                            loading={loading}
                        >
                            Refresh
                        </Button>
                    </Space>
                    <Space size={12} wrap style={{ marginLeft: 'auto' }}>
                        <Input
                            allowClear
                            prefix={<SearchOutlined />}
                            placeholder="Search sources"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: 220 }}
                        />
                        <Segmented
                            value={statusFilter}
                            onChange={(value) => setStatusFilter(value as typeof statusFilter)}
                            options={[
                                { label: 'All Statuses', value: 'all' },
                                { label: 'Connected', value: 'connected' },
                                { label: 'Disconnected', value: 'disconnected' },
                                { label: 'Error', value: 'error' },
                            ]}
                        />
                        <Segmented
                            value={typeFilter}
                            onChange={(value) => setTypeFilter(value as typeof typeFilter)}
                            options={[
                                { label: 'All Types', value: 'all' },
                                { label: 'Databases', value: 'database' },
                                { label: 'Files', value: 'file' },
                                { label: 'Warehouse', value: 'warehouse' },
                                { label: 'APIs', value: 'api' },
                            ]}
                        />
                    </Space>
                </div>
                <Divider className="page-divider" />
                <div style={{ minHeight: '50vh' }}>
                    <Table
                        className="data-table"
                        columns={columns}
                        dataSource={filteredDataSources}
                        rowKey="id"
                        loading={loading}
                        locale={{
                            emptyText: (
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description={
                                        searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                                            ? 'No data sources match your filters'
                                            : 'No data sources yet'
                                    }
                                />
                            ),
                        }}
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            showQuickJumper: true,
                            showTotal: (total, range) =>
                                `${range[0]}-${range[1]} of ${total} data sources`,
                        }}
                        scroll={{ x: true }}
                    />
                </div>
            </Card>

            {/* Universal Data Source Modal */}
            <UniversalDataSourceModal
                isOpen={modalVisible}
                onClose={handleModalClose}
                onDataSourceCreated={handleModalClose}
            />
            <UpgradeModal />
            </div>
        </div>
    );
};

export default DataSourcesPage;