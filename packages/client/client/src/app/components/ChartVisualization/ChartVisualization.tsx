'use client';

import React, { useEffect, useRef } from 'react';
import { Card, Typography, Space, Button, message } from 'antd';
import { DownloadOutlined, FullscreenOutlined } from '@ant-design/icons';
import * as echarts from 'echarts';
import { IChartConfig } from '../FileUpload/types';

const { Title } = Typography;

export interface ChartVisualizationProps {
    config: IChartConfig;
    title?: string;
    height?: number;
    width?: number;
    showControls?: boolean;
    onFullscreen?: () => void;
}

const ChartVisualization: React.FC<ChartVisualizationProps> = ({
    config,
    title,
    height = 400,
    width,
    showControls = true,
    onFullscreen
}) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const chartInstanceRef = useRef<echarts.ECharts | null>(null);

    useEffect(() => {
        if (!chartRef.current || !config) return;

        // Initialize ECharts instance
        const chartInstance = echarts.init(chartRef.current);
        chartInstanceRef.current = chartInstance;

        // Set chart options
        try {
            chartInstance.setOption(config, true);
        } catch (error) {
            console.error('Error setting chart options:', error);
            message.error('Failed to render chart');
        }

        // Handle resize
        const handleResize = () => {
            chartInstance.resize();
        };

        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            chartInstance.dispose();
        };
    }, [config]);

    useEffect(() => {
        // Resize chart when dimensions change
        if (chartInstanceRef.current) {
            chartInstanceRef.current.resize();
        }
    }, [height, width]);

    const handleDownload = () => {
        if (!chartInstanceRef.current) return;

        try {
            const url = chartInstanceRef.current.getDataURL({
                type: 'png',
                pixelRatio: 2,
                backgroundColor: '#fff'
            });

            const link = document.createElement('a');
            link.href = url;
            link.download = `chart_${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            message.success('Chart downloaded successfully');
        } catch (error) {
            console.error('Error downloading chart:', error);
            message.error('Failed to download chart');
        }
    };

    const handleFullscreen = () => {
        if (onFullscreen) {
            onFullscreen();
        } else {
            // Default fullscreen behavior
            if (chartRef.current) {
                if (chartRef.current.requestFullscreen) {
                    chartRef.current.requestFullscreen();
                }
            }
        }
    };

    if (!config) {
        return (
            <Card style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography.Text type="secondary">No chart data available</Typography.Text>
            </Card>
        );
    }

    return (
        <Card
            title={title && (
                <Title level={5} style={{ margin: 0 }}>
                    {title}
                </Title>
            )}
            extra={showControls && (
                <Space>
                    <Button
                        type="text"
                        icon={<DownloadOutlined />}
                        onClick={handleDownload}
                        title="Download Chart"
                    />
                    <Button
                        type="text"
                        icon={<FullscreenOutlined />}
                        onClick={handleFullscreen}
                        title="Fullscreen"
                    />
                </Space>
            )}
            style={{ width: width || '100%' }}
            bodyStyle={{ padding: 0 }}
        >
            <div
                ref={chartRef}
                style={{
                    width: '100%',
                    height: height,
                    minHeight: 200
                }}
            />
        </Card>
    );
};

export default ChartVisualization;