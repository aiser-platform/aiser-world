'use client';

import React, { useState, useEffect } from 'react';
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
import { useAuth } from '@/context/AuthContext';

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
                return <BarChartOutlined style={{ color: '#1890ff' }} />;
            case 'line':
                return <LineChartOutlined style={{ color: '#52c41a' }} />;
            case 'pie':
                return <PieChartOutlined style={{ color: '#722ed1' }} />;
            case 'scatter':
                return <BarChartOutlined style={{ color: '#fa8c16' }} />;
            case 'area':
                return <LineChartOutlined style={{ color: '#13c2c2' }} />;
            case 'gauge':
                return <BarChartOutlined style={{ color: '#eb2f96' }} />;
            case 'table':
                return <BarChartOutlined style={{ color: '#2f54eb' }} />;
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
                            backgroundColor: '#f0f0f0', 
                            borderRadius: 4,
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
                                <Text type="secondary" style={{ fontSize: '12px' }}>
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
                <div>Loading...</div>
            </div>
        );
    }

    return (
        <div style={{ padding: 24 }}>
            <div style={{ marginBottom: 24 }}>
                <Title level={2}>Charts</Title>
                <Text type="secondary">
                    Create, manage, and share your data visualizations
                </Text>
            </div>

            {/* Statistics Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Total Charts"
                            value={stats.total}
                            prefix={<BarChartOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Active"
                            value={stats.active}
                            valueStyle={{ color: '#3f8600' }}
                            prefix={<BarChartOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Drafts"
                            value={stats.draft}
                            valueStyle={{ color: '#1890ff' }}
                            prefix={<BarChartOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Public"
                            value={stats.public}
                            valueStyle={{ color: '#722ed1' }}
                            prefix={<ShareAltOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Chart Type Statistics */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Bar Charts"
                            value={chartTypeStats.bar}
                            prefix={<BarChartOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Line Charts"
                            value={chartTypeStats.line}
                            prefix={<LineChartOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Pie Charts"
                            value={chartTypeStats.pie}
                            prefix={<PieChartOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Other Types"
                            value={chartTypeStats.other}
                            prefix={<FileImageOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Actions and Filters */}
            <div style={{ marginBottom: 16 }}>
                <Row justify="space-between" align="middle">
                    <Col>
                        <Space>
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={handleCreateChart}
                            >
                                Create Chart
                            </Button>
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={loadCharts}
                                loading={loading}
                            >
                                Refresh
                            </Button>
                        </Space>
                    </Col>
                    <Col>
                        <Space>
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
                                prefix={<FilterOutlined />}
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
                    </Col>
                </Row>
            </div>

            <Divider />

            {/* Charts Table */}
            <Card>
                <Table
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
