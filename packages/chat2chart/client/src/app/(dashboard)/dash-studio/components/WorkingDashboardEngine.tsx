'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Card,
    Button,
    Space,
    Typography,
    message,
    Modal,
    Form,
    Input,
    Select,
    Row,
    Col,
    Divider,
    Alert,
    Spin,
    Tag,
    Tooltip,
    Badge,
    Tabs,
    Switch,
    Slider,
    ColorPicker,
    Drawer,
    InputNumber,
    Checkbox,
    Radio,
    Upload,
    Dropdown,
    Menu
} from 'antd';
import {
    PlayCircleOutlined,
    PauseCircleOutlined,
    SaveOutlined,
    ReloadOutlined,
    SettingOutlined,
    EyeOutlined,
    EyeInvisibleOutlined,
    FullscreenOutlined,
    CompressOutlined,
    DownloadOutlined,
    ShareAltOutlined,
    ThunderboltOutlined,
    DatabaseOutlined,
    BarChartOutlined,
    LineChartOutlined,
    PieChartOutlined,
    TableOutlined,
    NumberOutlined,
    FilterOutlined,
    PictureOutlined,
    FileTextOutlined,
    LayoutOutlined,
    StarOutlined,
    StarFilled,
    DeleteOutlined,
    CopyOutlined,
    EditOutlined,
    PlusOutlined,
    DragOutlined,
    LockOutlined,
    UnlockOutlined,
    LinkOutlined,
    BulbOutlined,
    MobileOutlined,
    DesktopOutlined,
    TabletOutlined,
    GlobalOutlined,
    ExportOutlined,
    ImportOutlined,
    HistoryOutlined,
    UndoOutlined,
    RedoOutlined,
    ZoomInOutlined,
    ZoomOutOutlined,
    AlignLeftOutlined,
    AlignCenterOutlined,
    AlignRightOutlined,
    VerticalAlignTopOutlined,
    VerticalAlignMiddleOutlined,
    VerticalAlignBottomOutlined,
    AreaChartOutlined,
    RadarChartOutlined
} from '@ant-design/icons';
import { Responsive, WidthProvider } from 'react-grid-layout';

const ResponsiveGridLayout = WidthProvider(Responsive);
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { TextArea } = Input;

interface DashboardWidget {
    id: string;
    type: 'chart' | 'table' | 'metric' | 'text' | 'markdown' | 'filter' | 'image' | 'title' | 'panel' | 'control' | 'header' | 'footer';
    title: string;
    content?: string;
    position: { x: number; y: number; w: number; h: number };
    config: any;
    data?: any;
    style: {
        backgroundColor: string;
        borderColor: string;
        borderRadius: number;
        padding: number;
        shadow: string;
        opacity: number;
        zIndex: number;
        fontSize?: number;
        fontWeight?: string;
        textAlign?: 'left' | 'center' | 'right';
        color?: string;
    };
    isVisible: boolean;
    isSelected: boolean;
    isLocked: boolean;
    isResizable: boolean;
    isDraggable: boolean;
    refreshInterval?: number;
    lastRefresh?: Date;
    dataSource?: string;
    query?: string;
    filters?: string[];
    parameters?: string[];
}

interface Dashboard {
    id: string;
    name: string;
    description?: string;
    widgets: DashboardWidget[];
    layout: any;
    theme: 'light' | 'dark';
    gridSize: number;
    snapToGrid: boolean;
    showGrid: boolean;
    backgroundColor: string;
    createdAt: Date;
    updatedAt: Date;
    isPublished: boolean;
    version: number;
    pages: DashboardPage[];
    currentPage: string;
}

interface DashboardPage {
    id: string;
    name: string;
    widgets: string[];
    layout: any;
    isVisible: boolean;
    order: number;
}

