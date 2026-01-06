'use client';

import React, {
    useEffect,
    useRef,
    useState,
    useCallback,
    useMemo,
} from 'react';
// Import only the core ECharts module to reduce bundle size
import * as echarts from 'echarts/core';
import {
    BarChart,
    LineChart,
    PieChart,
    ScatterChart,
    RadarChart,
    GaugeChart,
    FunnelChart,
    HeatmapChart,
} from 'echarts/charts';
import {
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    GridComponent,
    VisualMapComponent,
    GraphicComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// Register the necessary components
echarts.use([
    BarChart,
    LineChart,
    PieChart,
    ScatterChart,
    RadarChart,
    GaugeChart,
    FunnelChart,
    HeatmapChart,
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    GridComponent,
    VisualMapComponent,
    GraphicComponent,
    CanvasRenderer,
]);

import {
    Button,
    Dropdown,
    Menu,
    Input,
    Typography,
    Space,
    message,
    Modal,
} from 'antd';
import {
    SettingOutlined,
    ShareAltOutlined,
    DeleteOutlined,
    MoreOutlined,
    LockOutlined,
    UnlockOutlined,
    CloseOutlined,
    CopyOutlined,
    DownloadOutlined,
    SaveOutlined,
    BarChartOutlined,
} from '@ant-design/icons';
import { addWatermarkToChart } from '@/utils/watermark';

const { Title } = Typography;

// Utility function to create a debounced function
type AnyFunction = (...args: any[]) => void;
const createDebounced = (func: AnyFunction, delay: number) => {
    let timeoutId: NodeJS.Timeout | null = null;
    return (...args: any[]) => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(
            () => func(...args),
            delay
        ) as unknown as NodeJS.Timeout;
    };
};

// Utility function to detect property changes
const detectPropertyChanges = (oldObj: any, newObj: any): string[] => {
    if (!oldObj || !newObj) return [];
    const changes: string[] = [];

    // Check all properties in new object
    Object.keys(newObj).forEach((key) => {
        if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
            changes.push(key);
        }
    });

    // Check for removed properties
    Object.keys(oldObj).forEach((key) => {
        if (!(key in newObj)) {
            changes.push(key);
        }
    });

    return changes;
};

// Property-specific update strategies - ALL design panel properties mapped
const getPropertyUpdateStrategy = (property: string) => {
    const strategies: { [key: string]: string[] } = {
        // Title & Subtitle
        title: ['title'],
        subtitle: ['title'],
        titleColor: ['title'],

        // Visual Configuration
        colorPalette: ['series'],
        theme: ['title', 'legend', 'tooltip', 'xAxis', 'yAxis'],
        textColor: ['title', 'legend', 'tooltip'],

        // Legend Configuration
        legend: ['legend'],
        legendShow: ['legend'],
        legendPosition: ['legend'],

        // Tooltip Configuration
        tooltip: ['tooltip'],
        tooltipShow: ['tooltip'],
        tooltipTrigger: ['tooltip'],
        tooltipFormatter: ['tooltip'],
        tooltipCustomFormatter: ['tooltip'],

        // Animation Configuration
        animation: ['animation'],
        animationDuration: ['animation'],

        // Series Label Configuration
        seriesLabelShow: ['series'],
        seriesLabelPosition: ['series'],

        // Data Configuration
        xAxisField: ['xAxis'],
        showXAxis: ['xAxis'],
        yAxisField: ['yAxis'],
        showYAxis: ['yAxis'],
        seriesField: ['series'],
        dataLimit: ['series'],
        dataLabelsShow: ['series'],
        dataLabelsFormat: ['series'],

        // Layout & Positioning
        responsive: ['layout'],
        draggable: ['layout'],
        resizable: ['layout'],
        padding: ['layout'],
        margin: ['layout'],
        backgroundColor: ['backgroundColor'],
        borderColor: ['backgroundColor'],

        // Chart Type & Data
        chartType: ['series', 'xAxis', 'yAxis'],
        data: ['series'],

        // Grid Configuration
        grid: ['grid'],
        xAxis: ['xAxis'],
        yAxis: ['yAxis'],
        series: ['series'],
    };

    return strategies[property] || ['series']; // Default to series for unknown properties
};

interface ChartWidgetProps {
    widget: any;
    config: any;
    data: any;
    onConfigUpdate?: (newConfig: any) => void;
    onWidgetClick?: (widgetId: string) => void;
    // Selection helpers forwarded from WidgetRenderer
    onWidgetSelect?: (widgetId: string) => void;
    selectWidget?: (widgetId: string) => void;
    onDelete?: (widgetId: string) => void;
    onDuplicate?: (widgetId: string) => void;
    onUpdate?: (widgetId: string, update: any) => void;
    isPreviewMode?: boolean;
    isEditing?: boolean;
    isSelected?: boolean;
    isDarkMode?: boolean;
    showEditableTitle?: boolean;
    onTitleChange?: (newTitle: string) => void;
    onChartCreate?: (chartData: any) => void;
}

