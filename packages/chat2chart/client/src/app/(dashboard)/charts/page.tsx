'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
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
    Popconfirm,
    Input,
    Select,
    Image,
} from 'antd';
import {
    PlusOutlined,
    BarChartOutlined,
    LineChartOutlined,
    PieChartOutlined,
    EyeOutlined,
    EditOutlined,
    DeleteOutlined,
    ReloadOutlined,
    ShareAltOutlined,
    DownloadOutlined,
    CopyOutlined,
    SearchOutlined,
    FilterOutlined,
    FileImageOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import LoadingStates from '@/app/components/LoadingStates';
import { usePermissions, Permission } from '@/hooks/usePermissions';
import { PermissionGuard } from '@/components/PermissionGuard';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

interface Chart {
    id: string;
    name: string;
    type: 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'gauge' | 'table';
    description?: string;
    status: 'active' | 'draft' | 'archived';
    data_source?: string;
    last_modified: string;
    created_at: string;
    created_by: string;
    is_public: boolean;
    is_template: boolean;
    tags?: string[];
    thumbnail?: string;
    config?: any;
    data_count?: number;
}

const ChartsPage: React.FC = () => {
    const [charts, setCharts] = useState<Chart[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const router = useRouter();
    const { user, isAuthenticated } = useAuth();
    const { hasPermission } = usePermissions();

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
    }, [isAuthenticated, router]);

    useEffect(() => {
        if (isAuthenticated) {
            loadCharts();
        }
    }, [isAuthenticated]);

    const loadCharts = async () => {
        setLoading(true);
        try {
            // Using the charts API endpoint
            const response = await fetch('/api/charts/');
            const result = await response.json();
            
            if (result.success) {
                setCharts(result.charts || []);
            } else {
                message.error(`Failed to load charts: ${result.error}`);
            }
        } catch (error) {
            message.error('Failed to load charts');
            console.error('Error loading charts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateChart = () => {
        router.push('/dash-studio?tab=chart');
    };

    const handleEditChart = (chart: Chart) => {
        router.push(`/dash-studio?tab=chart&id=${chart.id}`);
    };

    const handleViewChart = (chart: Chart) => {
        router.push(`/dash-studio?tab=chart&id=${chart.id}&mode=view`);
    };

    const handleDeleteChart = async (chartId: string) => {
        try {
            const response = await fetch(`/api/charts/${chartId}`, {
                method: 'DELETE',
            });
            
            if (response.ok) {
                message.success('Chart deleted successfully');
                loadCharts();
            } else {
                throw new Error('Failed to delete chart');
            }
        } catch (error) {
            message.error('Failed to delete chart');
            console.error('Error deleting chart:', error);
        }
    };

    const handleShareChart = async (chart: Chart) => {
        try {
            const response = await fetch(`/api/charts/${chart.id}/share`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    is_public: !chart.is_public
                }),
            });
            
            if (response.ok) {
                message.success(`Chart ${chart.is_public ? 'unshared' : 'shared'} successfully`);
                loadCharts();
            } else {
                throw new Error('Failed to share chart');
            }
        } catch (error) {
            message.error('Failed to share chart');
            console.error('Error sharing chart:', error);
        }
    };

    const handleExportChart = async (chart: Chart) => {
        try {
            const response = await fetch(`/api/charts/${chart.id}/export`);
            const result = await response.json();
            
            if (result.success) {
                // Create download link for the exported chart
                const link = document.createElement('a');
                link.href = result.export_url;
                link.download = `${chart.name}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                message.success('Chart exported successfully');
            } else {
                throw new Error('Failed to export chart');
            }
        } catch (error) {
            message.error('Failed to export chart');
            console.error('Error exporting chart:', error);
        }
    };

    const handleDuplicateChart = async (chart: Chart) => {
        try {
            const response = await fetch(`/api/charts/${chart.id}/duplicate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: `${chart.name} (Copy)`
                }),
            });
            
            if (response.ok) {
                message.success('Chart duplicated successfully');
                loadCharts();
            } else {
                throw new Error('Failed to duplicate chart');
            }
        } catch (error) {
            message.error('Failed to duplicate chart');
            console.error('Error duplicating chart:', error);
        }
    };

    const getChartIcon = (type: string) => {
        switch (type) {
            case 'bar':
                return <BarChartOutlined style={{ color: 'var(--color-brand-primary)' }} />;
            case 'line':
                return <LineChartOutlined style={{ color: 'var(--color-functional-success)' }} />;
            case 'pie':
                return <PieChartOutlined style={{ color: 'var(--color-functional-info)' }} />;
            case 'scatter':
                return <BarChartOutlined style={{ color: 'var(--color-functional-warning)' }} />;
            case 'area':
                return <LineChartOutlined style={{ color: 'var(--color-functional-info)' }} />;
            case 'gauge':
                return <BarChartOutlined style={{ color: 'var(--color-functional-danger)' }} />;
            case 'table':
                return <BarChartOutlined style={{ color: 'var(--color-brand-primary)' }} />;
            default:
                return <BarChartOutlined />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'success';
            case 'draft':
                return 'processing';
            case 'archived':
                return 'default';
            default:
                return 'default';
        }
    };

    const filteredCharts = charts.filter(chart => {
        const matchesSearch = chart.name.toLowerCase().includes(searchText.toLowerCase()) ||
                            chart.description?.toLowerCase().includes(searchText.toLowerCase());
        const matchesType = typeFilter === 'all' || chart.type === typeFilter;
        const matchesStatus = statusFilter === 'all' || chart.status === statusFilter;
        return matchesSearch && matchesType && matchesStatus;
    });

    const columns = [
        {
            title: 'Chart',
            key: 'chart',
            width: 80,
            render: (_: any, record: Chart) => (
                <div style={{ textAlign: 'center' }}>
                    {record.thumbnail ? (
                        <Image
                            src={record.thumbnail}
                            alt={record.name}
                            width={40}
                            height={30}
                            style={{ objectFit: 'cover', borderRadius: 4 }}
                        />
                    ) : (
                        <div style={{ 
                            width: 40, 
                            height: 30, 
                            backgroundColor: 'var(--color-surface-raised)', 
                            borderRadius: 'var(--radius-sm)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {getChartIcon(record.type)}
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record: Chart) => (
                <Space>
                    {getChartIcon(record.type)}
                    <div>
                        <Text strong>{text}</Text>
                        {record.description && (
                            <div>
                                <Text type="secondary" style={{ fontSize: 'var(--font-size-sm)' }}>
                                    {record.description}
                                </Text>
                            </div>
                        )}
                    </div>
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
                    {status.toUpperCase()}
                </Tag>
            ),
        },
        {
            title: 'Data Source',
            dataIndex: 'data_source',
            key: 'data_source',
            render: (source: string) => source || '-',
        },
        {
            title: 'Data Points',
            dataIndex: 'data_count',
            key: 'data_count',
            render: (count: number) => count ? count.toLocaleString() : '-',
        },
        {
            title: 'Visibility',
            key: 'visibility',
            render: (_: any, record: Chart) => (
                <Space>
                    {record.is_public ? (
                        <Tag color="green">Public</Tag>
                    ) : (
                        <Tag color="default">Private</Tag>
                    )}
                    {record.is_template && (
                        <Tag color="purple">Template</Tag>
                    )}
                </Space>
            ),
        },
        {
            title: 'Last Modified',
            dataIndex: 'last_modified',
            key: 'last_modified',
            render: (date: string) => new Date(date).toLocaleDateString(),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: Chart) => (
                <Space>
                    <Tooltip title="View Chart">
                        <Button
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => handleViewChart(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Edit Chart">
                        <Button
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => handleEditChart(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Duplicate Chart">
                        <Button
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={() => handleDuplicateChart(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Share Chart">
                        <Button
                            size="small"
                            icon={<ShareAltOutlined />}
                            onClick={() => handleShareChart(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Export Chart">
                        <Button
                            size="small"
                            icon={<DownloadOutlined />}
                            onClick={() => handleExportChart(record)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="Are you sure you want to delete this chart?"
                        onConfirm={() => handleDeleteChart(record.id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Tooltip title="Delete Chart">
                            <Button
                                size="small"
                                icon={<DeleteOutlined />}
                                danger
                            />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const stats = {
        total: charts.length,
        active: charts.filter(c => c.status === 'active').length,
        draft: charts.filter(c => c.status === 'draft').length,
        public: charts.filter(c => c.is_public).length,
    };

    const chartTypeStats = {
        bar: charts.filter(c => c.type === 'bar').length,
        line: charts.filter(c => c.type === 'line').length,
        pie: charts.filter(c => c.type === 'pie').length,
        other: charts.filter(c => !['bar', 'line', 'pie'].includes(c.type)).length,
    };

    // Show loading while checking authentication
    if (!isAuthenticated) {
        return (
            <div style={{ padding: 24, textAlign: 'center' }}>
                <LoadingStates type="chart" message="Loading charts..." />
            </div>
        );
    }

    return (
        <div className="page-wrapper" style={{ paddingLeft: '24px', paddingRight: '24px', paddingTop: '24px', paddingBottom: '24px' }}>
            <div className="page-header" style={{ marginBottom: '24px' }}>
                <Title level={2} className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <BarChartOutlined style={{ color: 'var(--ant-color-primary)', fontSize: '24px' }} />
                    Charts
                </Title>
                <Text type="secondary" className="page-description" style={{ marginTop: '4px', marginBottom: '0' }}>
                    Create, manage, and share your data visualizations
                </Text>
            </div>

            {/* Statistics Cards */}
            <Row gutter={[24, 24]} style={{ marginTop: 0, marginBottom: '24px' }}>
                <Col xs={24} sm={12} md={6}>
                    <Card className="stat-card">
                        <Statistic
                            title="Total Charts"
                            value={stats.total}
                            prefix={<BarChartOutlined style={{ color: 'var(--color-brand-primary)' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card className="stat-card">
                        <Statistic
                            title="Active"
                            value={stats.active}
                            valueStyle={{ color: 'var(--color-functional-success)' }}
                            prefix={<BarChartOutlined style={{ color: 'var(--color-functional-success)' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card className="stat-card">
                        <Statistic
                            title="Drafts"
                            value={stats.draft}
                            valueStyle={{ color: 'var(--color-brand-primary)' }}
                            prefix={<BarChartOutlined style={{ color: 'var(--color-brand-primary)' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card className="stat-card">
                        <Statistic
                            title="Public"
                            value={stats.public}
                            valueStyle={{ color: 'var(--color-functional-info)' }}
                            prefix={<ShareAltOutlined style={{ color: 'var(--color-functional-info)' }} />}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Chart Type Statistics */}
            <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
                <Col xs={24} sm={12} md={6}>
                    <Card className="stat-card">
                        <Statistic
                            title="Bar Charts"
                            value={chartTypeStats.bar}
                            prefix={<BarChartOutlined style={{ color: 'var(--color-brand-primary)' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card className="stat-card">
                        <Statistic
                            title="Line Charts"
                            value={chartTypeStats.line}
                            prefix={<LineChartOutlined style={{ color: 'var(--color-functional-success)' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card className="stat-card">
                        <Statistic
                            title="Pie Charts"
                            value={chartTypeStats.pie}
                            prefix={<PieChartOutlined style={{ color: 'var(--color-functional-info)' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card className="stat-card">
                        <Statistic
                            title="Other Types"
                            value={chartTypeStats.other}
                            prefix={<FileImageOutlined style={{ color: 'var(--color-text-tertiary)' }} />}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Actions and Filters */}
            <div className="page-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <Space size="large" style={{ flex: '0 0 auto' }}>
                    <PermissionGuard permission={Permission.CHART_EDIT}>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={handleCreateChart}
                            className="action-button-primary"
                        >
                            Create Chart
                        </Button>
                    </PermissionGuard>
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={loadCharts}
                        loading={loading}
                        className="action-button-secondary"
                    >
                        Refresh
                    </Button>
                </Space>
                <Space size="large" style={{ flex: '0 0 auto', marginLeft: 'auto' }}>
                    <Search
                        placeholder="Search charts..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        style={{ width: 200 }}
                        prefix={<SearchOutlined />}
                    />
                    <Select
                        value={typeFilter}
                        onChange={setTypeFilter}
                        style={{ width: 120 }}
                    >
                        <Option value="all">All Types</Option>
                        <Option value="bar">Bar</Option>
                        <Option value="line">Line</Option>
                        <Option value="pie">Pie</Option>
                        <Option value="scatter">Scatter</Option>
                        <Option value="area">Area</Option>
                        <Option value="gauge">Gauge</Option>
                        <Option value="table">Table</Option>
                    </Select>
                    <Select
                        value={statusFilter}
                        onChange={setStatusFilter}
                        style={{ width: 120 }}
                    >
                        <Option value="all">All Status</Option>
                        <Option value="active">Active</Option>
                        <Option value="draft">Draft</Option>
                        <Option value="archived">Archived</Option>
                    </Select>
                </Space>
            </div>

            <Divider className="page-divider" />

            {/* Charts Table */}
            <Card className="content-card">
                <Table
                    className="data-table"
                    columns={columns}
                    dataSource={filteredCharts}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) =>
                            `${range[0]}-${range[1]} of ${total} charts`,
                    }}
                />
            </Card>
        </div>
    );
};

export default ChartsPage;