const WorkingDashboardEngine: React.FC<{
    initialDashboard?: Dashboard;
    onDashboardSave: (dashboard: Dashboard) => void;
    onDashboardPublish: (dashboard: Dashboard) => void;
    onWidgetUpdate: (widget: DashboardWidget) => void;
    onWidgetDelete: (widgetId: string) => void;
}> = ({
    initialDashboard,
    onDashboardSave,
    onDashboardPublish,
    onWidgetUpdate,
    onWidgetDelete
}) => {
    const [dashboard, setDashboard] = useState<Dashboard>(initialDashboard || {
        id: `dashboard_${Date.now()}`,
        name: 'New Dashboard',
        description: 'Create your first working dashboard',
        widgets: [],
        layout: {},
        theme: 'dark',
        gridSize: 20,
        snapToGrid: true,
        showGrid: true,
        backgroundColor: '#1f1f1f',
        createdAt: new Date(),
        updatedAt: new Date(),
        isPublished: false,
        version: 1,
        pages: [{
            id: 'page_1',
            name: 'Main Page',
            widgets: [],
            layout: {},
            isVisible: true,
            order: 1
        }],
        currentPage: 'page_1'
    });

    const [selectedWidgets, setSelectedWidgets] = useState<string[]>([]);
    const [showWidgetConfig, setShowWidgetConfig] = useState(false);
    const [configuringWidget, setConfiguringWidget] = useState<DashboardWidget | null>(null);
    const [showPageManager, setShowPageManager] = useState(false);
    const [showLayoutSettings, setShowLayoutSettings] = useState(false);
    const [zoom, setZoom] = useState(100);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showGrid, setShowGrid] = useState(true);
    const [snapToGrid, setSnapToGrid] = useState(true);
    const [gridSize, setGridSize] = useState(20);
    const [isDragging, setIsDragging] = useState(false);

    // Widget Library Panel State
    const [showWidgetLibrary, setShowWidgetLibrary] = useState(true);
    const [widgetLibraryWidth, setWidgetLibraryWidth] = useState(300);

    // Enhanced widget creation with proper positioning
    const createWidget = useCallback((type: string, title?: string) => {
        const newWidget: DashboardWidget = {
            id: `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: type as any,
            title: title || `${type.charAt(0).toUpperCase() + type.slice(1)} Widget`,
            content: getDefaultContent(type),
            position: {
                x: Math.floor(Math.random() * 6),
                y: Math.floor(Math.random() * 4),
                w: type === 'metric' ? 3 : type === 'text' ? 4 : 6,
                h: type === 'metric' ? 2 : type === 'text' ? 2 : 4
            },
            config: getDefaultConfig(type),
            style: {
                backgroundColor: '#2a2a2a',
                borderColor: '#404040',
                borderRadius: 8,
                padding: 16,
                shadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                opacity: 1,
                zIndex: 1,
                fontSize: type === 'title' ? 24 : 16,
                fontWeight: type === 'title' ? 'bold' : 'normal',
                textAlign: 'center' as const,
                color: '#ffffff'
            },
            isVisible: true,
            isSelected: false,
            isLocked: false,
            isResizable: true,
            isDraggable: true
        };

        setDashboard(prev => ({
            ...prev,
            widgets: [...prev.widgets, newWidget],
            updatedAt: new Date()
        }));

        setShowWidgetLibrary(false);
        message.success(`${newWidget.title} added to dashboard`);
    }, []);

    // Get default content based on widget type
    const getDefaultContent = (type: string): string => {
        switch (type) {
            case 'title':
                return 'Dashboard Title';
            case 'text':
                return 'Enter your text here...';
            case 'markdown':
                return '# Markdown Content\n\n- Point 1\n- Point 2\n- Point 3';
            case 'metric':
                return '0';
            default:
                return '';
        }
    };

    // Get default configuration based on widget type
    const getDefaultConfig = (type: string): any => {
        switch (type) {
            case 'chart':
                return {
                    chartType: 'bar',
                    dataSource: 'sample',
                    refreshInterval: 30
                };
            case 'table':
                return {
                    columns: ['Column 1', 'Column 2', 'Column 3'],
                    dataSource: 'sample',
                    pagination: true
                };
            case 'filter':
                return {
                    filterType: 'dropdown',
                    options: ['Option 1', 'Option 2', 'Option 3'],
                    defaultValue: 'Option 1'
                };
            case 'control':
                return {
                    controlType: 'button',
                    action: 'refresh',
                    label: 'Refresh Data'
                };
            default:
                return {};
        }
    };

    // Enhanced widget selection with multi-select
    const handleWidgetSelect = useCallback((widgetId: string, multiSelect: boolean = false) => {
        if (multiSelect) {
            setSelectedWidgets(prev => 
                prev.includes(widgetId) 
                    ? prev.filter(id => id !== widgetId)
                    : [...prev, widgetId]
            );
        } else {
            setSelectedWidgets([widgetId]);
        }
    }, []);

    // Enhanced widget configuration
    const handleWidgetConfig = useCallback((widget: DashboardWidget) => {
        setConfiguringWidget(widget);
        setShowWidgetConfig(true);
    }, []);

    // Save widget configuration with enhanced validation
    const handleSaveWidgetConfig = useCallback((updatedWidget: DashboardWidget) => {
        setDashboard(prev => ({
            ...prev,
            widgets: prev.widgets.map(w => 
                w.id === updatedWidget.id ? updatedWidget : w
            ),
            updatedAt: new Date()
        }));

        onWidgetUpdate(updatedWidget);
        setShowWidgetConfig(false);
        setConfiguringWidget(null);
        message.success('Widget configuration saved');
    }, [onWidgetUpdate]);

    // Enhanced widget deletion with confirmation
    const handleDeleteWidgets = useCallback(() => {
        if (selectedWidgets.length === 0) return;

        Modal.confirm({
            title: 'Delete Widgets',
            content: `Are you sure you want to delete ${selectedWidgets.length} selected widget(s)?`,
            okText: 'Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: () => {
                setDashboard(prev => ({
                    ...prev,
                    widgets: prev.widgets.filter(w => !selectedWidgets.includes(w.id)),
                    updatedAt: new Date()
                }));
                
                onWidgetDelete(selectedWidgets[0]); // Notify parent
                setSelectedWidgets([]);
                message.success(`${selectedWidgets.length} widget(s) deleted`);
            }
        });
    }, [selectedWidgets, onWidgetDelete]);

    // Enhanced widget duplication
    const handleDuplicateWidgets = useCallback(() => {
        if (selectedWidgets.length === 0) return;

        const duplicatedWidgets = selectedWidgets.map(widgetId => {
            const originalWidget = dashboard.widgets.find(w => w.id === widgetId);
            if (!originalWidget) return null;

            return {
                ...originalWidget,
                id: `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                title: `${originalWidget.title} (Copy)`,
                position: {
                    x: originalWidget.position.x + 1,
                    y: originalWidget.position.y + 1,
                    w: originalWidget.position.w,
                    h: originalWidget.position.h
                },
                isSelected: false
            };
        }).filter(Boolean) as DashboardWidget[];

        setDashboard(prev => ({
            ...prev,
            widgets: [...prev.widgets, ...duplicatedWidgets],
            updatedAt: new Date()
        }));

        message.success(`${duplicatedWidgets.length} widgets duplicated`);
        setSelectedWidgets([]);
    }, [selectedWidgets, dashboard.widgets]);

    // Enhanced layout change handling
    const handleLayoutChange = useCallback((layout: any, layouts: any) => {
        setDashboard(prev => {
            const updatedWidgets = prev.widgets.map(widget => {
                const layoutItem = layout.find((item: any) => item.i === widget.id);
                if (layoutItem) {
                    return {
                        ...widget,
                        position: {
                            x: layoutItem.x,
                            y: layoutItem.y,
                            w: layoutItem.w,
                            h: layoutItem.h
                        }
                    };
                }
                return widget;
            });

            return {
                ...prev,
                layout: layouts,
                widgets: updatedWidgets,
                updatedAt: new Date()
            };
        });
    }, []);

    // Enhanced grid layout configuration
    const getGridLayout = useCallback(() => {
        return dashboard.widgets.map(widget => ({
            i: widget.id,
            x: widget.position.x,
            y: widget.position.y,
            w: widget.position.w,
            h: widget.position.h,
            minW: 2,
            minH: 2,
            maxW: 12,
            maxH: 12,
            isResizable: widget.isResizable,
            isDraggable: widget.isDraggable,
            isBounded: true,
            static: widget.isLocked,
            // Enhanced drag and drop properties
            draggableHandle: '.widget-header',
            resizeHandles: ['s', 'w', 'e', 'n', 'sw', 'nw', 'se', 'ne'] as any
        }));
    }, [dashboard.widgets]);

    // Enhanced widget rendering with better interactivity
    const renderWidget = useCallback((widget: DashboardWidget) => {
        const isSelected = selectedWidgets.includes(widget.id);
        const isDragging = false; // Will be enhanced with drag state

        return (
            <div
                key={widget.id}
                className={`dashboard-widget ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
                style={{
                    height: '100%',
                    position: 'relative',
                    backgroundColor: widget.style.backgroundColor,
                    border: `2px solid ${isSelected ? '#1890ff' : widget.style.borderColor}`,
                    borderRadius: widget.style.borderRadius,
                    padding: widget.style.padding,
                    boxShadow: widget.style.shadow,
                    opacity: widget.style.opacity,
                    zIndex: widget.style.zIndex,
                    cursor: isSelected ? 'move' : 'default',
                    transition: 'all 0.2s ease'
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    handleWidgetSelect(widget.id, e.ctrlKey || e.metaKey);
                }}
                onDoubleClick={() => handleWidgetConfig(widget)}
            >
                {/* Widget Header */}
                <div 
                    className="widget-header"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '32px',
                        backgroundColor: isSelected ? '#1890ff' : 'transparent',
                        borderTopLeftRadius: widget.style.borderRadius - 2,
                        borderTopRightRadius: widget.style.borderRadius - 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 8px',
                        cursor: 'move',
                        zIndex: 10
                    }}
                >
                    <div style={{ 
                        fontSize: '12px', 
                        color: isSelected ? '#ffffff' : '#888888',
                        fontWeight: 'bold',
                        userSelect: 'none'
                    }}>
                        {widget.title}
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <Button
                            size="small"
                            type="text"
                            icon={<SettingOutlined />}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleWidgetConfig(widget);
                            }}
                            style={{ color: isSelected ? '#ffffff' : '#888888' }}
                        />
                        <Button
                            size="small"
                            type="text"
                            icon={widget.isLocked ? <LockOutlined /> : <UnlockOutlined />}
                            onClick={(e) => {
                                e.stopPropagation();
                                setDashboard(prev => ({
                                    ...prev,
                                    widgets: prev.widgets.map(w => 
                                        w.id === widget.id ? { ...w, isLocked: !w.isLocked } : w
                                    )
                                }));
                            }}
                            style={{ color: isSelected ? '#ffffff' : '#888888' }}
                        />
                    </div>
                </div>

                {/* Widget Content */}
                <div style={{ 
                    height: '100%', 
                    paddingTop: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    {renderWidgetContent(widget)}
                </div>

                {/* Selection Indicator */}
                {isSelected && (
                    <div
                        style={{
                            position: 'absolute',
                            top: '-2px',
                            left: '-2px',
                            right: '-2px',
                            bottom: '-2px',
                            border: '2px solid #1890ff',
                            borderRadius: widget.style.borderRadius + 2,
                            pointerEvents: 'none',
                            zIndex: 5
                        }}
                    />
                )}

                {/* Resize Handles */}
                {isSelected && (
                    <>
                        <div className="resize-handle resize-handle-n" style={{ top: '-4px', left: '50%', transform: 'translateX(-50%)' }} />
                        <div className="resize-handle resize-handle-s" style={{ bottom: '-4px', left: '50%', transform: 'translateX(-50%)' }} />
                        <div className="resize-handle resize-handle-w" style={{ left: '-4px', top: '50%', transform: 'translateY(-50%)' }} />
                        <div className="resize-handle resize-handle-e" style={{ right: '-4px', top: '50%', transform: 'translateY(-50%)' }} />
                        <div className="resize-handle resize-handle-nw" style={{ top: '-4px', left: '-4px' }} />
                        <div className="resize-handle resize-handle-ne" style={{ top: '-4px', right: '-4px' }} />
                        <div className="resize-handle resize-handle-sw" style={{ bottom: '-4px', left: '-4px' }} />
                        <div className="resize-handle resize-handle-se" style={{ bottom: '-4px', right: '-4px' }} />
                    </>
                )}
            </div>
        );
    }, [selectedWidgets, handleWidgetSelect, handleWidgetConfig]);

    // Render widget content
    const renderWidgetContent = useCallback((widget: DashboardWidget) => {
        const isSelected = selectedWidgets.includes(widget.id);

        switch (widget.type) {
            case 'chart':
                return (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ textAlign: 'center' }}>
                                <BarChartOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
                                <div style={{ color: '#ffffff' }}>Chart Widget</div>
                                <div style={{ fontSize: '12px', color: '#888' }}>Configure data source and chart type</div>
                            </div>
                        </div>
                    </div>
                );

            case 'table':
                return (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ textAlign: 'center' }}>
                                <TableOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
                                <div style={{ color: '#ffffff' }}>Table Widget</div>
                                <div style={{ fontSize: '12px', color: '#888' }}>Configure data source and columns</div>
                            </div>
                        </div>
                    </div>
                );

            case 'metric':
                return (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ textAlign: 'center' }}>
                            <NumberOutlined style={{ fontSize: 48, color: '#faad14', marginBottom: 16 }} />
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff' }}>0</div>
                            <div style={{ fontSize: '12px', color: '#888' }}>Metric Value</div>
                        </div>
                    </div>
                );

            case 'text':
                return (
                    <div style={{ 
                        height: '100%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        padding: '16px',
                        textAlign: widget.style.textAlign || 'center',
                        fontSize: widget.style.fontSize || 16,
                        fontWeight: widget.style.fontWeight || 'normal',
                        color: widget.style.color || '#ffffff'
                    }}>
                        {widget.content || 'Enter your text here'}
                    </div>
                );

            case 'markdown':
                return (
                    <div style={{ 
                        height: '100%', 
                        padding: '16px',
                        color: '#ffffff',
                        fontSize: widget.style.fontSize || 14
                    }}>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                            {widget.content || '# Enter your markdown here\n\n- Point 1\n- Point 2'}
                        </pre>
                    </div>
                );

            case 'filter':
                return (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '16px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <FilterOutlined style={{ fontSize: 32, color: '#722ed1', marginBottom: 12 }} />
                            <div style={{ color: '#ffffff', marginBottom: 8 }}>Filter Widget</div>
                            <div style={{ fontSize: '12px', color: '#888' }}>Configure filter options</div>
                        </div>
                    </div>
                );

            case 'control':
                return (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '16px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <SettingOutlined style={{ fontSize: 32, color: '#13c2c2', marginBottom: 12 }} />
                            <div style={{ color: '#ffffff', marginBottom: 8 }}>Control Widget</div>
                            <div style={{ fontSize: '12px', color: '#888' }}>Configure control parameters</div>
                        </div>
                    </div>
                );

            case 'header':
                return (
                    <div style={{ 
                        height: '100%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        padding: '24px',
                        textAlign: 'center'
                    }}>
                        <div>
                            <Title level={2} style={{ color: '#ffffff', margin: 0 }}>
                                {widget.content || 'Dashboard Title'}
                            </Title>
                            {widget.config?.subtitle && (
                                <Text style={{ color: '#888', fontSize: '16px' }}>
                                    {widget.config.subtitle}
                                </Text>
                            )}
                        </div>
                    </div>
                );

            case 'footer':
                return (
                    <div style={{ 
                        height: '100%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        padding: '16px',
                        textAlign: 'center'
                    }}>
                        <div>
                            <Text style={{ color: '#888', fontSize: '14px' }}>
                                {widget.content || '© 2024 Dashboard Builder'}
                            </Text>
                        </div>
                    </div>
                );

            default:
                return (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ textAlign: 'center', color: '#888' }}>
                            Unknown widget type: {widget.type}
                        </div>
                    </div>
                );
        }
    }, [selectedWidgets]);

    // Widget Library Panel
    const renderWidgetLibrary = () => (
        <Modal
            title="Widget Library"
            open={showWidgetLibrary}
            onCancel={() => setShowWidgetLibrary(false)}
            width={800}
            footer={null}
        >
            <Tabs defaultActiveKey="charts">
                <TabPane tab="Charts" key="charts">
                    <Row gutter={[16, 16]}>
                        <Col span={8}>
                            <Card
                                size="small"
                                hoverable
                                onClick={() => createWidget('chart', 'Bar Chart')}
                                style={{ textAlign: 'center', cursor: 'pointer' }}
                            >
                                <BarChartOutlined style={{ fontSize: 32, color: '#1890ff', marginBottom: 8 }} />
                                <div>Bar Chart</div>
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card
                                size="small"
                                hoverable
                                onClick={() => createWidget('chart', 'Line Chart')}
                                style={{ textAlign: 'center', cursor: 'pointer' }}
                            >
                                <LineChartOutlined style={{ fontSize: 32, color: '#52c41a', marginBottom: 8 }} />
                                <div>Line Chart</div>
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card
                                size="small"
                                hoverable
                                onClick={() => createWidget('chart', 'Pie Chart')}
                                style={{ textAlign: 'center', cursor: 'pointer' }}
                            >
                                <PieChartOutlined style={{ fontSize: 32, color: '#faad14', marginBottom: 8 }} />
                                <div>Pie Chart</div>
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card
                                size="small"
                                hoverable
                                onClick={() => createWidget('chart', 'Area Chart')}
                                style={{ textAlign: 'center', cursor: 'pointer' }}
                            >
                                <AreaChartOutlined style={{ fontSize: 32, color: '#722ed1', marginBottom: 8 }} />
                                <div>Area Chart</div>
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card
                                size="small"
                                hoverable
                                onClick={() => createWidget('chart', 'Scatter Plot')}
                                style={{ textAlign: 'center', cursor: 'pointer' }}
                            >
                                <BarChartOutlined style={{ fontSize: 32, color: '#13c2c2', marginBottom: 8 }} />
                                <div>Scatter Plot</div>
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card
                                size="small"
                                hoverable
                                onClick={() => createWidget('chart', 'Radar Chart')}
                                style={{ textAlign: 'center', cursor: 'pointer' }}
                            >
                                <RadarChartOutlined style={{ fontSize: 32, color: '#eb2f96', marginBottom: 8 }} />
                                <div>Radar Chart</div>
                            </Card>
                        </Col>
                    </Row>
                </TabPane>

                <TabPane tab="Data" key="data">
                    <Row gutter={[16, 16]}>
                        <Col span={8}>
                            <Card
                                size="small"
                                hoverable
                                onClick={() => createWidget('table', 'Data Table')}
                                style={{ textAlign: 'center', cursor: 'pointer' }}
                            >
                                <TableOutlined style={{ fontSize: 32, color: '#52c41a', marginBottom: 8 }} />
                                <div>Data Table</div>
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card
                                size="small"
                                hoverable
                                onClick={() => createWidget('metric', 'KPI Metric')}
                                style={{ textAlign: 'center', cursor: 'pointer' }}
                            >
                                <NumberOutlined style={{ fontSize: 32, color: '#faad14', marginBottom: 8 }} />
                                <div>KPI Metric</div>
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card
                                size="small"
                                hoverable
                                onClick={() => createWidget('filter', 'Data Filter')}
                                style={{ textAlign: 'center', cursor: 'pointer' }}
                            >
                                <FilterOutlined style={{ fontSize: 32, color: '#722ed1', marginBottom: 8 }} />
                                <div>Data Filter</div>
                            </Card>
                        </Col>
                    </Row>
                </TabPane>

                <TabPane tab="Content" key="content">
                    <Row gutter={[16, 16]}>
                        <Col span={8}>
                            <Card
                                size="small"
                                hoverable
                                onClick={() => createWidget('text', 'Text Block')}
                                style={{ textAlign: 'center', cursor: 'pointer' }}
                            >
                                <FileTextOutlined style={{ fontSize: 32, color: '#1890ff', marginBottom: 8 }} />
                                <div>Text Block</div>
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card
                                size="small"
                                hoverable
                                onClick={() => createWidget('markdown', 'Markdown')}
                                style={{ textAlign: 'center', cursor: 'pointer' }}
                            >
                                <FileTextOutlined style={{ fontSize: 32, color: '#52c41a', marginBottom: 8 }} />
                                <div>Markdown</div>
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card
                                size="small"
                                hoverable
                                onClick={() => createWidget('image', 'Image')}
                                style={{ textAlign: 'center', cursor: 'pointer' }}
                            >
                                <PictureOutlined style={{ fontSize: 32, color: '#faad14', marginBottom: 8 }} />
                                <div>Image</div>
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card
                                size="small"
                                hoverable
                                onClick={() => createWidget('title', 'Title')}
                                style={{ textAlign: 'center', cursor: 'pointer' }}
                            >
                                <FileTextOutlined style={{ fontSize: 32, color: '#722ed1', marginBottom: 8 }} />
                                <div>Title</div>
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card
                                size="small"
                                hoverable
                                onClick={() => createWidget('control', 'Control')}
                                style={{ textAlign: 'center', cursor: 'pointer' }}
                            >
                                <SettingOutlined style={{ fontSize: 32, color: '#13c2c2', marginBottom: 8 }} />
                                <div>Control</div>
                            </Card>
                        </Col>
                    </Row>
                </TabPane>
            </Tabs>
        </Modal>
    );

    return (
        <div className="working-dashboard-engine" style={{ height: '100%', backgroundColor: dashboard.backgroundColor }}>
            {/* Toolbar */}
            <div style={{
                padding: '12px 16px',
                backgroundColor: '#2a2a2a',
                borderBottom: '1px solid #404040',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <Space>
                    <Button
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={() => setShowWidgetLibrary(true)}
                    >
                        Add Widget
                    </Button>
                    
                    <Button
                        size="small"
                        icon={<LayoutOutlined />}
                        onClick={() => setShowPageManager(true)}
                    >
                        Pages
                    </Button>

                    <Button
                        size="small"
                        icon={<SettingOutlined />}
                        onClick={() => setShowLayoutSettings(true)}
                    >
                        Layout
                    </Button>

                    <Divider type="vertical" style={{ borderColor: '#404040' }} />

                    <Button
                        size="small"
                        icon={<ZoomInOutlined />}
                        onClick={() => setZoom(Math.min(zoom + 25, 200))}
                        disabled={zoom >= 200}
                    >
                        Zoom In
                    </Button>
                    
                    <Button
                        size="small"
                        icon={<ZoomOutOutlined />}
                        onClick={() => setZoom(Math.max(zoom - 25, 25))}
                        disabled={zoom <= 25}
                    >
                        Zoom Out
                    </Button>

                    <Button
                        size="small"
                        icon={<FullscreenOutlined />}
                        onClick={() => setZoom(100)}
                    >
                        Fit
                    </Button>

                    <Text style={{ color: '#ffffff', fontSize: '12px' }}>
                        {zoom}%
                    </Text>
                </Space>

                <Space>
                    {selectedWidgets.length > 0 && (
                        <>
                            <Text style={{ color: '#ffffff', fontSize: '12px' }}>
                                {selectedWidgets.length} selected
                            </Text>
                            
                            <Button
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => {
                                    const widget = dashboard.widgets.find(w => w.id === selectedWidgets[0]);
                                    if (widget) handleWidgetConfig(widget);
                                }}
                                disabled={selectedWidgets.length !== 1}
                            >
                                Configure
                            </Button>

                            <Button
                                size="small"
                                icon={<CopyOutlined />}
                                onClick={handleDuplicateWidgets}
                            >
                                Duplicate
                            </Button>

                            <Button
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={handleDeleteWidgets}
                            >
                                Delete
                            </Button>
                        </>
                    )}

                    <Divider type="vertical" style={{ borderColor: '#404040' }} />

                    <Button
                        size="small"
                        icon={showGrid ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                        onClick={() => setShowGrid(!showGrid)}
                    >
                        Grid
                    </Button>

                    <Button
                        size="small"
                        icon={snapToGrid ? <LockOutlined /> : <UnlockOutlined />}
                        onClick={() => setSnapToGrid(!snapToGrid)}
                    >
                        Snap
                    </Button>

                    <Button
                        size="small"
                        icon={isFullscreen ? <CompressOutlined /> : <FullscreenOutlined />}
                        onClick={() => setIsFullscreen(!isFullscreen)}
                    >
                        {isFullscreen ? 'Exit' : 'Fullscreen'}
                    </Button>
                </Space>
            </div>

            {/* Canvas Area */}
            <div style={{
                flex: 1,
                overflow: 'auto',
                position: 'relative',
                backgroundColor: dashboard.backgroundColor,
                backgroundImage: showGrid ? `radial-gradient(circle, #404040 1px, transparent 1px)` : 'none',
                backgroundSize: `${gridSize}px ${gridSize}px`,
                minHeight: '600px'
            }}>
                <ResponsiveGridLayout
                    className="layout"
                    layouts={{ lg: getGridLayout() }}
                    breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                    cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                    rowHeight={60}
                    onLayoutChange={handleLayoutChange}
                    isDraggable={true}
                    isResizable={true}
                    draggableHandle=".widget-header"
                    useCSSTransforms={true}
                    transformScale={zoom / 100}
                    style={{
                        minHeight: '100%',
                        padding: '20px'
                    }}
                >
                    {dashboard.widgets.map(widget => (
                        renderWidget(widget)
                    ))}
                </ResponsiveGridLayout>
            </div>

            {/* Widget Library Panel */}
            {renderWidgetLibrary()}

            {/* Drop Zone Overlay */}
            {isDragging && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(24, 144, 255, 0.1)',
                        border: '2px dashed #1890ff',
                        pointerEvents: 'none',
                        zIndex: 9999
                    }}
                />
            )}
        </div>
    );
};

export default WorkingDashboardEngine;
