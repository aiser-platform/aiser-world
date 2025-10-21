'use client';
export const dynamic = 'force-dynamic';
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
} from 'antd';
import {
    PlusOutlined,
    DashboardOutlined,
    EyeOutlined,
    EditOutlined,
    DeleteOutlined,
    ReloadOutlined,
    ShareAltOutlined,
    DownloadOutlined,
    CopyOutlined,
    SearchOutlined,
    FilterOutlined,
} from '@ant-design/icons';
import { dashboardAPIService } from '../dash-studio/services/DashboardAPIService';
import { useRouter } from 'next/navigation';
import LoadingStates from '@/app/components/LoadingStates';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

interface Dashboard {
    id: string;
    name: string;
    description?: string;
    status: 'active' | 'draft' | 'archived';
    widget_count: number;
    last_modified: string;
    created_at: string;
    created_by: string;
    is_public: boolean;
    is_template: boolean;
    tags?: string[];
    thumbnail?: string;
}

const DashboardsPage: React.FC = () => {
    const [dashboards, setDashboards] = useState<Dashboard[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
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
            loadDashboards();
        }
    }, [isAuthenticated]);

    const loadDashboards = async () => {
        setLoading(true);
        try {
            const result = await dashboardAPIService.listDashboards();
            
            if (result.success) {
                setDashboards(result.dashboards || []);
            } else {
                message.error(`Failed to load dashboards: ${result.error}`);
            }
        } catch (error) {
            message.error('Failed to load dashboards');
            console.error('Error loading dashboards:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateDashboard = () => {
        router.push('/dash-studio?tab=dashboard');
    };

    const handleEditDashboard = (dashboard: Dashboard) => {
        router.push(`/dash-studio?tab=dashboard&id=${dashboard.id}`);
    };

    const handleViewDashboard = (dashboard: Dashboard) => {
        router.push(`/dash-studio?tab=dashboard&id=${dashboard.id}&mode=view`);
    };

    const handleDeleteDashboard = async (dashboardId: string) => {
        try {
            await dashboardAPIService.deleteDashboard(dashboardId);
            message.success('Dashboard deleted successfully');
            loadDashboards();
        } catch (error) {
            message.error('Failed to delete dashboard');
            console.error('Error deleting dashboard:', error);
        }
    };

    const handleShareDashboard = async (dashboard: Dashboard) => {
        try {
            const result = await dashboardAPIService.shareDashboard(dashboard.id, {
                is_public: !dashboard.is_public
            });
            message.success(`Dashboard ${dashboard.is_public ? 'unshared' : 'shared'} successfully`);
            loadDashboards();
        } catch (error) {
            message.error('Failed to share dashboard');
            console.error('Error sharing dashboard:', error);
        }
    };

    const handleExportDashboard = async (dashboard: Dashboard) => {
        try {
            const result = await dashboardAPIService.exportDashboard(dashboard.id, 'json');
            // Create download link
            const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${dashboard.name}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            message.success('Dashboard exported successfully');
        } catch (error) {
            message.error('Failed to export dashboard');
            console.error('Error exporting dashboard:', error);
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

    const filteredDashboards = dashboards.filter(dashboard => {
        const matchesSearch = dashboard.name.toLowerCase().includes(searchText.toLowerCase()) ||
                            dashboard.description?.toLowerCase().includes(searchText.toLowerCase());
        const matchesStatus = statusFilter === 'all' || dashboard.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record: Dashboard) => (
                <Space>
                    <DashboardOutlined style={{ color: 'var(--color-brand-primary)' }} />
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
            title: 'Widgets',
            dataIndex: 'widget_count',
            key: 'widget_count',
            render: (count: number) => (
                <Tag color="blue">{count} widgets</Tag>
            ),
        },
        {
            title: 'Visibility',
            key: 'visibility',
            render: (_: any, record: Dashboard) => (
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
            render: (_: any, record: Dashboard) => (
                <Space>
                    <Tooltip title="View Dashboard">
                        <Button
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => handleViewDashboard(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Edit Dashboard">
                        <Button
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => handleEditDashboard(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Share Dashboard">
                        <Button
                            size="small"
                            icon={<ShareAltOutlined />}
                            onClick={() => handleShareDashboard(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Export Dashboard">
                        <Button
                            size="small"
                            icon={<DownloadOutlined />}
                            onClick={() => handleExportDashboard(record)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="Are you sure you want to delete this dashboard?"
                        onConfirm={() => handleDeleteDashboard(record.id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Tooltip title="Delete Dashboard">
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
        total: dashboards.length,
        active: dashboards.filter(d => d.status === 'active').length,
        draft: dashboards.filter(d => d.status === 'draft').length,
        public: dashboards.filter(d => d.is_public).length,
    };

    // Show loading while checking authentication
    if (!isAuthenticated) {
        return (
            <div style={{ padding: 24, textAlign: 'center' }}>
                <LoadingStates type="dashboard" message="Loading dashboards..." />
            </div>
        );
    }

    return (
        <div className="page-wrapper">
            <div className="page-header">
                <Title level={2} className="page-title">Dashboards</Title>
                <Text type="secondary" className="page-description">
                    Create, manage, and share your data dashboards
                </Text>
            </div>

            {/* Statistics Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 'var(--space-6)' }}>
                <Col xs={24} sm={12} md={6}>
                    <Card className="stat-card">
                        <Statistic
                            title="Total Dashboards"
                            value={stats.total}
                            prefix={<DashboardOutlined style={{ color: 'var(--color-brand-primary)' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card className="stat-card">
                        <Statistic
                            title="Active"
                            value={stats.active}
                            valueStyle={{ color: 'var(--color-functional-success)' }}
                            prefix={<DashboardOutlined style={{ color: 'var(--color-functional-success)' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card className="stat-card">
                        <Statistic
                            title="Drafts"
                            value={stats.draft}
                            valueStyle={{ color: 'var(--color-brand-primary)' }}
                            prefix={<DashboardOutlined style={{ color: 'var(--color-brand-primary)' }} />}
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

            {/* Actions and Filters */}
            <div className="page-toolbar">
                <div className="toolbar-left">
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleCreateDashboard}
                        className="action-button-primary"
                    >
                        Create Dashboard
                    </Button>
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={loadDashboards}
                        loading={loading}
                        className="action-button-secondary"
                    >
                        Refresh
                    </Button>
                </div>
                <div className="toolbar-right">
                    <Search
                        placeholder="Search dashboards..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        style={{ width: 200 }}
                        prefix={<SearchOutlined />}
                    />
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
                </div>
            </div>

            <Divider className="page-divider" />

            {/* Dashboards Table */}
            <Card className="content-card">
                <Table
                    className="data-table"
                    columns={columns}
                    dataSource={filteredDashboards}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) =>
                            `${range[0]}-${range[1]} of ${total} dashboards`,
                    }}
                />
            </Card>
        </div>
    );
};

export default DashboardsPage;
