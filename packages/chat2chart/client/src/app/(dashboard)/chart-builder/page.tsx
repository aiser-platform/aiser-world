'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
    Card, 
    Row, 
    Col, 
    Button, 
    Space, 
    Select, 
    Input, 
    Slider, 
    ColorPicker, 
    Switch,
    Tabs,
    Typography,
    Divider,
    message,
    Tooltip,
    Badge,
    Tag,
    Drawer,
    Form,
    InputNumber,
    Radio,
    Checkbox,
    Upload
} from 'antd';
import {
    BarChartOutlined,
    LineChartOutlined,
    PieChartOutlined,
    AreaChartOutlined,
    DotChartOutlined,
    HeatMapOutlined,
    SaveOutlined,
    EyeOutlined,
    CodeOutlined,
    SettingOutlined,
    AlertOutlined,
    DownloadOutlined,
    ShareAltOutlined,
    FullscreenOutlined,
    UndoOutlined,
    RedoOutlined,
    PlusOutlined,
    DeleteOutlined,
    CopyOutlined,
    ImportOutlined,
    ExportOutlined,
    DatabaseOutlined
} from '@ant-design/icons';
import { useRouter, useSearchParams } from 'next/navigation';
import * as echarts from 'echarts';
import { useDarkMode } from '@/hooks/useDarkMode';
import './styles.css';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface ChartData {
    id: string;
    name: string;
    type: string;
    config: any;
    data: any[];
    query?: string;
    createdAt: Date;
    updatedAt: Date;
}

interface ChartBuilderProps {
    initialData?: any;
    initialQuery?: string;
    chartType?: string;
}

