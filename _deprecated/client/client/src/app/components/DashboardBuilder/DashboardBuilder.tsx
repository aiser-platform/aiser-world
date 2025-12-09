'use client';

import React, { useState, useEffect } from 'react';
import {
    Card,
    Row,
    Col,
    Button,
    Space,
    Typography,
    Select,
    Form,
    Input,
    Modal,
    message,
    Divider,
    Tabs,
    Empty,
    Tooltip,
    Popconfirm
} from 'antd';
import {
    BarChartOutlined,
    LineChartOutlined,
    PieChartOutlined,
    TableOutlined,
    PlusOutlined,
    SaveOutlined,
    DeleteOutlined,
    EyeOutlined,
    SettingOutlined
} from '@ant-design/icons';
import { IDataSource } from '../FileUpload/types';
import ChartRenderer from './ChartRenderer';
import ChartConfigurator from './ChartConfigurator';

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

export interface DashboardBuilderProps {
    dataSources: IDataSource[];
    onDashboardSave?: (dashboard: IDashboard) => void;
    onDashboardLoad?: (dashboardId: string) => void;
}

const DashboardBuilder: React.FC<DashboardBuilderProps> = ({
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
        const saved = localStorage.getItem('aiser-dashboards');
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
        localStorage.setItem('aiser-dashboards', JSON.stringify(dashboards));
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

    const handleDeleteDashboard = (dashboardId: string) => {
        const updatedDashboards = dashboards.filter(d => d.id !== dashboardId);
        setDashboards(updatedDashboards);
        saveDashboardsToStorage(updatedDashboards);
        
        if (currentDashboard?.id === dashboardId) {
            setCurrentDashboard(null);
        }
        
        message.success('Dashboard deleted successfully!');
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

    const handleUpdateChart = async (values: any) => {
        if (!currentDashboard || !editingChart) return;

        const updatedChart = {
            ...editingChart,
            name: values.chartName,
            config: {
                ...editingChart.config,
                xAxis: values.xAxis,
                yAxis: values.yAxis,
                series: values.series ? [values.series] : [],
                aggregation: values.aggregation,
                filters: values.filters || [],
                sort: values.sort
            }
        };

        const updatedDashboard = {
            ...currentDashboard,
            charts: currentDashboard.charts.map(c => 
                c.id === editingChart.id ? updatedChart : c
            ),
            updatedAt: new Date().toISOString()
        };

        setCurrentDashboard(updatedDashboard);
        setEditingChart(null);
        chartForm.resetFields();
        message.success('Chart updated successfully!');
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

    const handleChartPositionChange = (chartId: string, position: any) => {
        if (!currentDashboard) return;

        const updatedDashboard = {
            ...currentDashboard,
            charts: currentDashboard.charts.map(c => 
                c.id === chartId ? { ...c, position } : c
            ),
            updatedAt: new Date().toISOString()
        };

        setCurrentDashboard(updatedDashboard);
    };

    const getChartIcon = (type: string) => {
        switch (type) {
            case 'bar': return <BarChartOutlined />;
            case 'line': return <LineChartOutlined />;
            case 'pie': return <PieChartOutlined />;
            case 'table': return <TableOutlined />;
            default: return <BarChartOutlined />;
        }
    };

    const renderDashboardList = () => (
        <Card title="My Dashboards" extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreateModal(true)}>
                Create Dashboard
            </Button>
        }>
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
                                            <Text type="secondary">{dashboard.charts.length} charts</Text>
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
            <Card
                title={
                    <Space>
                        <Title level={4} style={{ margin: 0 }}>{currentDashboard.name}</Title>
                        <Text type="secondary">({currentDashboard.charts.length} charts)</Text>
                    </Space>
                }
                extra={
                    <Space>
                        <Button onClick={() => setCurrentDashboard(null)}>
                            Back to Dashboards
                        </Button>
                        <Button 
                            type="primary" 
                            icon={<PlusOutlined />}
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
                    </Space>
                }
            >
                {currentDashboard.charts.length === 0 ? (
                    <Empty description="No charts yet">
                        <Button type="primary" onClick={() => setShowChartModal(true)}>
                            Add Your First Chart
                        </Button>
                    </Empty>
                ) : (
                    <div style={{ minHeight: 400, position: 'relative' }}>
                        {currentDashboard.charts.map(chart => (
                            <div
                                key={chart.id}
                                style={{
                                    position: 'absolute',
                                    left: chart.position.x,
                                    top: chart.position.y,
                                    width: chart.position.width,
                                    height: chart.position.height,
                                    border: '1px solid #d9d9d9',
                                    borderRadius: 6,
                                    padding: 8,
                                    backgroundColor: 'white'
                                }}
                            >
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    marginBottom: 8
                                }}>
                                    <Text strong>{chart.name}</Text>
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
                                </div>
                                <ChartRenderer
                                    chart={chart}
                                    dataSource={dataSources.find(ds => ds.id === chart.dataSourceId)}
                                    onPositionChange={(position) => handleChartPositionChange(chart.id, position)}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        );
    };

    return (
        <div>
            {!currentDashboard ? renderDashboardList() : renderDashboardEditor()}

            {/* Create Dashboard Modal */}
            <Modal
                title="Create New Dashboard"
                open={showCreateModal}
                onCancel={() => setShowCreateModal(false)}
                footer={null}
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
                width={600}
            >
                <Form 
                    form={chartForm} 
                    onFinish={editingChart ? handleUpdateChart : handleCreateChart} 
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
                    <Form.Item
                        name="chartName"
                        label="Chart Name"
                        rules={[{ required: true, message: 'Please enter chart name' }]}
                    >
                        <Input placeholder="Sales Trend" />
                    </Form.Item>

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

                            <Form.Item
                                name="yAxis"
                                label="Y-Axis"
                                rules={[{ required: true, message: 'Please select Y-axis field' }]}
                            >
                                <Select placeholder="Select Y-axis field">
                                    {selectedDataSource.schema?.columns?.map((col: any) => (
                                        <Option key={col.name} value={col.name}>
                                            {col.name} ({col.type})
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>

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

export default DashboardBuilder;
