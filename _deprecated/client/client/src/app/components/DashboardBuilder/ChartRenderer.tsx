'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Spin, Empty, Typography } from 'antd';
import * as echarts from 'echarts';
import { IChart } from './DashboardBuilder';
import { IDataSource } from '../FileUpload/types';

const { Text } = Typography;

export interface ChartRendererProps {
    chart: IChart;
    dataSource: IDataSource | undefined;
    onPositionChange?: (position: any) => void;
}

const ChartRenderer: React.FC<ChartRendererProps> = ({
    chart,
    dataSource,
    onPositionChange
}) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const [chartInstance, setChartInstance] = useState<echarts.ECharts | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (chartRef.current && dataSource) {
            const chart = echarts.init(chartRef.current);
            setChartInstance(chart);
            
            // Handle resize
            const handleResize = () => chart.resize();
            window.addEventListener('resize', handleResize);
            
            return () => {
                window.removeEventListener('resize', handleResize);
                chart.dispose();
            };
        }
    }, [dataSource]);

    useEffect(() => {
        if (chartInstance && dataSource) {
            renderChart();
        }
    }, [chartInstance, chart, dataSource]);

    const renderChart = () => {
        if (!chartInstance || !dataSource) return;

        setLoading(true);
        setError(null);

        try {
            const option = generateChartOption();
            chartInstance.setOption(option);
            setLoading(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to render chart');
            setLoading(false);
        }
    };

    const generateChartOption = () => {
        if (!dataSource?.data || !Array.isArray(dataSource.data)) {
            return { title: { text: 'No data available' } };
        }

        const data = dataSource.data;
        const { xAxis: xField, yAxis: yField, aggregation, type } = chart.config;

        if (!xField || !yField) {
            return { title: { text: 'Chart configuration incomplete' } };
        }

        // Process data based on chart type and configuration
        let processedData: any[] = [];

        if (type === 'table') {
            return generateTableOption(data);
        }

        // Group data by X-axis field and apply aggregation
        const groupedData = new Map<string, number[]>();
        
        data.forEach(row => {
            const xValue = String(row[xField] || 'Unknown');
            const yValue = parseFloat(row[yField]) || 0;
            
            if (!groupedData.has(xValue)) {
                groupedData.set(xValue, []);
            }
            groupedData.get(xValue)!.push(yValue);
        });

        // Apply aggregation
        const aggregatedData: [string, number][] = [];
        groupedData.forEach((values, key) => {
            let aggregatedValue = 0;
            
            switch (aggregation) {
                case 'sum':
                    aggregatedValue = values.reduce((sum, val) => sum + val, 0);
                    break;
                case 'avg':
                    aggregatedValue = values.reduce((sum, val) => sum + val, 0) / values.length;
                    break;
                case 'count':
                    aggregatedValue = values.length;
                    break;
                case 'min':
                    aggregatedValue = Math.min(...values);
                    break;
                case 'max':
                    aggregatedValue = Math.max(...values);
                    break;
                default:
                    aggregatedValue = values.reduce((sum, val) => sum + val, 0);
            }
            
            aggregatedData.push([key, aggregatedValue]);
        });

        // Sort data
        aggregatedData.sort((a, b) => b[1] - a[1]);

        const xAxisData = aggregatedData.map(item => item[0]);
        const seriesData = aggregatedData.map(item => item[1]);

        switch (type) {
            case 'bar':
                return {
                    title: { text: chart.name },
                    tooltip: { trigger: 'axis' },
                    xAxis: { 
                        type: 'category', 
                        data: xAxisData,
                        axisLabel: { rotate: 45 }
                    },
                    yAxis: { type: 'value' },
                    series: [{
                        name: yField,
                        type: 'bar',
                        data: seriesData,
                        itemStyle: {
                            color: '#1890ff'
                        }
                    }]
                };

            case 'line':
                return {
                    title: { text: chart.name },
                    tooltip: { trigger: 'axis' },
                    xAxis: { 
                        type: 'category', 
                        data: xAxisData,
                        axisLabel: { rotate: 45 }
                    },
                    yAxis: { type: 'value' },
                    series: [{
                        name: yField,
                        type: 'line',
                        data: seriesData,
                        smooth: true,
                        lineStyle: { color: '#1890ff' },
                        itemStyle: { color: '#1890ff' }
                    }]
                };

            case 'pie':
                return {
                    title: { text: chart.name },
                    tooltip: { trigger: 'item' },
                    series: [{
                        name: yField,
                        type: 'pie',
                        radius: '50%',
                        data: aggregatedData.map(item => ({
                            name: item[0],
                            value: item[1]
                        })),
                        emphasis: {
                            itemStyle: {
                                shadowBlur: 10,
                                shadowOffsetX: 0,
                                shadowColor: 'rgba(0, 0, 0, 0.5)'
                            }
                        }
                    }]
                };

            case 'scatter':
                return {
                    title: { text: chart.name },
                    tooltip: { trigger: 'item' },
                    xAxis: { type: 'value' },
                    yAxis: { type: 'value' },
                    series: [{
                        name: `${xField} vs ${yField}`,
                        type: 'scatter',
                        data: data.map(row => [
                            parseFloat(row[xField]) || 0,
                            parseFloat(row[yField]) || 0
                        ]).filter(point => !isNaN(point[0]) && !isNaN(point[1])),
                        symbolSize: 8,
                        itemStyle: { color: '#1890ff' }
                    }]
                };

            case 'area':
                return {
                    title: { text: chart.name },
                    tooltip: { trigger: 'axis' },
                    xAxis: { 
                        type: 'category', 
                        data: xAxisData,
                        axisLabel: { rotate: 45 }
                    },
                    yAxis: { type: 'value' },
                    series: [{
                        name: yField,
                        type: 'line',
                        data: seriesData,
                        smooth: true,
                        areaStyle: { 
                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0, color: 'rgba(24, 144, 255, 0.6)' },
                                { offset: 1, color: 'rgba(24, 144, 255, 0.1)' }
                            ])
                        },
                        lineStyle: { color: '#1890ff' },
                        itemStyle: { color: '#1890ff' }
                    }]
                };

            default:
                return {
                    title: { text: 'Unsupported chart type' },
                    series: []
                };
        }
    };

    const generateTableOption = (data: any[]) => {
        if (!data || data.length === 0) {
            return { title: { text: 'No data available' } };
        }

        const columns = Object.keys(data[0]);
        const tableData = data.slice(0, 100); // Limit to first 100 rows for performance

        return {
            title: { text: chart.name },
            tooltip: { trigger: 'axis' },
            xAxis: { type: 'category' },
            yAxis: { type: 'value' },
            series: [{
                type: 'custom',
                renderItem: (params: any, api: any) => {
                    const x = api.value(0);
                    const y = api.value(1);
                    const width = api.size([1, 0])[0];
                    const height = api.size([0, 1])[1];
                    
                    return {
                        type: 'rect',
                        shape: { x, y, width, height },
                        style: {
                            fill: '#f0f0f0',
                            stroke: '#ccc'
                        }
                    };
                },
                encode: {
                    x: [0],
                    y: [1]
                },
                data: tableData.map((row, index) => [
                    index,
                    Object.values(row).join(' | ')
                ])
            }]
        };
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Spin size="large" />
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Empty description={error} />
            </div>
        );
    }

    if (!dataSource) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Empty description="Data source not found" />
            </div>
        );
    }

    return (
        <div style={{ width: '100%', height: '100%' }}>
            <div 
                ref={chartRef} 
                style={{ 
                    width: '100%', 
                    height: 'calc(100% - 40px)', // Account for header
                    minHeight: 200 
                }} 
            />
        </div>
    );
};

export default ChartRenderer;
