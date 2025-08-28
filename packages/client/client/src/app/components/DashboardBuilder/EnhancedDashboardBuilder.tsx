'use client';

import React, { useState, useEffect } from 'react';
import {
    Card,
    Row,
    Col,
    Button,
    Space,
    Typography,
    Tabs,
    Modal,
    message,
    Tooltip,
    Popconfirm,
    Input,
    Select,
    Form,
    Divider,
    Empty,
    Badge,
    Tag
} from 'antd';
import {
    BarChartOutlined,
    LineChartOutlined,
    PieChartOutlined,
    PlusOutlined,
    SaveOutlined,
    DeleteOutlined,
    EyeOutlined,
    SettingOutlined
} from '@ant-design/icons';
import { IDataSource } from '../FileUpload/types';
import ChartRenderer from './ChartRenderer';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

export interface IChart {
    id: string;
    name: string;
    type: 'bar' | 'line' | 'pie' | 'table' | 'scatter' | 'area';
    dataSourceId: string;
    config: {
        xAxis?: string;
        yAxis?: string;
        series?: string[];
        aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
        filters?: Array<{ field: string; operator: string; value: any }>;
        sort?: { field: string; direction: 'asc' | 'desc' };
    };
    position: { x: number; y: number; width: number; height: number };
    createdAt: string;
}

export interface IDashboard {
    id: string;
    name: string;
    description?: string;
    charts: IChart[];
    layout: 'grid' | 'flexible';
    createdAt: string;
    updatedAt: string;
}

export interface EnhancedDashboardBuilderProps {
    dataSources: IDataSource[];
    onDashboardSave?: (dashboard: IDashboard) => void;
    onDashboardLoad?: (dashboardId: string) => void;
}