const ChartBuilder: React.FC<ChartBuilderProps> = ({ 
    initialData, 
    initialQuery, 
    chartType: initialChartType = 'bar' 
}) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isDarkMode] = useDarkMode();
    
    // Chart state
    const [chartData, setChartData] = useState<any[]>(initialData || []);
    const [chartType, setChartType] = useState<string>(initialChartType);
    const [chartConfig, setChartConfig] = useState<any>({});
    const [chartInstance, setChartInstance] = useState<echarts.ECharts | null>(null);
    const [currentQuery, setCurrentQuery] = useState<string>(initialQuery || '');
    
    // UI state
    const [activeTab, setActiveTab] = useState<string>('design');
    const [showDataPanel, setShowDataPanel] = useState<boolean>(true);
    const [showConfigPanel, setShowConfigPanel] = useState<boolean>(true);
    const [fullscreen, setFullscreen] = useState<boolean>(false);

    
    // Chart customization state
    const [title, setTitle] = useState<string>('Chart Title');
    const [subtitle, setSubtitle] = useState<string>('');
    const [colorTheme, setColorTheme] = useState<string>('d3-category10');
    const [colors, setColors] = useState<string[]>(['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de']);
    const [animation, setAnimation] = useState<boolean>(true);
    const [grid, setGrid] = useState<any>({ top: 60, right: 40, bottom: 60, left: 60 });
    
    // Typography and styling state
    const [titleFont, setTitleFont] = useState<string>('Arial');
    const [titleSize, setTitleSize] = useState<number>(18);
    const [titleColor, setTitleColor] = useState<string>('#333333');
    const [axisLabelFont, setAxisLabelFont] = useState<string>('Arial');
    const [axisLabelSize, setAxisLabelSize] = useState<number>(12);
    
    // Axis configuration state
    const [showXAxis, setShowXAxis] = useState<boolean>(true);
    const [showYAxis, setShowYAxis] = useState<boolean>(true);
    const [showXGrid, setShowXGrid] = useState<boolean>(true);
    const [showYGrid, setShowYGrid] = useState<boolean>(true);
    const [showXLabels, setShowXLabels] = useState<boolean>(true);
    const [showYLabels, setShowYLabels] = useState<boolean>(true);
    const [axisLineColor, setAxisLineColor] = useState<string>('#d9d9d9');
    const [gridLineColor, setGridLineColor] = useState<string>('#f0f0f0');
    
    // Legend configuration state
    const [showLegend, setShowLegend] = useState<boolean>(true);
    const [legendPosition, setLegendPosition] = useState<string>('bottom');
    const [legendLayout, setLegendLayout] = useState<string>('horizontal');
    const [legendFontSize, setLegendFontSize] = useState<number>(12);
    
    // Tooltip configuration state
    const [showTooltip, setShowTooltip] = useState<boolean>(true);
    const [tooltipTrigger, setTooltipTrigger] = useState<string>('axis');
    const [tooltipBackground, setTooltipBackground] = useState<string>('rgba(255,255,255,0.9)');
    const [tooltipBorder, setTooltipBorder] = useState<string>('#d9d9d9');

    // Color theme definitions
    const colorThemes = {
        'd3-category10': ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'],
        'd3-category20': ['#1f77b4', '#aec7e8', '#ff7f0e', '#ffbb78', '#2ca02c', '#98df8a', '#d62728', '#ff9896', '#9467bd', '#c5b0d5', '#8c564b', '#c49c94', '#e377c2', '#f7b6d2', '#7f7f7f', '#c7c7c7', '#bcbd22', '#dbdb8d', '#17becf', '#9edae5'],
        'd3-category20b': ['#393b79', '#5254a3', '#6b6ecf', '#9c9ede', '#637939', '#8ca252', '#b5cf6b', '#cedb9c', '#8c6d31', '#bd9e39', '#e7ba52', '#e7cb94', '#843c39', '#ad494a', '#d6616b', '#e7969c', '#7b4173', '#a55194', '#ce6dbd', '#de9ed6'],
        'd3-category20c': ['#3182bd', '#6baed6', '#9ecae1', '#c6dbef', '#e6550d', '#fd8d3c', '#fdae6b', '#fdd0a2', '#31a354', '#74c476', '#a1d99b', '#c7e9c0', '#756bb1', '#9e9ac8', '#bfd3e6', '#dadaeb', '#636363', '#969696', '#bdbdbd', '#d9d9d9'],
        'echarts-default': ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'],
        'echarts-vintage': ['#d87c7c', '#919e8b', '#d7ab82', '#6e7074', '#61a0a8', '#efa18d', '#787464', '#cc7e63', '#724e58'],
        'echarts-westeros': ['#516b91', '#59c4e6', '#edafda', '#93b7e3', '#a5e7f0', '#cbb0e3', '#59c4e6', '#f93f5e', '#f4e5c0'],
        'echarts-essos': ['#893448', '#d95850', '#eb8146', '#f4e874', '#f1f9c4', '#c8b273', '#c6e6c1', '#65cda3', '#55b4a8'],
        'echarts-wonderland': ['#4ea397', '#22c3aa', '#7bd9a5', '#d0648a', '#f58db2', '#f2b3c9', '#e6c7bf', '#e8d4b2', '#cee8ae'],
        'echarts-macarons': ['#2ec7c9', '#b6a2de', '#5ab1ef', '#ffb980', '#d87a80', '#8d98b3', '#e5cf0d', '#97b552', '#95706d'],
        'echarts-infographic': ['#c1232b', '#27727b', '#fcce10', '#e87c25', '#b60c02', '#843c08', '#b816d2', '#4c88d1', '#2d5faa'],
        'echarts-roma': ['#E01F54', '#001852', '#f5e8c8', '#b8d2c7', '#c6b38e', '#a4d5c2', '#f1d7e7', '#d4e6b0', '#a7c7df'],
        'echarts-sakura': ['#fb7293', '#fcb1a6', '#f1c40f', '#e67e22', '#badc58', '#a8e6cf', '#dcdde1', '#34495e', '#2d3436'],
        'echarts-purple-passion': ['#9b59b6', '#3498db', '#1abc9c', '#f1c40f', '#e74c3c', '#34495e', '#2ecc71', '#f39c12', '#e67e22'],
        'echarts-romance': ['#e74c3c', '#f39c12', '#f1c40f', '#2ecc71', '#27ae60', '#3498db', '#2980b9', '#9b59b6', '#8e44ad'],
        'echarts-mint': ['#00b894', '#00cec9', '#74b9ff', '#a29bfe', '#fd79a8', '#fdcb6e', '#e17055', '#6c5ce7', '#0984e3'],
        'echarts-sunset': ['#ff7675', '#fd79a8', '#fdcb6e', '#e17055', '#6c5ce7', '#a29bfe', '#74b9ff', '#00cec9', '#00b894'],
        'custom': ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de']
    };

    // Apply color theme
    const applyColorTheme = (themeName: string) => {
        if (colorThemes[themeName as keyof typeof colorThemes]) {
            setColors([...colorThemes[themeName as keyof typeof colorThemes]]);
            setColorTheme(themeName);
            message.success(`Applied ${themeName} color theme`);
        }
    };

    // Add more colors if needed
    const addMoreColors = () => {
        const newColors = [...colors];
        // Generate a new color using HSL for variety
        const hue = (colors.length * 137.5) % 360; // Golden angle approximation
        const saturation = 70 + (colors.length % 20);
        const lightness = 45 + (colors.length % 20);
        const newColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        newColors.push(newColor);
        setColors(newColors);
        message.success('Added new color');
    };

    // Remove color
    const removeColor = (index: number) => {
        if (colors.length > 1) {
            const newColors = colors.filter((_, i) => i !== index);
            setColors(newColors);
            message.success('Color removed');
        } else {
            message.warning('At least one color is required');
        }
    };
    
    // Refs
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<HTMLDivElement>(null);
    
    // Initialize chart from URL params
    useEffect(() => {
        const dataParam = searchParams.get('data');
        const queryParam = searchParams.get('query');
        const typeParam = searchParams.get('type');
        
        if (dataParam) {
            try {
                const parsedData = JSON.parse(decodeURIComponent(dataParam));
                setChartData(parsedData);
            } catch (e) {
                console.error('Failed to parse chart data:', e);
            }
        }
        
        if (queryParam) {
            setCurrentQuery(decodeURIComponent(queryParam));
        }
        
        if (typeParam) {
            setChartType(typeParam);
        }
    }, [searchParams]);
    
    // Initialize ECharts instance
    useEffect(() => {
        if (chartRef.current && chartData.length > 0) {
            const chart = echarts.init(chartRef.current, undefined, {
                renderer: 'canvas',
                useDirtyRect: true
            });
            
            setChartInstance(chart);
            
            // Set background based on dark mode
            if (isDarkMode) {
                chart.setOption({
                    backgroundColor: '#1f1f1f',
                    textStyle: { color: '#ffffff' }
                });
            }
            
            return () => {
                chart.dispose();
            };
        }
    }, [chartRef, chartData, isDarkMode]);
    
    // Update chart when config changes
    useEffect(() => {
        if (chartInstance && chartData.length > 0) {
            const option = generateChartOption();
            chartInstance.setOption(option, true);
        }
    }, [
        chartConfig, chartData, title, subtitle, colors, animation, grid, chartInstance,
        titleFont, titleSize, titleColor, axisLabelFont, axisLabelSize,
        showXAxis, showYAxis, showXGrid, showYGrid, showXLabels, showYLabels,
        axisLineColor, gridLineColor, showLegend, legendPosition, legendLayout, legendFontSize,
        showTooltip, tooltipTrigger, tooltipBackground, tooltipBorder
    ]);
    
    // Generate ECharts option based on current configuration
    const generateChartOption = () => {
        const baseOption: any = {
            title: {
                text: title,
                subtext: subtitle,
                left: 'center',
                textStyle: {
                    color: isDarkMode ? '#ffffff' : titleColor,
                    fontSize: titleSize,
                    fontFamily: titleFont
                },
                subtextStyle: {
                    color: isDarkMode ? '#cccccc' : '#666666',
                    fontSize: titleSize * 0.7,
                    fontFamily: titleFont
                }
            },
            tooltip: showTooltip ? {
                trigger: tooltipTrigger,
                backgroundColor: tooltipBackground,
                borderColor: tooltipBorder,
                textStyle: {
                    color: isDarkMode ? '#ffffff' : '#333333'
                }
            } : undefined,
            legend: showLegend ? {
                data: chartData.map((item: any, index: number) => item.name || `Series ${index + 1}`),
                [legendPosition]: 10,
                orient: legendLayout,
                textStyle: {
                    color: isDarkMode ? '#ffffff' : '#333333',
                    fontSize: legendFontSize
                }
            } : undefined,
            color: colors,
            animation: animation
        };

        // Add chart-specific configurations
        if (['bar', 'line', 'area', 'scatter'].includes(chartType)) {
            baseOption.grid = {
                ...grid,
                backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff',
                show: showXGrid || showYGrid
            };
            
            if (showXAxis) {
                baseOption.xAxis = {
                    type: 'category',
                    data: chartData.map((item: any) => item.name || item.x || item.category),
                    axisLine: {
                        show: true,
                        lineStyle: {
                            color: isDarkMode ? '#333333' : axisLineColor
                        }
                    },
                    axisTick: {
                        show: true
                    },
                    axisLabel: {
                        show: showXLabels,
                        color: isDarkMode ? '#cccccc' : '#666666',
                        fontSize: axisLabelSize,
                        fontFamily: axisLabelFont
                    },
                    splitLine: {
                        show: showXGrid,
                        lineStyle: {
                            color: isDarkMode ? '#333333' : gridLineColor
                        }
                    }
                };
            }
            
            if (showYAxis) {
                baseOption.yAxis = {
                    type: 'value',
                    axisLine: {
                        show: true,
                        lineStyle: {
                            color: isDarkMode ? '#333333' : axisLineColor
                        }
                    },
                    axisTick: {
                        show: true
                    },
                    axisLabel: {
                        show: showYLabels,
                        color: isDarkMode ? '#cccccc' : '#666666',
                        fontSize: axisLabelSize,
                        fontFamily: axisLabelFont
                    },
                    splitLine: {
                        show: showYGrid,
                        lineStyle: {
                            color: isDarkMode ? '#333333' : gridLineColor
                        }
                    }
                };
            }
        } else if (chartType === 'radar') {
            baseOption.radar = {
                indicator: chartData.map((item: any) => ({
                    name: item.name || item.category,
                    max: Math.max(...chartData.map((d: any) => d.value || d.y || d.count)) * 1.2
                }))
            };
        } else if (chartType === 'gauge') {
            baseOption.series = [{
                type: 'gauge',
                data: [{
                    value: chartData.reduce((sum: number, item: any) => sum + (item.value || item.y || item.count || 0), 0) / chartData.length,
                    name: 'Average Value'
                }],
                min: 0,
                max: Math.max(...chartData.map((d: any) => d.value || d.y || d.count)) * 1.2
            }];
            return baseOption;
        }

        baseOption.series = generateSeries();
        return baseOption;
    };
    
    // Generate series based on chart type
    const generateSeries = () => {
        switch (chartType) {
            case 'bar':
                return [{
                    type: 'bar',
                    data: chartData.map((item: any) => item.value || item.y || item.count),
                    itemStyle: {
                        borderRadius: [4, 4, 0, 0]
                    }
                }];
            case 'line':
                return [{
                    type: 'line',
                    data: chartData.map((item: any) => item.value || item.y || item.count),
                    smooth: true,
                    symbol: 'circle',
                    symbolSize: 6
                }];
            case 'pie':
                return [{
                    type: 'pie',
                    radius: '50%',
                    data: chartData.map((item: any) => ({
                        name: item.name || item.category,
                        value: item.value || item.y || item.count
                    })),
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 10,
                            shadowOffsetX: 0,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    }
                }];
            case 'area':
                return [{
                    type: 'line',
                    data: chartData.map((item: any) => item.value || item.y || item.count),
                    areaStyle: {
                        opacity: 0.6
                    },
                    smooth: true
                }];
            case 'scatter':
                return [{
                    type: 'scatter',
                    data: chartData.map((item: any) => [item.x || item.category, item.y || item.value]),
                    symbolSize: 8
                }];
            case 'radar':
                return [{
                    type: 'radar',
                    data: [{
                        value: chartData.map((item: any) => item.value || item.y || item.count),
                        name: 'Data Series'
                    }]
                }];
            case 'funnel':
                return [{
                    type: 'funnel',
                    data: chartData.map((item: any) => ({
                        name: item.name || item.category,
                        value: item.value || item.y || item.count
                    }))
                }];
            case 'gauge':
                return [{
                    type: 'gauge',
                    data: [{
                        value: chartData.reduce((sum: number, item: any) => sum + (item.value || item.y || item.count || 0), 0) / chartData.length,
                        name: 'Average Value'
                    }]
                }];
            case 'heatmap':
                // For heatmap, we need 2D data
                const heatmapData = chartData.map((item: any, index: number) => [
                    index,
                    0,
                    item.value || item.y || item.count
                ]);
                return [{
                    type: 'heatmap',
                    data: heatmapData
                }];
            default:
                return [{
                    type: 'bar',
                    data: chartData.map((item: any) => item.value || item.y || item.count)
                }];
        }
    };
    
    // Handle chart type change with data transformation
    const handleChartTypeChange = (type: string) => {
        const oldType = chartType;
        setChartType(type);
        
        // Transform data if needed for specific chart types
        if (type === 'pie' || type === 'funnel') {
            // Ensure we have name and value for pie/funnel charts
            if (chartData.length > 0 && !chartData[0].name && !chartData[0].category) {
                const transformedData = chartData.map((item: any, index: number) => ({
                    ...item,
                    name: item.name || item.category || `Item ${index + 1}`,
                    value: item.value || item.y || item.count || 0
                }));
                setChartData(transformedData);
            }
        } else if (type === 'scatter') {
            // Ensure we have x and y coordinates for scatter plots
            if (chartData.length > 0 && (!chartData[0].x || !chartData[0].y)) {
                const transformedData = chartData.map((item: any, index: number) => ({
                    ...item,
                    x: item.x || item.category || index,
                    y: item.value || item.y || item.count || 0
                }));
                setChartData(transformedData);
            }
        } else if (type === 'radar') {
            // Ensure we have name and value for radar charts
            if (chartData.length > 0 && !chartData[0].name && !chartData[0].category) {
                const transformedData = chartData.map((item: any, index: number) => ({
                    ...item,
                    name: item.name || item.category || `Dimension ${index + 1}`,
                    value: item.value || item.y || item.count || 0
                }));
                setChartData(transformedData);
            }
        }
        
        message.success(`Chart type changed from ${oldType} to ${type}`);
    };
    
    // Handle data update
    const handleDataUpdate = (newData: any[]) => {
        setChartData(newData);
        message.success('Chart data updated');
    };
    
    // Save chart
    const handleSaveChart = () => {
        const chartConfig = {
            id: Date.now().toString(),
            name: title,
            type: chartType,
            config: generateChartOption(),
            data: chartData,
            query: currentQuery,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        // Save to localStorage for now (in production, save to backend)
        const savedCharts = JSON.parse(localStorage.getItem('savedCharts') || '[]');
        savedCharts.push(chartConfig);
        localStorage.setItem('savedCharts', JSON.stringify(savedCharts));
        
        message.success('Chart saved successfully!');
    };
    
    // Export chart
    const handleExportChart = () => {
        if (chartInstance) {
            const dataURL = chartInstance.getDataURL({
                type: 'png',
                pixelRatio: 2,
                backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff'
            });
            
            const link = document.createElement('a');
            link.download = `${title || 'chart'}.png`;
            link.href = dataURL;
            link.click();
            
            message.success('Chart exported as PNG');
        }
    };
    
    // Share chart
    const handleShareChart = () => {
        const shareData = {
            data: chartData,
            query: currentQuery,
            type: chartType
        };
        
        const shareUrl = `${window.location.origin}/chart-builder?data=${encodeURIComponent(JSON.stringify(shareData.data))}&query=${encodeURIComponent(shareData.query)}&type=${shareData.type}`;
        
        navigator.clipboard.writeText(shareUrl).then(() => {
            message.success('Chart link copied to clipboard!');
        });
    };
    
    // Sample data for testing
    const sampleData = [
        { name: 'Product A', value: 120, category: 'Electronics' },
        { name: 'Product B', value: 200, category: 'Clothing' },
        { name: 'Product C', value: 150, category: 'Books' },
        { name: 'Product D', value: 80, category: 'Food' },
        { name: 'Product E', value: 300, category: 'Sports' }
    ];
    
    // Load sample data
    const loadSampleData = () => {
        setChartData(sampleData);
        setTitle('Sample Product Performance');
        setSubtitle('Sales data for different product categories');
        message.success('Sample data loaded');
    };
    
    return (
        <div className="chart-builder-container">
            {/* Header */}
            <div className="chart-builder-header">
                <Space>
                    <Title level={3} style={{ margin: 0, color: isDarkMode ? '#ffffff' : '#333333' }}>
                        Chart Builder
                    </Title>
                    <Badge count={chartData.length} showZero>
                        <Tag color="blue">Data Points</Tag>
                    </Badge>
                </Space>
                
                <Space>
                    <Tooltip title="Load Sample Data">
                        <Button 
                            icon={<PlusOutlined />} 
                            onClick={loadSampleData}
                            size="small"
                        >
                            Sample Data
                        </Button>
                    </Tooltip>
                    
                    <Tooltip title="Save Chart">
                        <Button 
                            type="primary" 
                            icon={<SaveOutlined />} 
                            onClick={handleSaveChart}
                            size="small"
                        >
                            Save
                        </Button>
                    </Tooltip>
                    
                    <Tooltip title="Export PNG">
                        <Button 
                            icon={<DownloadOutlined />} 
                            onClick={handleExportChart}
                            size="small"
                        >
                            Export
                        </Button>
                    </Tooltip>
                    
                    <Tooltip title="Share Chart">
                        <Button 
                            icon={<ShareAltOutlined />} 
                            onClick={handleShareChart}
                            size="small"
                        >
                            Share
                        </Button>
                    </Tooltip>
                    
                    <Tooltip title="Toggle Fullscreen">
                        <Button 
                            icon={<FullscreenOutlined />} 
                            onClick={() => {
                                if (!fullscreen) {
                                    document.documentElement.requestFullscreen();
                                } else {
                                    document.exitFullscreen();
                                }
                                setFullscreen(!fullscreen);
                            }}
                            size="small"
                        >
                            Fullscreen
                        </Button>
                    </Tooltip>
                </Space>
            </div>
            
            {/* Main Content */}
            <div className="chart-builder-content">
                {/* Left Panel - Chart Type & Data */}
                {showDataPanel && (
                    <div className="chart-builder-left-panel">
                        <Card title="Chart Configuration" size="small">
                            <Tabs defaultActiveKey="basic" size="small">
                                <TabPane tab="Basic" key="basic">
                                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                                        <div>
                                            <Text strong>Chart Type</Text>
                                            <Select
                                                value={chartType}
                                                onChange={handleChartTypeChange}
                                                style={{ width: '100%', marginTop: 8 }}
                                            >
                                                <Option value="bar">Bar Chart</Option>
                                                <Option value="line">Line Chart</Option>
                                                <Option value="pie">Pie Chart</Option>
                                                <Option value="area">Area Chart</Option>
                                                <Option value="scatter">Scatter Plot</Option>
                                                <Option value="heatmap">Heatmap</Option>
                                                <Option value="radar">Radar Chart</Option>
                                                <Option value="funnel">Funnel Chart</Option>
                                                <Option value="gauge">Gauge Chart</Option>
                                            </Select>
                                        </div>
                                        
                                        <div>
                                            <Text strong>Chart Title</Text>
                                            <Input
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                placeholder="Enter chart title"
                                                style={{ marginTop: 8 }}
                                            />
                                        </div>
                                        
                                        <div>
                                            <Text strong>Subtitle</Text>
                                            <Input
                                                value={subtitle}
                                                onChange={(e) => setSubtitle(e.target.value)}
                                                placeholder="Enter subtitle (optional)"
                                                style={{ marginTop: 8 }}
                                            />
                                        </div>
                                        
                                        <div>
                                            <Text strong>Animation</Text>
                                            <Switch
                                                checked={animation}
                                                onChange={setAnimation}
                                                style={{ marginTop: 8 }}
                                            />
                                        </div>
                                    </Space>
                                </TabPane>
                                
                                <TabPane tab="Data Mapping" key="data">
                                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                                        <div>
                                            <Text strong>X-Axis Field</Text>
                                            <Select
                                                placeholder="Select X-axis field"
                                                style={{ width: '100%', marginTop: 8 }}
                                            >
                                                {chartData.length > 0 && Object.keys(chartData[0]).map(key => (
                                                    <Option key={key} value={key}>{key}</Option>
                                                ))}
                                            </Select>
                                        </div>
                                        
                                        <div>
                                            <Text strong>Y-Axis Field</Text>
                                            <Select
                                                placeholder="Select Y-axis field"
                                                style={{ width: '100%', marginTop: 8 }}
                                            >
                                                {chartData.length > 0 && Object.keys(chartData[0]).map(key => (
                                                    <Option key={key} value={key}>{key}</Option>
                                                ))}
                                            </Select>
                                        </div>
                                        
                                        <div>
                                            <Text strong>Series Field</Text>
                                            <Select
                                                placeholder="Select series field (optional)"
                                                style={{ width: '100%', marginTop: 8 }}
                                                allowClear
                                            >
                                                {chartData.length > 0 && Object.keys(chartData[0]).map(key => (
                                                    <Option key={key} value={key}>{key}</Option>
                                                ))}
                                            </Select>
                                        </div>
                                        
                                        <div>
                                            <Text strong>Aggregation</Text>
                                            <Select
                                                defaultValue="sum"
                                                style={{ width: '100%', marginTop: 8 }}
                                            >
                                                <Option value="sum">Sum</Option>
                                                <Option value="avg">Average</Option>
                                                <Option value="count">Count</Option>
                                                <Option value="min">Minimum</Option>
                                                <Option value="max">Maximum</Option>
                                            </Select>
                                        </div>
                                    </Space>
                                </TabPane>
                                
                                <TabPane tab="Colors" key="colors">
                                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                                        <div>
                                            <Text strong>Color Theme</Text>
                                            <Select
                                                value={colorTheme}
                                                onChange={applyColorTheme}
                                                style={{ width: '100%', marginTop: 8 }}
                                                showSearch
                                                placeholder="Select a color theme"
                                                optionFilterProp="children"
                                            >
                                                <Option value="d3-category10">D3 Category 10</Option>
                                                <Option value="d3-category20">D3 Category 20</Option>
                                                <Option value="d3-category20b">D3 Category 20B</Option>
                                                <Option value="d3-category20c">D3 Category 20C</Option>
                                                <Option value="echarts-default">ECharts Default</Option>
                                                <Option value="echarts-vintage">ECharts Vintage</Option>
                                                <Option value="echarts-westeros">ECharts Westeros</Option>
                                                <Option value="echarts-essos">ECharts Essos</Option>
                                                <Option value="echarts-wonderland">ECharts Wonderland</Option>
                                                <Option value="echarts-macarons">ECharts Macarons</Option>
                                                <Option value="echarts-infographic">ECharts Infographic</Option>
                                                <Option value="echarts-roma">ECharts Roma</Option>
                                                <Option value="echarts-sakura">ECharts Sakura</Option>
                                                <Option value="echarts-purple-passion">ECharts Purple Passion</Option>
                                                <Option value="echarts-romance">ECharts Romance</Option>
                                                <Option value="echarts-mint">ECharts Mint</Option>
                                                <Option value="echarts-sunset">ECharts Sunset</Option>
                                                <Option value="custom">Custom</Option>
                                            </Select>
                                        </div>
                                        
                                        {/* Color Preview */}
                                        <div style={{ marginTop: 12 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                <Text strong>Current Colors:</Text>
                                                <Button 
                                                    size="small" 
                                                    icon={<PlusOutlined />} 
                                                    onClick={addMoreColors}
                                                    title="Add more colors"
                                                />
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                {colors.slice(0, 8).map((color, index) => (
                                                    <div
                                                        key={index}
                                                        style={{
                                                            width: 20,
                                                            height: 20,
                                                            backgroundColor: color,
                                                            border: '1px solid #d9d9d9',
                                                            borderRadius: 4,
                                                            cursor: 'pointer',
                                                            position: 'relative'
                                                        }}
                                                        title={`Series ${index + 1}: ${color}`}
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(color);
                                                            message.success(`Copied ${color} to clipboard`);
                                                        }}
                                                    >
                                                        {index < colors.length - 1 && (
                                                            <div
                                                                style={{
                                                                    position: 'absolute',
                                                                    top: -6,
                                                                    right: -6,
                                                                    width: 16,
                                                                    height: 16,
                                                                    backgroundColor: '#ff4d4f',
                                                                    borderRadius: '50%',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    fontSize: '10px',
                                                                    color: 'white',
                                                                    cursor: 'pointer',
                                                                    border: '1px solid white'
                                                                }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    removeColor(index);
                                                                }}
                                                                title="Remove color"
                                                            >
                                                                ×
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                                {colors.length > 8 && (
                                                    <div style={{ 
                                                        width: 20, 
                                                        height: 20, 
                                                        backgroundColor: '#f0f0f0',
                                                        border: '1px solid #d9d9d9',
                                                        borderRadius: 4,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '10px',
                                                        color: '#666'
                                                    }}>
                                                        +{colors.length - 8}
                                                    </div>
                                                )}
                                            </div>
                                            <Text type="secondary" style={{ fontSize: '12px', marginTop: 4 }}>
                                                Click color to copy, × to remove
                                            </Text>
                                        </div>
                                    </Space>
                                </TabPane>
                            </Tabs>
                        </Card>
                        
                        <Card title="Data Sources" size="small" style={{ marginTop: 16 }}>
                            <Tabs defaultActiveKey="connected" size="small">
                                <TabPane tab="Connected" key="connected">
                                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                                        <div>
                                            <Text strong>Available Data Sources</Text>
                                            <div style={{ marginTop: 8 }}>
                                                <Button 
                                                    size="small" 
                                                    icon={<DatabaseOutlined />}
                                                    style={{ margin: '2px' }}
                                                >
                                                    PostgreSQL
                                                </Button>
                                                <Button 
                                                    size="small" 
                                                    icon={<DatabaseOutlined />}
                                                    style={{ margin: '2px' }}
                                                >
                                                    MySQL
                                                </Button>
                                                <Button 
                                                    size="small" 
                                                    icon={<DatabaseOutlined />}
                                                    style={{ margin: '2px' }}
                                                >
                                                    CSV Upload
                                                </Button>
                                                <Button 
                                                    size="small" 
                                                    icon={<DatabaseOutlined />}
                                                    style={{ margin: '2px' }}
                                                >
                                                    Excel
                                                </Button>
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <Text strong>Cube.js Semantic Model</Text>
                                            <div style={{ marginTop: 8, padding: '8px', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '4px' }}>
                                                <Text type="success" style={{ fontSize: '12px' }}>
                                                    ✓ Connected to Cube.js Server
                                                </Text>
                                                <div style={{ marginTop: 4 }}>
                                                    <Text type="secondary" style={{ fontSize: '11px' }}>
                                                        Available: Metrics, Dimensions, Date Ranges
                                                    </Text>
                                                </div>
                                            </div>
                                        </div>
                                    </Space>
                                </TabPane>
                                
                                <TabPane tab="Query Builder" key="query">
                                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                                        <div>
                                            <Text strong>Data Query</Text>
                                            <TextArea
                                                value={currentQuery}
                                                onChange={(e) => setCurrentQuery(e.target.value)}
                                                placeholder="Enter your data query here or use the query builder below..."
                                                rows={3}
                                                style={{ marginTop: 8 }}
                                            />
                                        </div>
                                        
                                        <div>
                                            <Text strong>Cube.js Query Builder</Text>
                                            <div style={{ marginTop: 8 }}>
                                                <div style={{ marginBottom: 8 }}>
                                                    <Text type="secondary" style={{ fontSize: '12px' }}>Measures</Text>
                                                    <Select
                                                        mode="multiple"
                                                        placeholder="Select measures"
                                                        style={{ width: '100%' }}
                                                        options={[
                                                            { label: 'Total Sales', value: 'total_sales' },
                                                            { label: 'Order Count', value: 'order_count' },
                                                            { label: 'Average Order Value', value: 'avg_order_value' },
                                                            { label: 'Customer Count', value: 'customer_count' }
                                                        ]}
                                                    />
                                                </div>
                                                
                                                <div style={{ marginBottom: 8 }}>
                                                    <Text type="secondary" style={{ fontSize: '12px' }}>Dimensions</Text>
                                                    <Select
                                                        mode="multiple"
                                                        placeholder="Select dimensions"
                                                        style={{ width: '100%' }}
                                                        options={[
                                                            { label: 'Product Category', value: 'product_category' },
                                                            { label: 'Region', value: 'region' },
                                                            { label: 'Date', value: 'date' },
                                                            { label: 'Customer Segment', value: 'customer_segment' }
                                                        ]}
                                                    />
                                                </div>
                                                
                                                <div>
                                                    <Text type="secondary" style={{ fontSize: '12px' }}>Filters</Text>
                                                    <Select
                                                        placeholder="Add filters"
                                                        style={{ width: '100%' }}
                                                        options={[
                                                            { label: 'Date Range', value: 'date_range' },
                                                            { label: 'Product Category', value: 'product_filter' },
                                                            { label: 'Region Filter', value: 'region_filter' }
                                                        ]}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </Space>
                                </TabPane>
                                
                                <TabPane tab="Data Preview" key="preview">
                                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                                        <div>
                                            <Text strong>Data Points: {chartData.length}</Text>
                                            <div style={{ marginTop: 8, maxHeight: 200, overflow: 'auto' }}>
                                                {chartData.map((item, index) => (
                                                    <div key={index} style={{ 
                                                        padding: '4px 8px', 
                                                        border: '1px solid #e8e8e8',
                                                        marginBottom: 4,
                                                        borderRadius: 4,
                                                        fontSize: '12px',
                                                        backgroundColor: isDarkMode ? '#262626' : '#fafafa'
                                                    }}>
                                                        {JSON.stringify(item)}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <Text strong>Data Schema</Text>
                                            <div style={{ marginTop: 8, padding: '8px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '11px' }}>
                                                {chartData.length > 0 && Object.keys(chartData[0]).map(key => (
                                                    <div key={key} style={{ marginBottom: '2px' }}>
                                                        <Text code>{key}</Text>: {typeof chartData[0][key]}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </Space>
                                </TabPane>
                            </Tabs>
                        </Card>
                    </div>
                )}
                
                {/* Center Panel - Chart Display */}
                <div className="chart-builder-center-panel">
                    <Card 
                        title="Chart Preview" 
                        size="small"
                        extra={
                            <Space>
                                <Button 
                                    size="small" 
                                    icon={<EyeOutlined />}
                                    onClick={() => setFullscreen(!fullscreen)}
                                >
                                    {fullscreen ? 'Exit' : 'Fullscreen'}
                                </Button>
                                <Button 
                                    size="small" 
                                    icon={<CodeOutlined />}
                                    onClick={() => setActiveTab('code')}
                                >
                                    Code
                                </Button>
                                <Button 
                                    size="small" 
                                    icon={<SettingOutlined />}
                                    onClick={() => setShowConfigPanel(!showConfigPanel)}
                                >
                                    {showConfigPanel ? 'Hide' : 'Show'} Config
                                </Button>
                            </Space>
                        }
                    >
                        <div style={{ position: 'relative' }}>
                            {/* Chart Controls Overlay */}
                            <div style={{ 
                                position: 'absolute', 
                                top: 10, 
                                right: 10, 
                                zIndex: 10,
                                display: 'flex',
                                gap: 8
                            }}>
                                <Select
                                    value={chartType}
                                    onChange={handleChartTypeChange}
                                    style={{ width: 120 }}
                                    size="small"
                                >
                                    <Option value="bar">Bar Chart</Option>
                                    <Option value="line">Line Chart</Option>
                                    <Option value="pie">Pie Chart</Option>
                                    <Option value="area">Area Chart</Option>
                                    <Option value="scatter">Scatter Plot</Option>
                                    <Option value="radar">Radar Chart</Option>
                                    <Option value="funnel">Funnel Chart</Option>
                                    <Option value="gauge">Gauge Chart</Option>
                                </Select>
                                

                            </div>
                            
                            {/* Chart Container */}
                            <div 
                                ref={chartRef}
                                style={{ 
                                    width: '100%', 
                                    height: '400px',
                                    backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff',
                                    border: '1px solid #f0f0f0',
                                    borderRadius: '8px',
                                    position: 'relative'
                                }}
                            />
                            

                            
                            {/* Data Values Overlay */}
                            {chartType === 'bar' && chartData.length > 0 && (
                                <div style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    pointerEvents: 'none',
                                    zIndex: 5
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        {chartData.map((item, index) => (
                                            <div key={index} style={{
                                                padding: '2px 6px',
                                                backgroundColor: isDarkMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)',
                                                color: isDarkMode ? '#ffffff' : '#333333',
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                                border: `1px solid ${colors[index % colors.length]}`,
                                                opacity: 0.8
                                            }}>
                                                {item.value || item.y || item.count}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {/* Chart Info Panel */}
                            <div style={{
                                position: 'absolute',
                                bottom: 10,
                                left: 10,
                                backgroundColor: isDarkMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: '1px solid #f0f0f0',
                                fontSize: '12px',
                                color: isDarkMode ? '#ffffff' : '#333333'
                            }}>
                                <div><strong>Type:</strong> {chartType.toUpperCase()}</div>
                                <div><strong>Data Points:</strong> {chartData.length}</div>
                                <div><strong>Colors:</strong> {colors.length}</div>
                            </div>
                        </div>
                    </Card>
                </div>
                
                {/* Right Panel - Advanced Configuration */}
                {showConfigPanel && (
                    <div className="chart-builder-right-panel">
                        <Tabs activeKey={activeTab} onChange={setActiveTab} size="small">
                            <TabPane tab="Design" key="design">
                                <Tabs defaultActiveKey="layout" size="small">
                                    <TabPane tab="Layout" key="layout">
                                        <Card title="Chart Layout" size="small">
                                            <Space direction="vertical" style={{ width: '100%' }} size="small">
                                                <div>
                                                    <Text strong>Chart Size</Text>
                                                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                                        <InputNumber
                                                            placeholder="Width"
                                                            style={{ width: '50%' }}
                                                            addonAfter="px"
                                                        />
                                                        <InputNumber
                                                            placeholder="Height"
                                                            style={{ width: '50%' }}
                                                            addonAfter="px"
                                                        />
                                                    </div>
                                                </div>
                                                
                                                <div>
                                                    <Text strong>Margins</Text>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                                                        <div>
                                                            <Text type="secondary" style={{ fontSize: '12px' }}>Top</Text>
                                                            <Slider
                                                                min={0}
                                                                max={200}
                                                                value={grid.top}
                                                                onChange={(value) => setGrid({ ...grid, top: value })}
                                                            />
                                                        </div>
                                                        <div>
                                                            <Text type="secondary" style={{ fontSize: '12px' }}>Right</Text>
                                                            <Slider
                                                                min={0}
                                                                max={200}
                                                                value={grid.right}
                                                                onChange={(value) => setGrid({ ...grid, right: value })}
                                                            />
                                                        </div>
                                                        <div>
                                                            <Text type="secondary" style={{ fontSize: '12px' }}>Bottom</Text>
                                                            <Slider
                                                                min={0}
                                                                max={200}
                                                                value={grid.bottom}
                                                                onChange={(value) => setGrid({ ...grid, bottom: value })}
                                                            />
                                                        </div>
                                                        <div>
                                                            <Text type="secondary" style={{ fontSize: '12px' }}>Left</Text>
                                                            <Slider
                                                                min={0}
                                                                max={200}
                                                                value={grid.left}
                                                                onChange={(value) => setGrid({ ...grid, left: value })}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div>
                                                    <Text strong>Chart Position</Text>
                                                    <Select defaultValue="center" style={{ width: '100%', marginTop: 8 }}>
                                                        <Option value="center">Center</Option>
                                                        <Option value="left">Left</Option>
                                                        <Option value="right">Right</Option>
                                                        <Option value="top">Top</Option>
                                                        <Option value="bottom">Bottom</Option>
                                                    </Select>
                                                </div>
                                            </Space>
                                        </Card>
                                    </TabPane>
                                    
                                    <TabPane tab="Typography" key="typography">
                                        <Card title="Text Styling" size="small">
                                            <Space direction="vertical" style={{ width: '100%' }} size="small">
                                                                                        <div>
                                            <Text strong>Title Font</Text>
                                            <Select 
                                                value={titleFont}
                                                onChange={setTitleFont}
                                                style={{ width: '100%', marginTop: 8 }}
                                            >
                                                <Option value="Arial">Arial</Option>
                                                <Option value="Helvetica">Helvetica</Option>
                                                <Option value="Times New Roman">Times New Roman</Option>
                                                <Option value="Georgia">Georgia</Option>
                                                <Option value="Verdana">Verdana</Option>
                                            </Select>
                                        </div>
                                        
                                        <div>
                                            <Text strong>Title Size</Text>
                                            <Slider
                                                min={12}
                                                max={48}
                                                value={titleSize}
                                                onChange={setTitleSize}
                                                style={{ marginTop: 8 }}
                                            />
                                        </div>
                                        
                                        <div>
                                            <Text strong>Title Color</Text>
                                            <ColorPicker 
                                                value={titleColor}
                                                onChange={(color) => setTitleColor(color.toHexString())}
                                                style={{ marginTop: 8 }} 
                                            />
                                        </div>
                                                
                                                <Divider />
                                                
                                                <div>
                                                    <Text strong>Axis Label Font</Text>
                                                    <Select defaultValue="Arial" style={{ width: '100%', marginTop: 8 }}>
                                                        <Option value="Arial">Arial</Option>
                                                        <Option value="Helvetica">Helvetica</Option>
                                                        <Option value="Times New Roman">Times New Roman</Option>
                                                    </Select>
                                                </div>
                                                
                                                <div>
                                                    <Text strong>Axis Label Size</Text>
                                                    <Slider
                                                        min={10}
                                                        max={24}
                                                        defaultValue={12}
                                                        style={{ marginTop: 8 }}
                                                    />
                                                </div>
                                            </Space>
                                        </Card>
                                    </TabPane>
                                    
                                    <TabPane tab="Axes" key="axes">
                                        <Card title="Axis Configuration" size="small">
                                            <Space direction="vertical" style={{ width: '100%' }} size="small">
                                                <div>
                                                    <Text strong>X-Axis</Text>
                                                    <div style={{ marginTop: 8 }}>
                                                        <Switch checked={true} style={{ marginRight: 8 }} />
                                                        <Text>Show X-Axis</Text>
                                                    </div>
                                                    <div style={{ marginTop: 8 }}>
                                                        <Switch checked={true} style={{ marginRight: 8 }} />
                                                        <Text>Show Grid Lines</Text>
                                                    </div>
                                                    <div style={{ marginTop: 8 }}>
                                                        <Switch checked={true} style={{ marginRight: 8 }} />
                                                        <Text>Show Labels</Text>
                                                    </div>
                                                </div>
                                                
                                                <Divider />
                                                
                                                <div>
                                                    <Text strong>Y-Axis</Text>
                                                    <div style={{ marginTop: 8 }}>
                                                        <Switch checked={true} style={{ marginRight: 8 }} />
                                                        <Text>Show Y-Axis</Text>
                                                    </div>
                                                    <div style={{ marginTop: 8 }}>
                                                        <Switch checked={true} style={{ marginRight: 8 }} />
                                                        <Text>Show Grid Lines</Text>
                                                    </div>
                                                    <div style={{ marginTop: 8 }}>
                                                        <Switch checked={true} style={{ marginRight: 8 }} />
                                                        <Text>Show Labels</Text>
                                                    </div>
                                                </div>
                                                
                                                <div>
                                                    <Text strong>Axis Line Color</Text>
                                                    <ColorPicker defaultValue="#d9d9d9" style={{ marginTop: 8 }} />
                                                </div>
                                                
                                                <div>
                                                    <Text strong>Grid Line Color</Text>
                                                    <ColorPicker defaultValue="#f0f0f0" style={{ marginTop: 8 }} />
                                                </div>
                                            </Space>
                                        </Card>
                                    </TabPane>
                                    
                                    <TabPane tab="Legend" key="legend">
                                        <Card title="Legend Settings" size="small">
                                            <Space direction="vertical" style={{ width: '100%' }} size="small">
                                                <div>
                                                    <Text strong>Show Legend</Text>
                                                    <Switch checked={true} style={{ marginTop: 8 }} />
                                                </div>
                                                
                                                <div>
                                                    <Text strong>Legend Position</Text>
                                                    <Select defaultValue="bottom" style={{ width: '100%', marginTop: 8 }}>
                                                        <Option value="top">Top</Option>
                                                        <Option value="bottom">Bottom</Option>
                                                        <Option value="left">Left</Option>
                                                        <Option value="right">Right</Option>
                                                    </Select>
                                                </div>
                                                
                                                <div>
                                                    <Text strong>Legend Layout</Text>
                                                    <Select defaultValue="horizontal" style={{ width: '100%', marginTop: 8 }}>
                                                        <Option value="horizontal">Horizontal</Option>
                                                        <Option value="vertical">Vertical</Option>
                                                    </Select>
                                                </div>
                                                
                                                <div>
                                                    <Text strong>Legend Font Size</Text>
                                                    <Slider
                                                        min={10}
                                                        max={20}
                                                        defaultValue={12}
                                                        style={{ marginTop: 8 }}
                                                    />
                                                </div>
                                            </Space>
                                        </Card>
                                    </TabPane>
                                    
                                    <TabPane tab="Tooltip" key="tooltip">
                                        <Card title="Tooltip Configuration" size="small">
                                            <Space direction="vertical" style={{ width: '100%' }} size="small">
                                                <div>
                                                    <Text strong>Show Tooltip</Text>
                                                    <Switch checked={true} style={{ marginTop: 8 }} />
                                                </div>
                                                
                                                <div>
                                                    <Text strong>Tooltip Trigger</Text>
                                                    <Select defaultValue="axis" style={{ width: '100%', marginTop: 8 }}>
                                                        <Option value="item">Item</Option>
                                                        <Option value="axis">Axis</Option>
                                                        <Option value="none">None</Option>
                                                    </Select>
                                                </div>
                                                
                                                <div>
                                                    <Text strong>Tooltip Background</Text>
                                                    <ColorPicker defaultValue="rgba(255,255,255,0.9)" style={{ marginTop: 8 }} />
                                                </div>
                                                
                                                <div>
                                                    <Text strong>Tooltip Border</Text>
                                                    <ColorPicker defaultValue="#d9d9d9" style={{ marginTop: 8 }} />
                                                </div>
                                            </Space>
                                        </Card>
                                    </TabPane>
                                    
                                    <TabPane tab="Colors" key="colors">
                                        <Card title="Color Management" size="small">
                                            <Space direction="vertical" style={{ width: '100%' }} size="small">
                                                <div>
                                                    <Text strong>Quick Color Themes</Text>
                                                    <div style={{ marginTop: 8 }}>
                                                        <Button 
                                                            size="small" 
                                                            onClick={() => applyColorTheme('d3-category10')}
                                                            style={{ margin: '2px' }}
                                                        >
                                                            D3-10
                                                        </Button>
                                                        <Button 
                                                            size="small" 
                                                            onClick={() => applyColorTheme('echarts-default')}
                                                            style={{ margin: '2px' }}
                                                        >
                                                            ECharts
                                                        </Button>
                                                        <Button 
                                                            size="small" 
                                                            onClick={() => applyColorTheme('echarts-vintage')}
                                                            style={{ margin: '2px' }}
                                                        >
                                                            Vintage
                                                        </Button>
                                                        <Button 
                                                            size="small" 
                                                            onClick={() => applyColorTheme('echarts-mint')}
                                                            style={{ margin: '2px' }}
                                                        >
                                                            Mint
                                                        </Button>
                                                    </div>
                                                    
                                                    {/* Theme Preview */}
                                                    <div style={{ marginTop: 12 }}>
                                                        <Text type="secondary" style={{ fontSize: '12px', marginBottom: 8 }}>
                                                            Popular Themes Preview:
                                                        </Text>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                            {['d3-category10', 'echarts-vintage', 'echarts-mint', 'echarts-sunset'].map((themeName) => (
                                                                <div 
                                                                    key={themeName}
                                                                    style={{ 
                                                                        cursor: 'pointer',
                                                                        padding: '8px',
                                                                        border: '1px solid #f0f0f0',
                                                                        borderRadius: '4px',
                                                                        backgroundColor: colorTheme === themeName ? '#e6f7ff' : '#fafafa',
                                                                        borderColor: colorTheme === themeName ? '#1890ff' : '#f0f0f0'
                                                                    }}
                                                                    onClick={() => applyColorTheme(themeName)}
                                                                    title={`Click to apply ${themeName}`}
                                                                >
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                                        <Text style={{ fontSize: '12px', fontWeight: 500 }}>
                                                                            {themeName.replace('echarts-', '').replace('d3-', '').replace('category', 'D3 ')}
                                                                        </Text>
                                                                        {colorTheme === themeName && (
                                                                            <Text type="success" style={{ fontSize: '10px' }}>✓ Active</Text>
                                                                        )}
                                                                    </div>
                                                                    <div style={{ display: 'flex', gap: 2 }}>
                                                                        {colorThemes[themeName as keyof typeof colorThemes]?.slice(0, 6).map((color, index) => (
                                                                            <div
                                                                                key={index}
                                                                                style={{
                                                                                    width: 16,
                                                                                    height: 16,
                                                                                    backgroundColor: color,
                                                                                    borderRadius: 2,
                                                                                    border: '1px solid #d9d9d9'
                                                                                }}
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <Divider />
                                                
                                                <div>
                                                    <Text strong>Individual Colors</Text>
                                                    <div style={{ marginTop: 8 }}>
                                                        {colors.map((color, index) => (
                                                            <div key={index} style={{ 
                                                                display: 'flex', 
                                                                alignItems: 'center', 
                                                                marginBottom: 8,
                                                                padding: '8px',
                                                                border: '1px solid #f0f0f0',
                                                                borderRadius: '4px',
                                                                backgroundColor: '#fafafa'
                                                            }}>
                                                                <ColorPicker
                                                                    value={color}
                                                                    onChange={(color) => {
                                                                        const newColors = [...colors];
                                                                        newColors[index] = color.toHexString();
                                                                        setColors(newColors);
                                                                    }}
                                                                />
                                                                <Text style={{ marginLeft: 8, fontSize: '12px', flex: 1 }}>
                                                                    Series {index + 1}
                                                                </Text>
                                                                <Button
                                                                    size="small"
                                                                    danger
                                                                    icon={<DeleteOutlined />}
                                                                    onClick={() => removeColor(index)}
                                                                    disabled={colors.length <= 1}
                                                                />
                                                            </div>
                                                        ))}
                                                        <Button 
                                                            type="dashed" 
                                                            block 
                                                            icon={<PlusOutlined />}
                                                            onClick={addMoreColors}
                                                            style={{ marginTop: 8 }}
                                                        >
                                                            Add Color
                                                        </Button>
                                                    </div>
                                                </div>
                                            </Space>
                                        </Card>
                                    </TabPane>
                                </Tabs>
                            </TabPane>
                            
                            <TabPane tab="Code" key="code">
                                <Card title="ECharts Configuration" size="small">
                                    <TextArea
                                        value={JSON.stringify(generateChartOption(), null, 2)}
                                        rows={15}
                                        readOnly
                                        style={{ fontFamily: 'monospace', fontSize: '12px' }}
                                    />
                                </Card>
                            </TabPane>
                            
                            <TabPane tab="Data" key="data">
                                <Card title="Data Editor" size="small">
                                    <TextArea
                                        value={JSON.stringify(chartData, null, 2)}
                                        rows={15}
                                        onChange={(e) => {
                                            try {
                                                const newData = JSON.parse(e.target.value);
                                                setChartData(newData);
                                            } catch (error) {
                                                // Invalid JSON, don't update
                                            }
                                        }}
                                        placeholder="Enter JSON data here..."
                                        style={{ fontFamily: 'monospace', fontSize: '12px' }}
                                    />
                                </Card>
                            </TabPane>
                            
                            <TabPane tab="Analytics" key="analytics">
                                <Card title="Data Analytics" size="small">
                                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                                        <div>
                                            <Text strong>Statistical Summary</Text>
                                            <div style={{ marginTop: 8, padding: '8px', backgroundColor: '#f6ffed', borderRadius: '4px' }}>
                                                {chartData.length > 0 && (
                                                    <div style={{ fontSize: '12px' }}>
                                                        <div><strong>Count:</strong> {chartData.length}</div>
                                                        <div><strong>Sum:</strong> {chartData.reduce((sum: number, item: any) => sum + (item.value || item.y || item.count || 0), 0).toFixed(2)}</div>
                                                        <div><strong>Average:</strong> {(chartData.reduce((sum: number, item: any) => sum + (item.value || item.y || item.count || 0), 0) / chartData.length).toFixed(2)}</div>
                                                        <div><strong>Min:</strong> {Math.min(...chartData.map((item: any) => item.value || item.y || item.count || 0)).toFixed(2)}</div>
                                                        <div><strong>Max:</strong> {Math.max(...chartData.map((item: any) => item.value || item.y || item.count || 0)).toFixed(2)}</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <Text strong>Data Distribution</Text>
                                            <div style={{ marginTop: 8 }}>
                                                <Button size="small" style={{ margin: '2px' }}>
                                                    Histogram
                                                </Button>
                                                <Button size="small" style={{ margin: '2px' }}>
                                                    Box Plot
                                                </Button>
                                                <Button size="small" style={{ margin: '2px' }}>
                                                    Correlation
                                                </Button>
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <Text strong>Trend Analysis</Text>
                                            <div style={{ marginTop: 8 }}>
                                                <Button size="small" style={{ margin: '2px' }}>
                                                    Moving Average
                                                </Button>
                                                <Button size="small" style={{ margin: '2px' }}>
                                                    Seasonality
                                                </Button>
                                                <Button size="small" style={{ margin: '2px' }}>
                                                    Forecasting
                                                </Button>
                                            </div>
                                        </div>
                                    </Space>
                                </Card>
                            </TabPane>
                        </Tabs>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChartBuilder;
