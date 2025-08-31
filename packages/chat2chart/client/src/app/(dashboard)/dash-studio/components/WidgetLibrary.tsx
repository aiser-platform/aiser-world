
'use client';

import React, { useState } from 'react';
import {
    Card,
    Button,
    Space,
    Typography,
    Row,
    Col,
    Tag,
    Input,
    Select,
    Divider,
    message
} from 'antd';
import {
    BarChartOutlined,
    LineChartOutlined,
    PieChartOutlined,
    AreaChartOutlined,
    DotChartOutlined,
    RadarChartOutlined,
    HeatMapOutlined,
    FunnelPlotOutlined,
    DashboardOutlined,
    ClusterOutlined,
    TableOutlined,
    NumberOutlined,
    FilterOutlined,
    PictureOutlined,
    FileTextOutlined,
    LayoutOutlined,
    SearchOutlined,
    StarOutlined,
    StarFilled,
    PlusOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

interface WidgetTemplate {
    id: string;
    name: string;
    type: string;
    category: string;
    description: string;
    icon: React.ReactNode;
    isFavorite: boolean;
}

const WidgetLibrary: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [favorites, setFavorites] = useState<Set<string>>(new Set());

    const widgetTemplates: WidgetTemplate[] = [
        // Chart Widgets
        {
            id: 'bar-chart',
            name: 'Bar Chart',
            type: 'chart',
            category: 'charts',
            description: 'Vertical or horizontal bar chart for comparing categories',
            icon: <BarChartOutlined style={{ fontSize: 24, color: '#1890ff' }} />,
            isFavorite: false
        },
        {
            id: 'line-chart',
            name: 'Line Chart',
            type: 'chart',
            category: 'charts',
            description: 'Line chart for showing trends over time',
            icon: <LineChartOutlined style={{ fontSize: 24, color: '#52c41a' }} />,
            isFavorite: false
        },
        {
            id: 'pie-chart',
            name: 'Pie Chart',
            type: 'chart',
            category: 'charts',
            description: 'Pie chart for showing proportions',
            icon: <PieChartOutlined style={{ fontSize: 24, color: '#faad14' }} />,
            isFavorite: false
        },
        {
            id: 'area-chart',
            name: 'Area Chart',
            type: 'chart',
            category: 'charts',
            description: 'Area chart for showing cumulative data',
            icon: <AreaChartOutlined style={{ fontSize: 24, color: '#eb2f96' }} />,
            isFavorite: false
        },
        {
            id: 'scatter-plot',
            name: 'Scatter Plot',
            type: 'chart',
            category: 'charts',
            description: 'Scatter plot for showing correlations',
            icon: <DotChartOutlined style={{ fontSize: 24, color: '#722ed1' }} />,
            isFavorite: false
        },
        {
            id: 'radar-chart',
            name: 'Radar Chart',
            type: 'chart',
            category: 'charts',
            description: 'Radar chart for multi-dimensional data',
            icon: <RadarChartOutlined style={{ fontSize: 24, color: '#13c2c2' }} />,
            isFavorite: false
        },
        {
            id: 'heatmap',
            name: 'Heatmap',
            type: 'chart',
            category: 'charts',
            description: 'Heatmap for showing data density',
            icon: <HeatMapOutlined style={{ fontSize: 24, color: '#f5222d' }} />,
            isFavorite: false
        },
        {
            id: 'funnel-chart',
            name: 'Funnel Chart',
            type: 'chart',
            category: 'charts',
            description: 'Funnel chart for showing conversion rates',
            icon: <FunnelPlotOutlined style={{ fontSize: 24, color: '#fa8c16' }} />,
            isFavorite: false
        },

        // Data Widgets
        {
            id: 'table',
            name: 'Data Table',
            type: 'table',
            category: 'data',
            description: 'Interactive table for displaying tabular data',
            icon: <TableOutlined style={{ fontSize: 24, color: '#1890ff' }} />,
            isFavorite: false
        },
        {
            id: 'metric',
            name: 'Metric',
            type: 'metric',
            category: 'data',
            description: 'Single value display with optional trend',
            icon: <NumberOutlined style={{ fontSize: 24, color: '#52c41a' }} />,
            isFavorite: false
        },
        {
            id: 'filter',
            name: 'Filter',
            type: 'filter',
            category: 'data',
            description: 'Interactive filter controls for dashboards',
            icon: <FilterOutlined style={{ fontSize: 24, color: '#faad14' }} />,
            isFavorite: false
        },

        // Content Widgets
        {
            id: 'text',
            name: 'Text',
            type: 'text',
            category: 'content',
            description: 'Rich text content with formatting options',
            icon: <FileTextOutlined style={{ fontSize: 24, color: '#1890ff' }} />,
            isFavorite: false
        },
        {
            id: 'image',
            name: 'Image',
            type: 'image',
            category: 'content',
            description: 'Image display with optional captions',
            icon: <PictureOutlined style={{ fontSize: 24, color: '#52c41a' }} />,
            isFavorite: false
        },
        {
            id: 'title',
            name: 'Title',
            type: 'title',
            category: 'content',
            description: 'Section or dashboard title',
            icon: <LayoutOutlined style={{ fontSize: 24, color: '#faad14' }} />,
            isFavorite: false
        },
        {
            id: 'panel',
            name: 'Panel',
            type: 'panel',
            category: 'content',
            description: 'Container panel for grouping widgets',
            icon: <DashboardOutlined style={{ fontSize: 24, color: '#eb2f96' }} />,
            isFavorite: false
        }
    ];

    const categories = [
        { key: 'all', label: 'All Widgets', count: widgetTemplates.length },
        { key: 'charts', label: 'Charts', count: widgetTemplates.filter(w => w.category === 'charts').length },
        { key: 'data', label: 'Data', count: widgetTemplates.filter(w => w.category === 'data').length },
        { key: 'content', label: 'Content', count: widgetTemplates.filter(w => w.category === 'content').length }
    ];

    const filteredWidgets = widgetTemplates.filter(widget => {
        const matchesSearch = widget.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            widget.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || widget.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const handleFavorite = (widgetId: string) => {
        const newFavorites = new Set(favorites);
        if (newFavorites.has(widgetId)) {
            newFavorites.delete(widgetId);
            message.info('Removed from favorites');
        } else {
            newFavorites.add(widgetId);
            message.success('Added to favorites');
        }
        setFavorites(newFavorites);
    };

    const handleWidgetSelect = (widget: WidgetTemplate) => {
        message.success(`Selected ${widget.name} widget`);
        // Here you would typically add the widget to the dashboard
        // For now, just show a success message
    };

    return (
        <div className="widget-library">
            <Card
                title={
                    <Space>
                        <DashboardOutlined />
                        <span>Widget Library</span>
                        <Tag color="blue">{filteredWidgets.length} widgets</Tag>
                    </Space>
                }
                extra={
                    <Space>
                        <Search
                            placeholder="Search widgets..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: 200 }}
                        />
                        <Select
                            value={selectedCategory}
                            onChange={setSelectedCategory}
                            style={{ width: 150 }}
                        >
                            {categories.map(cat => (
                                <Option key={cat.key} value={cat.key}>
                                    {cat.label} ({cat.count})
                                </Option>
                            ))}
                        </Select>
                    </Space>
                }
            >
                <Row gutter={[16, 16]}>
                    {filteredWidgets.map(widget => (
                        <Col xs={24} sm={12} md={8} lg={6} key={widget.id}>
                            <Card
                                hoverable
                                size="small"
                                style={{ height: '100%' }}
                                actions={[
                                    <Button
                                        type="text"
                                        icon={favorites.has(widget.id) ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
                                        onClick={() => handleFavorite(widget.id)}
                                    />,
                                    <Button
                                        type="text"
                                        icon={<PlusOutlined />}
                                        onClick={() => handleWidgetSelect(widget)}
                                    />
                                ]}
                            >
                                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                                    {widget.icon}
                                    <Title level={5} style={{ margin: '12px 0 8px 0' }}>
                                        {widget.name}
                                    </Title>
                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                        {widget.description}
                                    </Text>
                                </div>
                                <div style={{ marginTop: '12px' }}>
                                    <Tag color="blue">{widget.type}</Tag>
                                    <Tag color="green">{widget.category}</Tag>
                                </div>
                            </Card>
                        </Col>
                    ))}
                </Row>

                {filteredWidgets.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <SearchOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
                        <Title level={4} style={{ color: '#666' }}>
                            No Widgets Found
                        </Title>
                        <Text type="secondary">
                            Try adjusting your search terms or category filter
                        </Text>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default WidgetLibrary;