const EnhancedDashboardBuilder: React.FC<EnhancedDashboardBuilderProps> = ({
    dataSources,
    onDashboardSave,
    onDashboardLoad
}) => {
    const [dashboards, setDashboards] = useState<IDashboard[]>([]);
    const [currentDashboard, setCurrentDashboard] = useState<IDashboard | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showChartModal, setShowChartModal] = useState(false);
    const [selectedDataSource, setSelectedDataSource] = useState<IDataSource | null>(null);
    const [editingChart, setEditingChart] = useState<IChart | null>(null);
    const [form] = Form.useForm();
    const [chartForm] = Form.useForm();

    // Load saved dashboards from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('aiser-enhanced-dashboards');
        if (saved) {
            try {
                setDashboards(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to load dashboards:', e);
            }
        }
    }, []);

    // Save dashboards to localStorage
    const saveDashboardsToStorage = (dashboards: IDashboard[]) => {
        localStorage.setItem('aiser-enhanced-dashboards', JSON.stringify(dashboards));
    };

    const handleCreateDashboard = async (values: any) => {
        const newDashboard: IDashboard = {
            id: `dashboard_${Date.now()}`,
            name: values.name,
            description: values.description,
            charts: [],
            layout: 'grid',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const updatedDashboards = [...dashboards, newDashboard];
        setDashboards(updatedDashboards);
        saveDashboardsToStorage(updatedDashboards);
        
        setCurrentDashboard(newDashboard);
        setShowCreateModal(false);
        form.resetFields();
        message.success('Dashboard created successfully!');
    };

    const handleSaveDashboard = () => {
        if (!currentDashboard) return;

        const updatedDashboards = dashboards.map(d => 
            d.id === currentDashboard.id ? currentDashboard : d
        );
        setDashboards(updatedDashboards);
        saveDashboardsToStorage(updatedDashboards);
        
        if (onDashboardSave) {
            onDashboardSave(currentDashboard);
        }
        
        message.success('Dashboard saved successfully!');
    };

    const handleCreateChart = async (values: any) => {
        if (!currentDashboard || !selectedDataSource) return;

        const newChart: IChart = {
            id: `chart_${Date.now()}`,
            name: values.chartName,
            type: values.chartType,
            dataSourceId: selectedDataSource.id,
            config: {
                xAxis: values.xAxis,
                yAxis: values.yAxis,
                series: values.series ? [values.series] : [],
                aggregation: values.aggregation,
                filters: values.filters || [],
                sort: values.sort
            },
            position: {
                x: 0,
                y: 0,
                width: 400,
                height: 300
            },
            createdAt: new Date().toISOString()
        };

        const updatedDashboard = {
            ...currentDashboard,
            charts: [...currentDashboard.charts, newChart],
            updatedAt: new Date().toISOString()
        };

        setCurrentDashboard(updatedDashboard);
        setShowChartModal(false);
        chartForm.resetFields();
        message.success('Chart created successfully!');
    };

    const handleDeleteDashboard = (dashboardId: string) => {
        const updatedDashboards = dashboards.filter(d => d.id !== dashboardId);
        setDashboards(updatedDashboards);
        saveDashboardsToStorage(updatedDashboards);
        
        if (currentDashboard?.id === dashboardId) {
            setCurrentDashboard(null);
        }
        
        message.success('Dashboard deleted successfully!');
    };

    const handleDeleteChart = (chartId: string) => {
        if (!currentDashboard) return;

        const updatedDashboard = {
            ...currentDashboard,
            charts: currentDashboard.charts.filter(c => c.id !== chartId),
            updatedAt: new Date().toISOString()
        };

        setCurrentDashboard(updatedDashboard);
        message.success('Chart deleted successfully!');
    };

    const renderDashboardList = () => (
        <Card 
            title={
                <Space>
                    <BarChartOutlined />
                    <Title level={3} style={{ margin: 0 }}>Enhanced Dashboards</Title>
                </Space>
            }
            extra={
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreateModal(true)}>
                    Create Dashboard
                </Button>
            }
        >
            {dashboards.length === 0 ? (
                <Empty description="No dashboards yet">
                    <Button type="primary" onClick={() => setShowCreateModal(true)}>
                        Create Your First Dashboard
                    </Button>
                </Empty>
            ) : (
                <Row gutter={[16, 16]}>
                    {dashboards.map(dashboard => (
                        <Col xs={24} sm={12} md={8} lg={6} key={dashboard.id}>
                            <Card
                                hoverable
                                cover={
                                    <div style={{ 
                                        height: 200, 
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white'
                                    }}>
                                        <Space direction="vertical" align="center">
                                            <BarChartOutlined style={{ fontSize: 48 }} />
                                            <Text strong style={{ color: 'white' }}>
                                                {dashboard.charts.length} Charts
                                            </Text>
                                        </Space>
                                    </div>
                                }
                                actions={[
                                    <Tooltip title="Open">
                                        <EyeOutlined onClick={() => setCurrentDashboard(dashboard)} />
                                    </Tooltip>,
                                    <Tooltip title="Delete">
                                        <Popconfirm
                                            title="Are you sure you want to delete this dashboard?"
                                            onConfirm={() => handleDeleteDashboard(dashboard.id)}
                                            okText="Yes"
                                            cancelText="No"
                                        >
                                            <DeleteOutlined />
                                        </Popconfirm>
                                    </Tooltip>
                                ]}
                            >
                                <Card.Meta
                                    title={dashboard.name}
                                    description={
                                        <div>
                                            <Text type="secondary">{dashboard.description || 'No description'}</Text>
                                            <br />
                                            <Tag color="blue">{dashboard.layout}</Tag>
                                            <br />
                                            <Text type="secondary">
                                                Updated: {new Date(dashboard.updatedAt).toLocaleDateString()}
                                            </Text>
                                        </div>
                                    }
                                />
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}
        </Card>
    );

    const renderDashboardEditor = () => {
        if (!currentDashboard) return null;

        return (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Dashboard Header */}
                <Card
                    style={{ marginBottom: 16 }}
                    bodyStyle={{ padding: '12px 24px' }}
                >
                    <Row align="middle" justify="space-between">
                        <Col>
                            <Space>
                                <Title level={4} style={{ margin: 0 }}>{currentDashboard.name}</Title>
                                <Badge count={currentDashboard.charts.length} showZero />
                                <Tag color="blue">{currentDashboard.layout}</Tag>
                            </Space>
                        </Col>
                        <Col>
                            <Space>
                                <Button 
                                    icon={<PlusOutlined />}
                                    type="primary"
                                    onClick={() => setShowChartModal(true)}
                                >
                                    Add Chart
                                </Button>
                                <Button 
                                    icon={<SaveOutlined />}
                                    onClick={handleSaveDashboard}
                                >
                                    Save
                                </Button>
                                <Button onClick={() => setCurrentDashboard(null)}>
                                    Back
                                </Button>
                            </Space>
                        </Col>
                    </Row>
                </Card>

                {/* Dashboard Content */}
                <div style={{ flex: 1, padding: 16, background: '#f5f5f5', overflow: 'auto' }}>
                    {currentDashboard.charts.length === 0 ? (
                        <Empty description="No charts yet">
                            <Button type="primary" onClick={() => setShowChartModal(true)}>
                                Add Your First Chart
                            </Button>
                        </Empty>
                    ) : (
                        <div style={{ 
                            display: 'grid',
                            gridTemplateColumns: 'repeat(12, 1fr)',
                            gap: 16,
                            minHeight: '100%'
                        }}>
                            {currentDashboard.charts.map(chart => (
                                <div
                                    key={chart.id}
                                    style={{
                                        gridColumn: `span ${Math.ceil(chart.position.width / 100)}`,
                                        gridRow: `span ${Math.ceil(chart.position.height / 100)}`,
                                        minHeight: 300
                                    }}
                                >
                                    <Card
                                        title={
                                            <Space>
                                                {getChartIcon(chart.type)}
                                                <Text strong>{chart.name}</Text>
                                            </Space>
                                        }
                                        extra={
                                            <Space>
                                                <Tooltip title="Edit">
                                                    <SettingOutlined 
                                                        onClick={() => {
                                                            setEditingChart(chart);
                                                            setSelectedDataSource(dataSources.find(ds => ds.id === chart.dataSourceId) || null);
                                                            setShowChartModal(true);
                                                        }}
                                                    />
                                                </Tooltip>
                                                <Tooltip title="Delete">
                                                    <Popconfirm
                                                        title="Are you sure you want to delete this chart?"
                                                        onConfirm={() => handleDeleteChart(chart.id)}
                                                        okText="Yes"
                                                        cancelText="No"
                                                    >
                                                        <DeleteOutlined />
                                                    </Popconfirm>
                                                </Tooltip>
                                            </Space>
                                        }
                                        style={{ height: '100%' }}
                                    >
                                        <ChartRenderer
                                            chart={chart}
                                            dataSource={dataSources.find(ds => ds.id === chart.dataSourceId)}
                                        />
                                    </Card>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const getChartIcon = (type: string) => {
        switch (type) {
            case 'bar': return <BarChartOutlined />;
            case 'line': return <LineChartOutlined />;
            case 'pie': return <PieChartOutlined />;
            default: return <BarChartOutlined />;
        }
    };

    return (
        <div style={{ height: '100%' }}>
            {!currentDashboard ? renderDashboardList() : renderDashboardEditor()}

            {/* Create Dashboard Modal */}
            <Modal
                title="Create New Dashboard"
                open={showCreateModal}
                onCancel={() => setShowCreateModal(false)}
                footer={null}
                width={600}
            >
                <Form form={form} onFinish={handleCreateDashboard} layout="vertical">
                    <Form.Item
                        name="name"
                        label="Dashboard Name"
                        rules={[{ required: true, message: 'Please enter dashboard name' }]}
                    >
                        <Input placeholder="My Analytics Dashboard" />
                    </Form.Item>
                    <Form.Item
                        name="description"
                        label="Description"
                    >
                        <Input.TextArea placeholder="Describe your dashboard..." />
                    </Form.Item>
                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                Create Dashboard
                            </Button>
                            <Button onClick={() => setShowCreateModal(false)}>
                                Cancel
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Create/Edit Chart Modal */}
            <Modal
                title={editingChart ? "Edit Chart" : "Create New Chart"}
                open={showChartModal}
                onCancel={() => {
                    setShowChartModal(false);
                    setEditingChart(null);
                    setSelectedDataSource(null);
                }}
                footer={null}
                width={800}
            >
                <Form 
                    form={chartForm} 
                    onFinish={handleCreateChart} 
                    layout="vertical"
                    initialValues={editingChart ? {
                        chartName: editingChart.name,
                        chartType: editingChart.type,
                        xAxis: editingChart.config.xAxis,
                        yAxis: editingChart.config.yAxis,
                        series: editingChart.config.series?.[0],
                        aggregation: editingChart.config.aggregation
                    } : {}}
                >
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="chartName"
                                label="Chart Name"
                                rules={[{ required: true, message: 'Please enter chart name' }]}
                            >
                                <Input placeholder="Sales Trend" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="chartType"
                                label="Chart Type"
                                rules={[{ required: true, message: 'Please select chart type' }]}
                            >
                                <Select placeholder="Select chart type">
                                    <Option value="bar">Bar Chart</Option>
                                    <Option value="line">Line Chart</Option>
                                    <Option value="pie">Pie Chart</Option>
                                    <Option value="scatter">Scatter Plot</Option>
                                    <Option value="area">Area Chart</Option>
                                    <Option value="table">Data Table</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        name="dataSource"
                        label="Data Source"
                        rules={[{ required: true, message: 'Please select data source' }]}
                    >
                        <Select 
                            placeholder="Select data source"
                            onChange={(value) => {
                                const ds = dataSources.find(d => d.id === value);
                                setSelectedDataSource(ds);
                            }}
                        >
                            {dataSources.map(ds => (
                                <Option key={ds.id} value={ds.id}>
                                    {ds.name} ({ds.type})
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    {selectedDataSource && (
                        <>
                            <Divider>Chart Configuration</Divider>
                            
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item
                                        name="xAxis"
                                        label="X-Axis"
                                        rules={[{ required: true, message: 'Please select X-axis' }]}
                                    >
                                        <Select placeholder="Select X-axis field">
                                            {selectedDataSource.schema?.columns?.map((col: any) => (
                                                <Option key={col.name} value={col.name}>
                                                    {col.name} ({col.type})
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        name="yAxis"
                                        label="Y-Axis"
                                        rules={[{ required: true, message: 'Please select Y-axis' }]}
                                    >
                                        <Select placeholder="Select Y-axis field">
                                            {selectedDataSource.schema?.columns?.map((col: any) => (
                                                <Option key={col.name} value={col.name}>
                                                    {col.name} ({col.type})
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Form.Item
                                name="aggregation"
                                label="Aggregation"
                            >
                                <Select placeholder="Select aggregation">
                                    <Option value="sum">Sum</Option>
                                    <Option value="avg">Average</Option>
                                    <Option value="count">Count</Option>
                                    <Option value="min">Minimum</Option>
                                    <Option value="max">Maximum</Option>
                                </Select>
                            </Form.Item>
                        </>
                    )}

                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                {editingChart ? 'Update Chart' : 'Create Chart'}
                            </Button>
                            <Button onClick={() => {
                                setShowChartModal(false);
                                setEditingChart(null);
                                setSelectedDataSource(null);
                            }}>
                                Cancel
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default EnhancedDashboardBuilder;