const ChartWidget: React.FC<ChartWidgetProps> = ({
    widget,
    config,
    data,
    onConfigUpdate,
    onWidgetClick,
    onDelete,
    onDuplicate,
    onUpdate,
    isPreviewMode = false,
    isEditing = false,
    isSelected = false,
    isDarkMode = false,
    showEditableTitle = false,
    onTitleChange,
    onChartCreate,
}) => {
    // Organization context removed

    // Ensure optional callbacks have safe defaults to simplify callers
    const _onConfigUpdate = onConfigUpdate ?? (() => {});
    const _onWidgetClick = onWidgetClick ?? (() => alert(widget.id));
    const _onDelete = onDelete ?? (() => {});
    const _onDuplicate = onDuplicate ?? (() => {});
    const _onUpdate = onUpdate ?? (() => {});

    const chartRef = useRef<HTMLDivElement>(null);
    const chartInstance = useRef<echarts.ECharts | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const resizeObserverRef = useRef<ResizeObserver | null>(null);
    const lastKnownSizeRef = useRef({ width: 0, height: 0 });
    const initRetryRef = useRef(0);
    const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Property change tracking for granular updates
    const prevConfigRef = useRef<any>(null);
    const prevDataRef = useRef<any>(null);
    const propertyChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Comprehensive property update handler
    const handlePropertyUpdate = useCallback(
        (property: string, value: any) => {
            if (!chartInstance.current) return;

            const updateStrategy = getPropertyUpdateStrategy(property);
            const partialUpdate: any = {};

            // Apply property-specific updates
            updateStrategy.forEach((strategy) => {
                switch (strategy) {
                    case 'title':
                        // Title is handled by widget header, not ECharts
                        break;
                    case 'series':
                        // Update series configuration
                        if (property === 'colorPalette') {
                            const palette =
                                colorPalettes[
                                    value as keyof typeof colorPalettes
                                ] || colorPalettes.default;
                            partialUpdate.color = palette;

                            // Update series colors
                            const currentOption =
                                chartInstance.current?.getOption();
                            if (
                                currentOption?.series &&
                                Array.isArray(currentOption.series)
                            ) {
                                const updatedSeries = currentOption.series.map(
                                    (series: any) => ({
                                        ...series,
                                        itemStyle: {
                                            ...series.itemStyle,
                                            color: undefined,
                                        },
                                    })
                                );
                                partialUpdate.series = updatedSeries;
                            }
                        } else if (property === 'seriesLabelShow') {
                            const currentOption =
                                chartInstance.current?.getOption();
                            if (
                                currentOption?.series &&
                                Array.isArray(currentOption.series)
                            ) {
                                const updatedSeries = currentOption.series.map(
                                    (series: any) => ({
                                        ...series,
                                        label: { ...series.label, show: value },
                                    })
                                );
                                partialUpdate.series = updatedSeries;
                            }
                        } else if (property === 'seriesLabelPosition') {
                            const currentOption =
                                chartInstance.current?.getOption();
                            if (
                                currentOption?.series &&
                                Array.isArray(currentOption.series)
                            ) {
                                const updatedSeries = currentOption.series.map(
                                    (series: any) => ({
                                        ...series,
                                        label: {
                                            ...series.label,
                                            position: value,
                                        },
                                    })
                                );
                                partialUpdate.series = updatedSeries;
                            }
                        } else if (property === 'dataLabelsShow') {
                            const currentOption =
                                chartInstance.current?.getOption();
                            if (
                                currentOption?.series &&
                                Array.isArray(currentOption.series)
                            ) {
                                const updatedSeries = currentOption.series.map(
                                    (series: any) => ({
                                        ...series,
                                        label: { ...series.label, show: value },
                                    })
                                );
                                partialUpdate.series = updatedSeries;
                            }
                        }
                        break;
                    case 'legend':
                        partialUpdate.legend = {
                            show: config?.legendShow !== false,
                            position: config?.legendPosition || 'top',
                            textStyle: {
                                color:
                                    config?.textColor ||
                                    (isDarkMode ? '#cccccc' : '#666666'),
                            },
                        };
                        break;
                    case 'tooltip':
                        partialUpdate.tooltip = {
                            show: config?.tooltipShow !== false,
                            trigger: config?.tooltipTrigger || 'axis',
                            backgroundColor: isDarkMode
                                ? 'rgba(0,0,0,0.8)'
                                : 'rgba(255,255,255,0.9)',
                            textStyle: {
                                color:
                                    config?.textColor ||
                                    (isDarkMode ? '#ffffff' : '#000000'),
                            },
                            formatter:
                                config?.tooltipFormatter === 'custom'
                                    ? config?.tooltipCustomFormatter
                                    : undefined,
                        };
                        break;
                    case 'animation':
                        partialUpdate.animation = value;
                        break;
                    case 'backgroundColor':
                    case 'borderColor':
                    case 'padding':
                    case 'margin':
                        // These are handled by widget container styling
                        break;
                    case 'responsive':
                    case 'draggable':
                    case 'resizable':
                        // These are handled by grid system
                        break;
                }
            });

            // Apply the partial update
            if (Object.keys(partialUpdate).length > 0) {
                requestAnimationFrame(() => {
                    chartInstance.current?.setOption(partialUpdate, false);
                });
            }
        },
        [config, isDarkMode, chartInstance]
    );

    // Direct property update function for immediate updates
    const directPropertyUpdate = useCallback(
        (property: string, value: any) => {
            handlePropertyUpdate(property, value);
        },
        [handlePropertyUpdate]
    );

    // simple debounce
    const debounce = (fn: () => void, ms: number) => {
        let t: any;
        return () => {
            if (t) clearTimeout(t);
            t = setTimeout(fn, ms);
        };
    };

    // Default sample data configurations
    const DEFAULT_SAMPLE_DATA = {
        bar: {
            xAxis: [
                'Product A',
                'Product B',
                'Product C',
                'Product D',
                'Product E',
            ],
            yAxis: [120, 200, 150, 80, 70],
        },
        line: {
            xAxis: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            yAxis: [120, 132, 101, 134, 90, 230, 210],
        },
        area: {
            xAxis: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            yAxis: [120, 132, 101, 134, 90, 230, 210],
        },
        scatter: {
            xAxis: [10, 20, 30, 40, 50],
            yAxis: [15, 25, 35, 45, 55],
        },
        heatmap: {
            xAxis: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            yAxis: ['A', 'B', 'C', 'D', 'E'],
        },
        radar: {
            indicators: [
                { name: 'Metric A', max: 100 },
                { name: 'Metric B', max: 100 },
                { name: 'Metric C', max: 100 },
                { name: 'Metric D', max: 100 },
                { name: 'Metric E', max: 100 },
            ],
            data: [85, 72, 90, 68, 78],
        },
        gauge: {
            data: [75],
        },
        funnel: {
            data: [
                { value: 100, name: 'Step 1' },
                { value: 80, name: 'Step 2' },
                { value: 60, name: 'Step 3' },
                { value: 40, name: 'Step 4' },
                { value: 20, name: 'Step 5' },
            ],
        },
        pie: {
            data: [
                { value: 1048, name: 'Search Engine' },
                { value: 735, name: 'Direct' },
                { value: 580, name: 'Email' },
                { value: 484, name: 'Union Ads' },
                { value: 300, name: 'Video Ads' },
            ],
        },
    };

    // Helper function to get sample data for chart type
    const getSampleDataForChartType = (chartType: string) => {
        return (
            DEFAULT_SAMPLE_DATA[
                chartType as keyof typeof DEFAULT_SAMPLE_DATA
            ] || DEFAULT_SAMPLE_DATA.bar
        );
    };

    // Safe access helpers for union-typed data payloads
    const getXFromData = (d: any, chartType: string) => {
        try {
            if (d && typeof d === 'object' && Array.isArray((d as any).xAxis))
                return (d as any).xAxis;
        } catch (_) {}
        return (getSampleDataForChartType(chartType) as any).xAxis;
    };

    const getYFromData = (d: any, chartType: string) => {
        try {
            if (d && typeof d === 'object' && Array.isArray((d as any).yAxis))
                return (d as any).yAxis;
            // heatmap/radar/gauge may provide series/data differently
            if (d && typeof d === 'object' && Array.isArray((d as any).data))
                return (d as any).data;
        } catch (_) {}
        return (getSampleDataForChartType(chartType) as any).yAxis;
    };

    // Color palette definitions - moved outside component for reuse
    const colorPalettes = {
        default: [
            '#5470c6',
            '#91cc75',
            '#fac858',
            '#ee6666',
            '#73c0de',
            '#3ba272',
            '#fc8452',
            '#9a60b4',
            '#ea7ccc',
        ],
        vibrant: [
            '#ff6b6b',
            '#4ecdc4',
            '#45b7d1',
            '#96ceb4',
            '#feca57',
            '#ff9ff3',
            '#54a0ff',
            '#5f27cd',
            '#00d2d3',
        ],
        pastel: [
            '#ffb3ba',
            '#ffdfba',
            '#ffffba',
            '#baffc9',
            '#bae1ff',
            '#e6b3ff',
            '#ffb3e6',
            '#b3d9ff',
            '#b3ffb3',
        ],
        monochrome: [
            '#333333',
            '#666666',
            '#999999',
            '#cccccc',
            '#e6e6e6',
            '#f2f2f2',
            '#ffffff',
            '#000000',
            '#1a1a1a',
        ],
        categorical: [
            '#1f77b4',
            '#ff7f0e',
            '#2ca02c',
            '#d62728',
            '#9467bd',
            '#8c564b',
            '#e377c2',
            '#7f7f7f',
            '#bcbd22',
        ],
        tableau: [
            '#4e79a7',
            '#f28e2c',
            '#e15759',
            '#76b7b2',
            '#59a14f',
            '#edc949',
            '#af7aa1',
            '#ff9d9a',
            '#9c755f',
        ],
        d3: [
            '#1f77b4',
            '#ff7f0e',
            '#2ca02c',
            '#d62728',
            '#9467bd',
            '#8c564b',
            '#e377c2',
            '#7f7f7f',
            '#bcbd22',
        ],
        material: [
            '#2196f3',
            '#ff9800',
            '#4caf50',
            '#f44336',
            '#9c27b0',
            '#00bcd4',
            '#ffeb3b',
            '#795548',
            '#607d8b',
        ],
        highContrast: [
            '#000000',
            '#ffffff',
            '#ff0000',
            '#00ff00',
            '#0000ff',
            '#ffff00',
            '#ff00ff',
            '#00ffff',
            '#800080',
        ],
    };

    // Generate clean ECharts options - no internal data fallback
    const generateChartOptions = (
        chartType: string,
        config: any,
        data: any
    ) => {
        // debug logs removed for build/lint

        // Caller provides defaults; do not mutate data here

        // Get color palette
        const palette =
            colorPalettes[config?.colorPalette as keyof typeof colorPalettes] ||
            colorPalettes.default;

        // Create completely clean options - no config merging to avoid errors
        const options: any = {
            animation: config?.animation !== false,
            animationDuration: config?.animationDuration || 1000,
            backgroundColor: config?.backgroundColor || 'transparent',
            color: palette, // Apply color palette to all series
            title: {
                show: false, // Hide ECharts title since we render it in widget header
                text: config?.title || 'Untitled Chart',
                subtext: config?.subtitle || '',
                textStyle: {
                    color:
                        config?.textColor ||
                        (isDarkMode ? '#ffffff' : '#000000'),
                    fontSize: 16,
                },
                subtextStyle: {
                    color:
                        config?.textColor ||
                        (isDarkMode ? '#cccccc' : '#666666'),
                    fontSize: 12,
                },
            },
            tooltip: {
                show: config?.tooltipShow !== false,
                trigger: config?.tooltipTrigger || 'axis',
                backgroundColor: isDarkMode
                    ? 'rgba(0,0,0,0.8)'
                    : 'rgba(255,255,255,0.9)',
                borderColor: isDarkMode ? '#404040' : '#d9d9d9',
                textStyle: {
                    color:
                        config?.textColor ||
                        (isDarkMode ? '#ffffff' : '#000000'),
                },
                formatter:
                    config?.tooltipFormatter === 'custom'
                        ? config?.tooltipCustomFormatter
                        : undefined,
            },
            legend: {
                show: config?.legendShow !== false,
                position: config?.legendPosition || 'top',
                type: 'plain',
                orient: 'horizontal',
                textStyle: {
                    color:
                        config?.textColor ||
                        (isDarkMode ? '#ffffff' : '#000000'),
                    fontSize: 12,
                },
            },
            grid: {
                top: 20,
                left: 8,
                right: 8,
                bottom: 20,
                containLabel: true,
            },
        };

        // Apply data and chart type specific configuration
        switch (chartType) {
            case 'bar':
                options.xAxis = {
                    type: 'category',
                    data: getXFromData(data, 'bar'),
                    axisLine: {
                        show: true,
                        lineStyle: {
                            color: isDarkMode ? '#333333' : '#d9d9d9',
                        },
                    },
                    axisLabel: { color: isDarkMode ? '#cccccc' : '#666666' },
                };
                options.yAxis = {
                    type: 'value',
                    axisLine: {
                        show: true,
                        lineStyle: {
                            color: isDarkMode ? '#333333' : '#d9d9d9',
                        },
                    },
                    axisLabel: { color: isDarkMode ? '#cccccc' : '#666666' },
                };
                options.series = [
                    {
                        type: 'bar',
                        data: getYFromData(data, 'bar'),
                        label: {
                            show: config?.seriesLabelShow || false,
                            position: config?.seriesLabelPosition || 'top',
                        },
                        labelLine: {
                            show: config?.seriesLabelShow || false,
                        },
                    },
                ];
                break;

            case 'line':
                options.xAxis = {
                    type: 'category',
                    data: getXFromData(data, 'line'),
                    axisLine: {
                        show: true,
                        lineStyle: {
                            color: isDarkMode ? '#333333' : '#d9d9d9',
                        },
                    },
                    axisLabel: { color: isDarkMode ? '#cccccc' : '#666666' },
                };
                options.yAxis = {
                    type: 'value',
                    axisLine: {
                        show: true,
                        lineStyle: {
                            color: isDarkMode ? '#333333' : '#d9d9d9',
                        },
                    },
                    axisLabel: { color: isDarkMode ? '#cccccc' : '#666666' },
                };
                options.series = [
                    {
                        type: 'line',
                        data: getYFromData(data, 'line'),
                        label: {
                            show: config?.seriesLabelShow || false,
                            position: config?.seriesLabelPosition || 'top',
                        },
                        labelLine: {
                            show: config?.seriesLabelShow || false,
                        },
                    },
                ];
                break;

            case 'pie':
                options.series = [
                    {
                        type: 'pie',
                        radius: '50%',
                        data:
                            Array.isArray(data?.series) &&
                            data.series.length > 0
                                ? data.series
                                : [
                                      { value: 100, name: 'Category A' },
                                      { value: 200, name: 'Category B' },
                                  ],
                        emphasis: {
                            itemStyle: {
                                shadowBlur: 10,
                                shadowOffsetX: 0,
                                shadowColor: 'rgba(0, 0, 0, 0.5)',
                            },
                        },
                        label: {
                            show: config?.dataLabelsShow || false,
                            formatter:
                                config?.dataLabelsFormat === 'percentage'
                                    ? '{b}: {d}%'
                                    : '{b}: {c}',
                        },
                        labelLine: {
                            show: config?.dataLabelsShow || false,
                        },
                    },
                ];
                break;

            case 'area':
                options.xAxis = {
                    type: 'category',
                    boundaryGap: false,
                    data: getXFromData(data, 'line'),
                    axisLine: {
                        show: true,
                        lineStyle: {
                            color: isDarkMode ? '#333333' : '#d9d9d9',
                        },
                    },
                    axisLabel: { color: isDarkMode ? '#cccccc' : '#666666' },
                };
                options.yAxis = {
                    type: 'value',
                    axisLine: {
                        show: true,
                        lineStyle: {
                            color: isDarkMode ? '#333333' : '#d9d9d9',
                        },
                    },
                    axisLabel: { color: isDarkMode ? '#cccccc' : '#666666' },
                };
                options.series = [
                    {
                        type: 'line',
                        areaStyle: {},
                        emphasis: { focus: 'series' },
                        data: getYFromData(data, 'line'),
                        label: {
                            show: config?.seriesLabelShow || false,
                            position: config?.seriesLabelPosition || 'top',
                        },
                        labelLine: {
                            show: config?.seriesLabelShow || false,
                        },
                    },
                ];
                break;

            case 'scatter':
                options.xAxis = {
                    type: 'value',
                    axisLine: {
                        show: true,
                        lineStyle: {
                            color: isDarkMode ? '#333333' : '#d9d9d9',
                        },
                    },
                    axisLabel: { color: isDarkMode ? '#cccccc' : '#666666' },
                };
                options.yAxis = {
                    type: 'value',
                    axisLine: {
                        show: true,
                        lineStyle: {
                            color: isDarkMode ? '#333333' : '#d9d9d9',
                        },
                    },
                    axisLabel: { color: isDarkMode ? '#cccccc' : '#666666' },
                };
                options.series = [
                    {
                        type: 'scatter',
                        data: data?.series || [
                            [10, 8.04],
                            [14, 5.82],
                            [13, 9.14],
                            [7, 8.74],
                            [12, 7.24],
                        ],
                        label: {
                            show: config?.seriesLabelShow || false,
                            position: config?.seriesLabelPosition || 'top',
                        },
                        labelLine: {
                            show: config?.seriesLabelShow || false,
                        },
                    },
                ];
                break;

            case 'radar':
                options.radar = {
                    indicator:
                        data && (data as any).indicators
                            ? (data as any).indicators
                            : [
                                  { name: 'Metric A', max: 100 },
                                  { name: 'Metric B', max: 100 },
                                  { name: 'Metric C', max: 100 },
                                  { name: 'Metric D', max: 100 },
                                  { name: 'Metric E', max: 100 },
                              ],
                };
                options.series = [
                    {
                        type: 'radar',
                        data: data?.series || [
                            { value: [80, 50, 60, 70, 90], name: 'Series 1' },
                        ],
                        label: {
                            show: config?.seriesLabelShow || false,
                            position: config?.seriesLabelPosition || 'top',
                        },
                        labelLine: {
                            show: config?.seriesLabelShow || false,
                        },
                    },
                ];
                break;

            case 'gauge':
                options.series = [
                    {
                        type: 'gauge',
                        progress: { show: true },
                        detail: { valueAnimation: true, formatter: '{value}%' },
                        data: [
                            {
                                value: data?.value ?? 75,
                                name: data?.name || 'Progress',
                            },
                        ],
                        label: {
                            show: config?.dataLabelsShow || false,
                            formatter:
                                config?.dataLabelsFormat === 'percentage'
                                    ? '{b}: {c}%'
                                    : '{b}: {c}',
                        },
                        labelLine: {
                            show: config?.dataLabelsShow || false,
                        },
                    },
                ];
                break;

            case 'heatmap':
                options.xAxis = {
                    type: 'category',
                    data: getXFromData(data, 'line'),
                    splitArea: { show: true },
                };
                options.yAxis = {
                    type: 'category',
                    data: getYFromData(data, 'heatmap'),
                    splitArea: { show: true },
                };
                options.visualMap = {
                    min: 0,
                    max: 10,
                    calculable: true,
                    orient: 'horizontal',
                    left: 'center',
                    bottom: '5%',
                };
                options.series = [
                    {
                        name: 'Heatmap',
                        type: 'heatmap',
                        data: data?.series || [
                            [0, 0, 5],
                            [1, 1, 2],
                            [2, 2, 7],
                        ],
                        emphasis: {
                            itemStyle: {
                                shadowBlur: 10,
                                shadowColor: 'rgba(0,0,0,0.5)',
                            },
                        },
                        label: {
                            show: config?.dataLabelsShow || false,
                            formatter:
                                config?.dataLabelsFormat === 'percentage'
                                    ? '{c}%'
                                    : '{c}',
                        },
                        labelLine: {
                            show: config?.dataLabelsShow || false,
                        },
                    },
                ];
                break;

            case 'funnel':
                options.series = [
                    {
                        type: 'funnel',
                        left: '10%',
                        top: 40,
                        bottom: 40,
                        width: '80%',
                        min: 0,
                        max: 100,
                        sort: 'descending',
                        gap: 2,
                        label: {
                            show: config?.dataLabelsShow || false,
                            position: 'inside',
                            formatter:
                                config?.dataLabelsFormat === 'percentage'
                                    ? '{b}: {d}%'
                                    : '{b}: {c}',
                        },
                        data: data?.series || [
                            { value: 60, name: 'Visit' },
                            { value: 40, name: 'Inquiry' },
                            { value: 20, name: 'Order' },
                        ],
                    },
                ];
                break;

            default:
                // Fallback for unknown chart types
                options.xAxis = {
                    type: 'category',
                    data: getXFromData(data, 'scatter'),
                    axisLine: {
                        show: true,
                        lineStyle: {
                            color: isDarkMode ? '#333333' : '#d9d9d9',
                        },
                    },
                    axisLabel: { color: isDarkMode ? '#cccccc' : '#666666' },
                };
                options.yAxis = {
                    type: 'value',
                    axisLine: {
                        show: true,
                        lineStyle: {
                            color: isDarkMode ? '#333333' : '#d9d9d9',
                        },
                    },
                    axisLabel: { color: isDarkMode ? '#cccccc' : '#666666' },
                };
                options.series = [
                    {
                        type: 'bar',
                        data: getYFromData(data, 'scatter'),
                        label: {
                            show: config?.seriesLabelShow || false,
                            position: config?.seriesLabelPosition || 'top',
                        },
                        labelLine: {
                            show: config?.seriesLabelShow || false,
                        },
                    },
                ];
                break;
        }

        // auto-legend from series names
        try {
            if (Array.isArray(options.series)) {
                const names = options.series
                    .map((s: any) => s.name)
                    .filter(Boolean);
                if (names.length > 0) options.legend.data = names;
            }
        } catch (e) {}

        // debug logs removed for build/lint

        // Ensure we always return valid options
        if (!options || !options.series || !Array.isArray(options.series)) {
            console.warn('Invalid options generated, using fallback');
            return {
                title: { show: false },
                tooltip: { trigger: 'axis' },
                xAxis: {
                    type: 'category',
                    data: (getSampleDataForChartType('bar') as any).xAxis,
                },
                yAxis: { type: 'value' },
                series: [
                    {
                        type: 'bar',
                        data: (getSampleDataForChartType('bar') as any).yAxis,
                    },
                ],
            };
        }

        return options;
    };

    // Initialize ECharts instance with proper error handling
    useEffect(() => {
        // debug logs removed for build/lint

        if (chartRef.current && !chartInstance.current) {
            const MAX_INIT_RETRIES = 10;
            const RETRY_DELAY = 200; // ms

            const initIfReady = (attempt = 0) => {
                try {
                    const el = chartRef.current;
                    if (!el) return;
                    const rect = el.getBoundingClientRect();
                    const MIN_WIDTH = 200;
                    const MIN_HEIGHT = 150;

                    if (
                        (rect.width < MIN_WIDTH || rect.height < MIN_HEIGHT) &&
                        attempt < MAX_INIT_RETRIES
                    ) {
                        initRetryRef.current = attempt + 1;
                        initTimeoutRef.current = setTimeout(
                            () => initIfReady(attempt + 1),
                            RETRY_DELAY
                        );
                        return;
                    }

                    // debug logs removed for build/lint
                    chartInstance.current = echarts.init(
                        chartRef.current,
                        isDarkMode ? 'dark' : undefined,
                        {
                            renderer: 'canvas',
                            useDirtyRect: true,
                        }
                    );

                    // Use requestAnimationFrame to avoid main process issues
                    requestAnimationFrame(() => {
                        const chartType =
                            config?.chartType || widget.type || 'bar';
                        const effectiveData =
                            data && Object.keys(data).length > 0
                                ? data
                                : getSampleDataForChartType(chartType);
                        let options = generateChartOptions(
                            chartType,
                            config,
                            effectiveData
                        );

                        // Apply watermark for free plan users (organization context removed - default to free)
                        const planType = 'free';
                        options = addWatermarkToChart(options, planType);

                        if (
                            options &&
                            typeof options === 'object' &&
                            options.series &&
                            Array.isArray(options.series)
                        ) {
                            // chart options being set
                            chartInstance.current?.setOption(options, true);

                            // Only auto-resize if widget explicitly opts in via config.responsive === true
                            const responsiveEnabled =
                                config?.responsive !== false; // Default to true if not explicitly false
                            if (responsiveEnabled) {
                                // Ensure chart resizes to fill container after render
                                setTimeout(() => {
                                    try {
                                        const el2 = chartRef.current;
                                        if (!el2 || !chartInstance.current)
                                            return;
                                        const rect2 =
                                            el2.getBoundingClientRect();
                                        lastKnownSizeRef.current = {
                                            width: rect2.width,
                                            height: rect2.height,
                                        };
                                        chartInstance.current?.resize();
                                    } catch (e) {}
                                }, 100);
                            }

                            // chart options set successfully
                        } else {
                            console.warn(
                                'ChartWidget useEffect: Invalid options structure:',
                                options
                            );
                        }
                    });

                    // Observe size changes for responsiveness - observe the chartRef itself
                    // Only attach ResizeObserver if widget explicitly enables responsive behavior
                    const responsiveEnabled = config?.responsive !== false; // Default to true
                    if (responsiveEnabled && chartRef.current) {
                        const debouncedResize = debounce(() => {
                            try {
                                const el3 = chartRef.current;
                                if (!el3 || !chartInstance.current) return;
                                const rect3 = el3.getBoundingClientRect();

                                // Ensure the element is visible and has dimensions before resizing
                                if (rect3.width <= 0 || rect3.height <= 0) {
                                    return;
                                }

                                const last = lastKnownSizeRef.current;
                                const widthChange = Math.abs(
                                    rect3.width - last.width
                                );
                                const heightChange = Math.abs(
                                    rect3.height - last.height
                                );

                                // Only trigger resize if there's a meaningful change to avoid flickering
                                // or if we previously had a zero/null size (e.g. after tab switch)
                                const MIN_CHANGE = 1; // High precision for better responsiveness
                                if (
                                    widthChange < MIN_CHANGE &&
                                    heightChange < MIN_CHANGE &&
                                    last.width > 0
                                ) {
                                    return;
                                }

                                lastKnownSizeRef.current = {
                                    width: rect3.width,
                                    height: rect3.height,
                                };

                                // Use requestAnimationFrame for smoother resizing during transitions
                                requestAnimationFrame(() => {
                                    chartInstance.current?.resize();
                                });
                            } catch (e) {
                                // swallow
                            }
                        }, 50);

                        const ro = new ResizeObserver(() => {
                            debouncedResize();
                        });
                        ro.observe(chartRef.current);
                        resizeObserverRef.current = ro;
                    }
                } catch (err) {
                    console.error(
                        'ChartWidget useEffect: Chart initialization failed:',
                        err
                    );
                }
            };

            // start initialization attempts
            initIfReady(0);
        }

        return () => {
            if (chartInstance.current) {
                try {
                    chartInstance.current.dispose();
                } catch (e) {}
                chartInstance.current = null;
            }
            if (resizeObserverRef.current) {
                try {
                    resizeObserverRef.current.disconnect();
                } catch (e) {}
                resizeObserverRef.current = null;
            }
            if (initTimeoutRef.current) {
                clearTimeout(initTimeoutRef.current);
                initTimeoutRef.current = null;
            }
        };
    }, [isDarkMode, config?.responsive]);

    // Window and document visibility resize fallback (only when responsive enabled)
    useEffect(() => {
        const responsiveEnabled = config?.responsive !== false; // Default to true
        if (!responsiveEnabled) return;

        const onResize = () => {
            try {
                if (chartInstance.current && chartRef.current) {
                    const rect = chartRef.current.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                        const last = lastKnownSizeRef.current;
                        const widthChange = Math.abs(rect.width - last.width);
                        const heightChange = Math.abs(
                            rect.height - last.height
                        );
                        const MIN_CHANGE = 1;
                        if (
                            widthChange < MIN_CHANGE &&
                            heightChange < MIN_CHANGE &&
                            last.width > 0
                        )
                            return;
                        lastKnownSizeRef.current = {
                            width: rect.width,
                            height: rect.height,
                        };
                        chartInstance.current.resize();
                    }
                }
            } catch (e) {}
        };

        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // Delay slightly to allow the browser to settle after tab switch
                setTimeout(onResize, 100);
            }
        };

        window.addEventListener('resize', onResize);
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            window.removeEventListener('resize', onResize);
            document.removeEventListener(
                'visibilitychange',
                onVisibilityChange
            );
        };
    }, [config?.responsive]);

    // Granular property change detection and updates
    useEffect(() => {
        if (!chartInstance.current) return;

        // Detect config changes
        const configChanges = detectPropertyChanges(
            prevConfigRef.current,
            config
        );
        const dataChanges = detectPropertyChanges(prevDataRef.current, data);

        // If no changes detected, skip update
        if (configChanges.length === 0 && dataChanges.length === 0) {
            return;
        }

        // Clear any pending updates
        if (propertyChangeTimeoutRef.current) {
            clearTimeout(propertyChangeTimeoutRef.current);
        }

        // Debounce property updates to prevent excessive re-renders
        propertyChangeTimeoutRef.current = setTimeout(() => {
            // Handle config changes with immediate updates for visual properties
            configChanges.forEach((property) => {
                // Immediate updates for visual properties
                if (
                    [
                        'colorPalette',
                        'theme',
                        'legendShow',
                        'legendPosition',
                        'tooltipShow',
                        'tooltipTrigger',
                    ].includes(property)
                ) {
                    handlePropertyUpdate(property, config[property]);
                } else {
                    // Debounced updates for other properties
                    setTimeout(
                        () => handlePropertyUpdate(property, config[property]),
                        50
                    );
                }
            });

            // Handle data changes
            dataChanges.forEach((property) => {
                handlePropertyUpdate('data', data[property]);
            });

            // If major changes detected (chartType, data structure), do full update
            const majorChanges = configChanges.filter((p) =>
                ['chartType', 'series', 'xAxis', 'yAxis'].includes(p)
            );

            if (majorChanges.length > 0 || dataChanges.length > 0) {
                requestAnimationFrame(() => {
                    const chartType = config?.chartType || widget.type || 'bar';
                    const effectiveData =
                        data && Object.keys(data).length > 0
                            ? data
                            : getSampleDataForChartType(chartType);
                    let options = generateChartOptions(
                        chartType,
                        config,
                        effectiveData
                    );

                    // Apply watermark for free plan users (organization context removed - default to free)
                    const planType = 'free';
                    options = addWatermarkToChart(options, planType);

                    if (
                        options &&
                        typeof options === 'object' &&
                        options.series &&
                        Array.isArray(options.series)
                    ) {
                        chartInstance.current?.setOption(options, true);
                        // full update applied
                    }
                });
            }

            // Update refs for next comparison
            prevConfigRef.current = { ...config };
            prevDataRef.current = { ...data };
        }, 50); // 50ms debounce for rapid changes

        return () => {
            if (propertyChangeTimeoutRef.current) {
                clearTimeout(propertyChangeTimeoutRef.current);
            }
        };
    }, [config, data, isDarkMode, widget.type, handlePropertyUpdate]);

    const getWidgetTitle = () => {
        // Handle both string and object formats for title
        if (!config?.title) {
            return widget?.title || 'Untitled Chart';
        }
        if (typeof config.title === 'string') {
            return config.title;
        }
        if (typeof config.title === 'object' && config.title?.text) {
            return config.title.text;
        }
        return widget?.title || 'Untitled Chart';
    };
    const getWidgetSubtitle = () => {
        // Handle both string and object formats for subtitle
        if (!config?.subtitle) {
            return widget?.subtitle || '';
        }
        if (typeof config.subtitle === 'string') {
            return config.subtitle;
        }
        if (typeof config.subtitle === 'object' && config.subtitle?.text) {
            return config.subtitle.text;
        }
        return widget?.subtitle || '';
    };

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [isEditingSubtitle, setIsEditingSubtitle] = useState(false);
    const [editingTitle, setEditingTitle] = useState(getWidgetTitle());
    const [editingSubtitle, setEditingSubtitle] = useState(getWidgetSubtitle());

    // Sync editing state with config changes (from design panel)
    useEffect(() => {
        if (!isEditingTitle) {
            setEditingTitle(getWidgetTitle());
        }
    }, [config?.title, isEditingTitle]);

    useEffect(() => {
        if (!isEditingSubtitle) {
            setEditingSubtitle(getWidgetSubtitle());
        }
    }, [config?.subtitle, isEditingSubtitle]);

    const saveTitle = () => {
        setIsEditingTitle(false);
        if (editingTitle !== getWidgetTitle()) {
            const newConfig = { ...config, title: editingTitle };
            onConfigUpdate?.(newConfig);

            // Dispatch event for design panel sync
            window.dispatchEvent(
                new CustomEvent('widget:title:updated', {
                    detail: {
                        widgetId: widget.id,
                        title: editingTitle,
                        skipLayoutUpdate: true,
                    },
                })
            );
        }
    };

    const saveSubtitle = () => {
        setIsEditingSubtitle(false);
        if (editingSubtitle !== getWidgetSubtitle()) {
            const newConfig = { ...config, subtitle: editingSubtitle };
            onConfigUpdate?.(newConfig);

            // Dispatch event for design panel sync
            window.dispatchEvent(
                new CustomEvent('widget:subtitle:updated', {
                    detail: {
                        widgetId: widget.id,
                        subtitle: editingSubtitle,
                        skipLayoutUpdate: true,
                    },
                })
            );
        }
    };

    const menu = (
        <Menu
            items={[
                {
                    key: 'view-config',
                    icon: <SettingOutlined />,
                    label: 'View ECharts Config',
                    onClick: () => {
                        message.info('Opening ECharts config in console');
                        try {
                            /* ECharts options snapshot removed for lint */
                        } catch (e) {}
                    },
                },
                { type: 'divider' as const },
                {
                    key: 'duplicate',
                    icon: <ShareAltOutlined />,
                    label: 'Duplicate',
                    onClick: () => onDuplicate?.(widget.id),
                },
                {
                    key: 'lock',
                    icon: widget.isLocked ? (
                        <UnlockOutlined />
                    ) : (
                        <LockOutlined />
                    ),
                    label: widget.isLocked ? 'Unlock' : 'Lock',
                    onClick: () =>
                        onUpdate?.(widget.id, { isLocked: !widget.isLocked }),
                },
                { type: 'divider' as const },
                {
                    key: 'delete',
                    icon: <DeleteOutlined />,
                    danger: true,
                    label: 'Delete',
                    onClick: () => onDelete?.(widget.id),
                },
            ]}
        />
    );

    return (
        <div
            className="chart-widget-container"
            style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                overflow: 'hidden',
                backgroundColor: config?.backgroundColor || 'transparent',
                borderColor:
                    config?.borderColor ||
                    (isSelected
                        ? 'var(--ant-color-primary)'
                        : 'var(--ant-color-border)'),
                borderRadius: '0',
                border: 'none',
                padding: config?.padding ? `${config.padding}px` : '0',
                margin: '0',
                cursor: isPreviewMode ? 'default' : 'pointer',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box',
            }}
            onMouseDown={(e) => {
                // Allow event to bubble for drag/drop and context menus
                e.stopPropagation();
                _onWidgetClick(widget.id);
            }}
        >
            {/* Widget Header with Title and Controls */}
            <div
                className="widget-header"
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '4px 8px',
                    borderBottom: '1px solid var(--ant-color-border)',
                    flexShrink: 0,
                    background: config?.headerBackground || 'transparent',
                    zIndex: 2,
                }}
            >
                {/* Title */}
                <div
                    style={{
                        flex: 1,
                        minWidth: 0,
                        pointerEvents: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    {showEditableTitle && isEditingTitle ? (
                        <Input
                            size="small"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onPressEnter={saveTitle}
                            onBlur={saveTitle}
                            placeholder="Title"
                            maxLength={100}
                            style={{
                                marginBottom: 4,
                                border: 'none',
                                boxShadow: 'none',
                                background: 'transparent',
                                padding: '2px 4px',
                                width: 'fit-content',
                                minWidth: '60px',
                                maxWidth: '400px',
                                fontSize: '14px',
                                fontWeight: '500',
                                color:
                                    config?.titleColor ||
                                    (isDarkMode ? '#ffffff' : '#000000'),
                                outline: 'none',
                                borderRadius: '2px',
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <Title
                            level={5}
                            style={{
                                margin: 0,
                                marginBottom: 0,
                                color:
                                    config?.titleColor ||
                                    (isDarkMode ? '#ffffff' : '#000000'),
                                cursor:
                                    (isEditing || isSelected) &&
                                    showEditableTitle
                                        ? 'text'
                                        : 'default',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                padding: '0 4px',
                                borderRadius: '2px',
                                fontSize: '13px',
                                lineHeight: '1.2',
                                transition: 'background-color 0.2s ease',
                                backgroundColor:
                                    (isEditing || isSelected) &&
                                    showEditableTitle
                                        ? 'rgba(0,0,0,0.05)'
                                        : 'transparent',
                            }}
                            onDoubleClick={() => {
                                if (
                                    showEditableTitle &&
                                    (isEditing || isSelected)
                                ) {
                                    setIsEditingTitle(true);
                                }
                            }}
                        >
                            {getWidgetTitle()}
                        </Title>
                    )}
                    {showEditableTitle && isEditingSubtitle ? (
                        <Input
                            size="small"
                            value={editingSubtitle}
                            onChange={(e) => setEditingSubtitle(e.target.value)}
                            onPressEnter={saveSubtitle}
                            onBlur={saveSubtitle}
                            placeholder="Subtitle"
                            maxLength={150}
                            style={{
                                border: 'none',
                                boxShadow: 'none',
                                background: 'transparent',
                                padding: '0 4px',
                                marginTop: '2px',
                                width: 'fit-content',
                                minWidth: '60px',
                                maxWidth: '400px',
                                fontSize: '11px',
                                lineHeight: '1.1',
                                color: isDarkMode ? '#bfbfbf' : '#595959',
                                outline: 'none',
                                borderRadius: '2px',
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        getWidgetSubtitle()?.length > 0 && (
                            <span
                                style={{
                                    color: isDarkMode ? '#bfbfbf' : '#595959',
                                    fontSize: 11,
                                    lineHeight: '1.1',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    padding: '0 4px',
                                    marginTop: '2px',
                                    borderRadius: '2px',
                                    transition: 'background-color 0.2s ease',
                                    backgroundColor:
                                        (isEditing || isSelected) &&
                                        showEditableTitle
                                            ? 'rgba(0,0,0,0.05)'
                                            : 'transparent',
                                    cursor:
                                        (isEditing || isSelected) &&
                                        showEditableTitle
                                            ? 'text'
                                            : 'default',
                                }}
                                onDoubleClick={() => {
                                    if (
                                        showEditableTitle &&
                                        (isEditing || isSelected)
                                    ) {
                                        setIsEditingSubtitle(true);
                                    }
                                }}
                            >
                                {getWidgetSubtitle()}
                            </span>
                        )
                    )}
                </div>

                {/* Controls */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                    }}
                >
                    <Dropdown
                        menu={{
                            items: [
                                {
                                    key: 'export-png',
                                    icon: <DownloadOutlined />,
                                    label: 'Export as PNG',
                                    onClick: () => {
                                        if (chartInstance.current) {
                                            try {
                                                const url =
                                                    chartInstance.current.getDataURL(
                                                        {
                                                            type: 'png',
                                                            backgroundColor:
                                                                '#fff',
                                                            pixelRatio: 2,
                                                        }
                                                    );
                                                const link =
                                                    document.createElement('a');
                                                link.download = `${(widget.name || widget.title || 'chart').replace(/[^a-z0-9]/gi, '_')}.png`;
                                                link.href = url;
                                                link.click();
                                                message.success(
                                                    'Chart exported as PNG'
                                                );
                                            } catch (error) {
                                                message.error(
                                                    'Failed to export chart as PNG'
                                                );
                                            }
                                        } else {
                                            message.warning(
                                                'Chart not ready for export. Please wait a moment and try again.'
                                            );
                                        }
                                    },
                                },
                                {
                                    key: 'export-svg',
                                    icon: <DownloadOutlined />,
                                    label: 'Export as SVG',
                                    onClick: () => {
                                        if (chartInstance.current) {
                                            try {
                                                const url =
                                                    chartInstance.current.getDataURL(
                                                        {
                                                            type: 'svg',
                                                            backgroundColor:
                                                                '#fff',
                                                        }
                                                    );
                                                const link =
                                                    document.createElement('a');
                                                link.download = `${(widget.name || widget.title || 'chart').replace(/[^a-z0-9]/gi, '_')}.svg`;
                                                link.href = url;
                                                link.click();
                                                message.success(
                                                    'Chart exported as SVG'
                                                );
                                            } catch (error) {
                                                message.error(
                                                    'Failed to export chart as SVG'
                                                );
                                            }
                                        } else {
                                            message.warning(
                                                'Chart not ready for export. Please wait a moment and try again.'
                                            );
                                        }
                                    },
                                },
                                { type: 'divider' as const },
                                {
                                    key: 'copy-data',
                                    icon: <CopyOutlined />,
                                    label: 'Copy Data',
                                    onClick: () => {
                                        if (chartInstance.current) {
                                            try {
                                                const option =
                                                    chartInstance.current.getOption();
                                                // Extract data from ECharts option - get series data
                                                const seriesData =
                                                    option.series &&
                                                    Array.isArray(option.series)
                                                        ? option.series.map(
                                                              (s: any) => ({
                                                                  name: s.name,
                                                                  type: s.type,
                                                                  data: s.data,
                                                              })
                                                          )
                                                        : [];
                                                // Also get xAxis data if available
                                                const xAxisData =
                                                    option.xAxis &&
                                                    Array.isArray(
                                                        option.xAxis
                                                    ) &&
                                                    option.xAxis[0]?.data
                                                        ? option.xAxis[0].data
                                                        : null;

                                                const dataToCopy = {
                                                    series: seriesData,
                                                    xAxis: xAxisData,
                                                    rawData: data || {},
                                                };

                                                const dataStr = JSON.stringify(
                                                    dataToCopy,
                                                    null,
                                                    2
                                                );
                                                navigator.clipboard.writeText(
                                                    dataStr
                                                );
                                                message.success(
                                                    'Chart data copied to clipboard'
                                                );
                                            } catch (error) {
                                                message.error(
                                                    'Failed to copy data'
                                                );
                                            }
                                        } else {
                                            message.warning(
                                                'Chart not ready. Please wait a moment and try again.'
                                            );
                                        }
                                    },
                                },
                                {
                                    key: 'view-config',
                                    icon: <SettingOutlined />,
                                    label: 'View Config (Copyable)',
                                    onClick: () => {
                                        if (chartInstance.current) {
                                            try {
                                                const option =
                                                    chartInstance.current.getOption();
                                                const optionStr =
                                                    JSON.stringify(
                                                        option,
                                                        null,
                                                        2
                                                    );
                                                // Show in modal for easy copying
                                                Modal.info({
                                                    title: 'ECharts Configuration',
                                                    width: 800,
                                                    content: (
                                                        <div
                                                            style={{
                                                                maxHeight:
                                                                    '60vh',
                                                                overflow:
                                                                    'auto',
                                                            }}
                                                        >
                                                            <pre
                                                                style={{
                                                                    background:
                                                                        isDarkMode
                                                                            ? '#1e1e1e'
                                                                            : '#f5f5f5',
                                                                    padding:
                                                                        '12px',
                                                                    borderRadius:
                                                                        '4px',
                                                                    fontSize:
                                                                        '12px',
                                                                    whiteSpace:
                                                                        'pre-wrap',
                                                                    wordBreak:
                                                                        'break-word',
                                                                }}
                                                            >
                                                                {optionStr}
                                                            </pre>
                                                            <Button
                                                                type="primary"
                                                                icon={
                                                                    <CopyOutlined />
                                                                }
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(
                                                                        optionStr
                                                                    );
                                                                    message.success(
                                                                        'Config copied to clipboard!'
                                                                    );
                                                                }}
                                                                style={{
                                                                    marginTop:
                                                                        '12px',
                                                                }}
                                                            >
                                                                Copy to
                                                                Clipboard
                                                            </Button>
                                                        </div>
                                                    ),
                                                });
                                            } catch (error) {
                                                message.error(
                                                    'Failed to get chart config'
                                                );
                                            }
                                        } else {
                                            message.warning('Chart not ready');
                                        }
                                    },
                                },
                                { type: 'divider' as const },
                                {
                                    key: 'save-to-library',
                                    icon: <SaveOutlined />,
                                    label: 'Save to Library',
                                    onClick: async () => {
                                        try {
                                            const chartTitle =
                                                widget.title ||
                                                widget.name ||
                                                'Untitled Chart';
                                            const assetData = {
                                                asset_type: 'chart',
                                                title: chartTitle,
                                                content: {
                                                    type:
                                                        config?.chartType ||
                                                        'bar',
                                                    config: config || {},
                                                    data: data || {},
                                                },
                                                data_source_id:
                                                    widget?.dataSourceId ||
                                                    widget?.data_source_id ||
                                                    null,
                                                metadata: {
                                                    chartType:
                                                        config?.chartType ||
                                                        'bar',
                                                    widgetId: widget.id,
                                                    name: chartTitle,
                                                    description: `Chart: ${chartTitle}`,
                                                },
                                            };

                                            const response = await fetch(
                                                '/api/assets',
                                                {
                                                    method: 'POST',
                                                    headers: {
                                                        'Content-Type':
                                                            'application/json',
                                                    },
                                                    credentials: 'include',
                                                    body: JSON.stringify(
                                                        assetData
                                                    ),
                                                }
                                            );

                                            if (!response.ok) {
                                                const errorText = await response
                                                    .text()
                                                    .catch(() => '');
                                                throw new Error(
                                                    `HTTP error! status: ${response.status}${errorText ? `: ${errorText}` : ''}`
                                                );
                                            }

                                            const result =
                                                await response.json();
                                            if (result) {
                                                message.success(
                                                    'Chart saved to library successfully!'
                                                );
                                            } else {
                                                throw new Error(
                                                    'No result from save operation'
                                                );
                                            }
                                        } catch (error: any) {
                                            console.error(
                                                'Failed to save chart:',
                                                error
                                            );
                                            message.error(
                                                `Failed to save chart: ${error.message || 'Please try again.'}`
                                            );
                                        }
                                    },
                                },
                                {
                                    key: 'save-to-dashboard',
                                    icon: <BarChartOutlined />,
                                    label: 'Add to Dashboard',
                                    onClick: () => {
                                        if (onChartCreate) {
                                            try {
                                                onChartCreate(widget);
                                                message.success(
                                                    'Chart added to dashboard!'
                                                );
                                            } catch (error: any) {
                                                message.error(
                                                    `Failed to add chart: ${error.message || 'Unknown error'}`
                                                );
                                            }
                                        } else {
                                            message.info(
                                                'Navigate to Dashboard Studio to add this chart'
                                            );
                                        }
                                    },
                                },
                                ...(isPreviewMode
                                    ? []
                                    : [
                                          { type: 'divider' as const },
                                          {
                                              key: 'duplicate',
                                              icon: <CopyOutlined />,
                                              label: 'Duplicate',
                                              onClick: () =>
                                                  onDuplicate?.(widget.id),
                                          },
                                          {
                                              key: 'lock',
                                              icon: widget.isLocked ? (
                                                  <UnlockOutlined />
                                              ) : (
                                                  <LockOutlined />
                                              ),
                                              label: widget.isLocked
                                                  ? 'Unlock'
                                                  : 'Lock',
                                              onClick: () =>
                                                  onUpdate?.(widget.id, {
                                                      isLocked:
                                                          !widget.isLocked,
                                                  }),
                                          },
                                          { type: 'divider' as const },
                                          {
                                              key: 'delete',
                                              icon: <DeleteOutlined />,
                                              label: 'Delete',
                                              danger: true,
                                              onClick: () =>
                                                  onDelete?.(widget.id),
                                          },
                                      ]),
                            ],
                        }}
                        trigger={['click']}
                        placement="bottomRight"
                    >
                        <Button
                            type="text"
                            size="small"
                            icon={<MoreOutlined />}
                            style={{
                                opacity: isSelected ? 1 : 0.6,
                                transition: 'opacity 0.2s ease',
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </Dropdown>
                </div>
            </div>

            {/* Chart Content */}
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    minHeight: 0,
                    flex: 1,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <div
                    ref={chartRef}
                    style={{
                        width: '100%',
                        height: '100%',
                        minHeight: '100px', // Reduced from 300px to allow smaller widgets
                        flex: 1,
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                />

                {isLoading && (
                    <div
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            zIndex: 10,
                        }}
                    >
                        <div
                            style={{
                                color: isDarkMode ? '#ffffff' : '#000000',
                            }}
                        >
                            Loading chart...
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChartWidget;
