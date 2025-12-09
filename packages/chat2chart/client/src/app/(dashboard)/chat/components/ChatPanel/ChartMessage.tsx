import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { Button, Dropdown, message as antMessage, Modal, Table } from 'antd';
import { 
    DownloadOutlined, 
    MoreOutlined, 
    CodeOutlined, 
    SettingOutlined, 
    CopyOutlined,
    SaveOutlined,
    BarChartOutlined,
    EyeOutlined
} from '@ant-design/icons';
import { addWatermarkToChart } from '@/utils/watermark';

interface ChartMessageProps {
    messageId: string;
    config: any;
    isDark: boolean;
    planType?: string;
    conversationId?: string;
    selectedDataSourceId?: string;
    sqlQuery?: string;
    queryResult?: any;
}

const ChartMessage: React.FC<ChartMessageProps> = ({ 
    messageId, 
    config, 
    isDark, 
    planType,
    conversationId,
    selectedDataSourceId,
    sqlQuery,
    queryResult
}) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const chartInstanceRef = useRef<echarts.ECharts | null>(null);
    const resizeObserverRef = useRef<ResizeObserver | null>(null);
    const [isReady, setIsReady] = useState(false);

    // Initialize Chart - runs once when component mounts or config changes
    useEffect(() => {
        if (!chartRef.current || !config) return;

        // Dispose existing instance if any
        if (chartInstanceRef.current) {
            try {
                chartInstanceRef.current.dispose();
            } catch (e) {
                console.warn('Error disposing chart:', e);
            }
        }

        // Disconnect existing resize observer
        if (resizeObserverRef.current) {
            resizeObserverRef.current.disconnect();
        }

        // Wait for next frame to ensure DOM is ready
        requestAnimationFrame(() => {
            if (!chartRef.current) return;

            try {
                // Initialize ECharts instance
                const instance = echarts.init(chartRef.current, isDark ? 'dark' : undefined, {
                    renderer: 'canvas',
                    width: 'auto',
                    height: 'auto'
                });

                // Handle primary_chart structure
                let chartConfig = config;
                if (chartConfig && typeof chartConfig === 'object' && chartConfig.primary_chart) {
                    chartConfig = chartConfig.primary_chart;
                }

                // Ensure chartConfig is valid
                if (!chartConfig || typeof chartConfig !== 'object' || !chartConfig.series) {
                    console.warn('Invalid chart config:', chartConfig);
                    return;
                }

                // CRITICAL: Fix formatters that are strings (function code) - convert to actual functions
                // This happens when chart configs are serialized/deserialized (JSON doesn't support functions)
                const fixFormatters = (config: any): any => {
                    if (!config || typeof config !== 'object') return config;
                    
                    // Fix tooltip formatter
                    if (config.tooltip?.formatter && typeof config.tooltip.formatter === 'string') {
                        const formatterStr = config.tooltip.formatter;
                        if (formatterStr.includes('function') || formatterStr.includes('=>')) {
                            try {
                                // Try to evaluate the function string safely
                                // Common pattern: function(params) { ... }
                                if (formatterStr.includes('echarts.format.addCommas')) {
                                    config.tooltip.formatter = (params: any) => {
                                        if (!Array.isArray(params)) params = [params];
                                        const date = params[0]?.axisValue || '';
                                        const lines = [`<b>${date}</b>`];
                                        params.forEach((p: any) => {
                                            if (p.value == null) return;
                                            const val = typeof p.value === 'number' ? p.value : Number(p.value);
                                            if (p.seriesName?.includes('Revenue') || p.seriesName?.includes('MA')) {
                                                lines.push(`${p.marker} ${p.seriesName}: $${echarts.format.addCommas(val.toFixed(2))}`);
                                            } else {
                                                lines.push(`${p.marker} ${p.seriesName}: ${p.value}`);
                                            }
                                        });
                                        return lines.join('<br/>');
                                    };
                                } else {
                                    // Generic fallback - use default ECharts formatter
                                    config.tooltip.formatter = undefined; // Let ECharts use default
                                }
                            } catch (e) {
                                console.warn('Failed to convert tooltip formatter string to function:', e);
                                config.tooltip.formatter = undefined; // Fallback to default
                            }
                        }
                    }
                    
                    // Fix yAxis formatters
                    if (config.yAxis) {
                        const yAxes = Array.isArray(config.yAxis) ? config.yAxis : [config.yAxis];
                        yAxes.forEach((yAxis: any) => {
                            if (yAxis?.axisLabel?.formatter && typeof yAxis.axisLabel.formatter === 'string') {
                                const formatterStr = yAxis.axisLabel.formatter;
                                // Check if it's function code (contains "function" or "=>")
                                if (formatterStr.includes('function') || formatterStr.includes('=>') || formatterStr.includes('toLocaleString') || formatterStr.includes('echarts.format')) {
                                    try {
                                        // Try to evaluate the function string safely
                                        // Common patterns: function(value) { return '$' + echarts.format.addCommas(value.toFixed(2)); }
                                        if (formatterStr.includes('echarts.format.addCommas')) {
                                            yAxis.axisLabel.formatter = (value: any) => {
                                                if (typeof value === 'number') {
                                                    if (formatterStr.includes('$')) {
                                                        return `$${echarts.format.addCommas(value.toFixed(2))}`;
                                                    }
                                                    return echarts.format.addCommas(value.toFixed(2));
                                                }
                                                return value;
                                            };
                                        } else if (formatterStr.includes('toLocaleString')) {
                                            yAxis.axisLabel.formatter = (value: any) => {
                                                if (typeof value === 'number') {
                                                    if (formatterStr.includes('$')) {
                                                        return `$${value.toLocaleString()}`;
                                                    }
                                                    return value.toLocaleString();
                                                }
                                                return value;
                                            };
                                        } else if (formatterStr.includes('$')) {
                                            // Currency formatter
                                            yAxis.axisLabel.formatter = (value: any) => {
                                                if (typeof value === 'number') {
                                                    return `$${value.toLocaleString()}`;
                                                }
                                                return value;
                                            };
                                        } else {
                                            // Generic: try to extract the return statement
                                            const match = formatterStr.match(/return\s+(.+?);/);
                                            if (match) {
                                                const returnExpr = match[1].trim();
                                                if (returnExpr.includes('toLocaleString')) {
                                                    yAxis.axisLabel.formatter = (value: any) => {
                                                        if (typeof value === 'number') {
                                                            return value.toLocaleString();
                                                        }
                                                        return value;
                                                    };
                                                } else {
                                                    // Fallback: use template string formatter
                                                    yAxis.axisLabel.formatter = (value: any) => {
                                                        if (typeof value === 'number') {
                                                            return value.toLocaleString();
                                                        }
                                                        return String(value);
                                                    };
                                                }
                                            } else {
                                                // Fallback to simple number formatting
                                                yAxis.axisLabel.formatter = (value: any) => {
                                                    if (typeof value === 'number') {
                                                        return value.toLocaleString();
                                                    }
                                                    return String(value);
                                                };
                                            }
                                        }
                                    } catch (e) {
                                        console.warn('Failed to convert formatter string to function:', e);
                                        // Fallback to simple formatting
                                        yAxis.axisLabel.formatter = (value: any) => {
                                            if (typeof value === 'number') {
                                                return value.toLocaleString();
                                            }
                                            return String(value);
                                        };
                                    }
                                }
                            }
                        });
                    }
                    
                    // Fix xAxis formatters
                    if (config.xAxis) {
                        const xAxes = Array.isArray(config.xAxis) ? config.xAxis : [config.xAxis];
                        xAxes.forEach((xAxis: any) => {
                            if (xAxis?.axisLabel?.formatter && typeof xAxis.axisLabel.formatter === 'string') {
                                const formatterStr = xAxis.axisLabel.formatter;
                                if (formatterStr.includes('function') || formatterStr.includes('=>')) {
                                    // Similar fix for xAxis if needed
                                    xAxis.axisLabel.formatter = (value: any) => String(value);
                                }
                            }
                        });
                    }
                    
                    return config;
                };
                
                // Apply formatter fixes before watermark
                chartConfig = fixFormatters(chartConfig);

                // Apply watermark
                const watermarkedConfig = addWatermarkToChart(chartConfig, planType);

                // Remove toolbox (moved to menu)
                if (watermarkedConfig.toolbox) {
                    delete watermarkedConfig.toolbox;
                }

                // Set chart option
                instance.setOption(watermarkedConfig, false); // false = merge mode

                chartInstanceRef.current = instance;
                setIsReady(true);

                // Setup resize observer
                const resizeObserver = new ResizeObserver(() => {
                    if (instance && !instance.isDisposed()) {
                        try {
                            instance.resize();
                        } catch (e) {
                            console.warn('Chart resize error:', e);
                        }
                    }
                });
                resizeObserver.observe(chartRef.current);
                resizeObserverRef.current = resizeObserver;

                // Force initial resize after a short delay
                setTimeout(() => {
                    if (instance && !instance.isDisposed()) {
                        instance.resize();
                    }
                }, 100);

            } catch (e) {
                console.error('Failed to initialize chart:', e);
            }
        });

        // Cleanup
        return () => {
            if (resizeObserverRef.current) {
                resizeObserverRef.current.disconnect();
            }
            if (chartInstanceRef.current) {
                try {
                    chartInstanceRef.current.dispose();
                } catch (e) {
                    console.warn('Error disposing chart on cleanup:', e);
                }
            }
        };
    }, [config, isDark, planType]); // Only re-render if config, theme, or plan changes

    // Export Function
    const handleExport = (type: 'png' | 'svg') => {
        if (!chartInstanceRef.current || !isReady) {
            antMessage.warning('Chart is still rendering, please wait a moment...');
            return;
        }
        
        try {
            const url = chartInstanceRef.current.getDataURL({
                type,
                backgroundColor: isDark ? '#1f1f1f' : '#ffffff',
                pixelRatio: type === 'png' ? 2 : 1
            });
            const link = document.createElement('a');
            link.download = `chart-${messageId}.${type}`;
            link.href = url;
            link.click();
            antMessage.success(`Chart exported as ${type.toUpperCase()}`);
        } catch (e) {
            console.error('Chart export error:', e);
            antMessage.error('Failed to export chart. Please try again.');
        }
    };

    // View SQL Query
    const handleViewSQL = () => {
        if (!sqlQuery) {
            antMessage.info('No SQL query available');
            return;
        }

        import('@/app/components/MemoryOptimizedEditor').then(({ default: MemoryOptimizedEditor }) => {
            const modal = Modal.info({
                title: 'SQL Query',
                width: '90%',
                style: { maxWidth: 1200 },
                styles: {
                    body: { padding: '0' }
                },
                content: (
                    <div style={{ 
                        height: '500px',
                        border: '1px solid var(--ant-color-border)',
                        borderRadius: '4px',
                        overflow: 'hidden'
                    }}>
                        <MemoryOptimizedEditor
                            value={sqlQuery}
                            onChange={() => {}}
                            language="sql"
                            theme={isDark ? 'vs-dark' : 'vs-light'}
                            height="500px"
                            options={{
                                readOnly: true,
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                wordWrap: 'on',
                                fontSize: 14,
                                lineNumbers: 'on',
                                automaticLayout: true
                            }}
                        />
                    </div>
                ),
                onOk: () => modal.destroy()
            });
        }).catch(() => {
            // Fallback to simple pre tag
            const fallbackModal = Modal.info({
                title: 'SQL Query',
                width: '90%',
                style: { maxWidth: 1200 },
                content: (
                    <pre style={{ 
                        background: 'var(--ant-color-bg-container)', 
                        padding: '16px', 
                        borderRadius: '4px',
                        overflow: 'auto',
                        maxHeight: '500px',
                        color: 'var(--ant-color-text)',
                        border: '1px solid var(--ant-color-border)',
                        fontSize: '13px',
                        lineHeight: '1.6',
                        fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, "source-code-pro", monospace'
                    }}>
                        {sqlQuery}
                    </pre>
                ),
                onOk: () => fallbackModal.destroy()
            });
        });
    };

    // View Query Results
    const handleViewResults = () => {
        if (!queryResult || (Array.isArray(queryResult) && queryResult.length === 0)) {
            antMessage.info('No query results available');
            return;
        }

        const results = Array.isArray(queryResult) ? queryResult : [queryResult];
        const columns = results.length > 0 ? Object.keys(results[0]).map(key => ({
            title: key,
            dataIndex: key,
            key: key,
            width: 150,
            ellipsis: true
        })) : [];

        Modal.info({
            title: 'Query Results',
            width: '90%',
            style: { maxWidth: 1200 },
            content: (
                <div style={{ marginTop: 16 }}>
                    <div style={{ marginBottom: 8, color: 'var(--ant-color-text-secondary)' }}>
                        {results.length} row{results.length !== 1 ? 's' : ''}
                    </div>
                    <Table
                        dataSource={results.map((r: any, i: number) => ({ ...r, key: i }))}
                        columns={columns}
                        pagination={{ 
                            pageSize: 20,
                            showSizeChanger: true,
                            showQuickJumper: true,
                            showTotal: (total) => `Total ${total} rows`
                        }}
                        scroll={{ 
                            x: 'max-content', 
                            y: 500,
                            scrollToFirstRowOnChange: true
                        }}
                        size="middle"
                        bordered
                        style={{ 
                            background: isDark ? '#1f1f1f' : '#ffffff'
                        }}
                    />
                </div>
            ),
            onOk: () => {}
        });
    };

    // View Chart Config
    const handleViewConfig = () => {
        const modal = Modal.info({
            title: 'Chart Configuration',
            width: 800,
            content: (
                <pre style={{ 
                    background: 'var(--ant-color-bg-container)', 
                    padding: '12px', 
                    borderRadius: '4px',
                    overflow: 'auto',
                    maxHeight: '400px',
                    color: 'var(--ant-color-text)',
                    border: '1px solid var(--ant-color-border)'
                }}>
                    {JSON.stringify(config, null, 2)}
                </pre>
            ),
            onOk: () => modal.destroy()
        });
    };

    // Copy Chart Config
    const handleCopyConfig = () => {
        navigator.clipboard.writeText(JSON.stringify(config, null, 2));
        antMessage.success('Chart config copied to clipboard');
    };

    // Save to Library
    const handleSaveToLibrary = async () => {
        if (!conversationId) {
            antMessage.warning('Please wait for the conversation to be created');
            return;
        }
        try {
            const { assetService } = await import('@/services/assetService');
            
            let chartTitle = 'Chart';
            if (config?.title) {
                if (typeof config.title === 'string') {
                    chartTitle = config.title;
                } else if (typeof config.title === 'object' && config.title.text) {
                    chartTitle = config.title.text;
                }
            }
            
            // CRITICAL: Validate messageId is a valid UUID before sending
            // Backend expects UUID format, but frontend might have non-UUID message IDs
            let validMessageId: string | undefined = undefined;
            if (messageId) {
                // Check if messageId is a valid UUID format
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (uuidRegex.test(messageId)) {
                    validMessageId = messageId;
                } else {
                    console.warn('⚠️ messageId is not a valid UUID format, omitting it:', messageId);
                    // Don't fail - message_id is optional in the backend
                }
            }
            
            await assetService.saveAsset({
                conversation_id: conversationId,
                message_id: validMessageId, // Only include if valid UUID
                asset_type: 'chart' as const,
                title: chartTitle,
                content: config,
                data_source_id: selectedDataSourceId,
                metadata: {
                    chart_type: config?.series?.[0]?.type || 'chart'
                }
            });
            antMessage.success('Chart saved to library');
        } catch (error: any) {
            console.error('Failed to save chart to library:', error);
            const errorMessage = error.message || error.detail || 'Failed to save to library';
            antMessage.error(`Backend error: ${error.status || 500} - ${errorMessage}`);
        }
    };

    if (!config) {
        return null;
    }

    return (
        <div 
            className="chart-wrapper" 
            style={{ 
                marginTop: '12px',
                position: 'relative',
                background: 'var(--ant-color-bg-container)',
                borderRadius: '8px',
                border: '1px solid var(--ant-color-border)',
                padding: '12px'
            }}
        >
            {/* Chart Menu - Improved with better styling and functionality */}
            <div style={{ 
                position: 'absolute', 
                right: 12, 
                top: 12, 
                zIndex: 11,
                display: 'flex',
                gap: '4px'
            }}>
                <Dropdown
                    menu={{
                        items: [
                            ...(sqlQuery ? [{
                                key: 'view-sql',
                                icon: <CodeOutlined />,
                                label: 'View SQL Query',
                                onClick: () => {
                                    handleViewSQL();
                                }
                            }] : []),
                            ...(queryResult ? [{
                                key: 'view-results',
                                icon: <EyeOutlined />,
                                label: 'View Query Results',
                                onClick: () => {
                                    handleViewResults();
                                }
                            }] : []),
                            ...(sqlQuery || queryResult ? [{ type: 'divider' as const }] : []),
                            {
                                key: 'view-config',
                                icon: <SettingOutlined />,
                                label: 'View Chart Config',
                                onClick: () => {
                                    handleViewConfig();
                                }
                            },
                            {
                                key: 'copy-config',
                                icon: <CopyOutlined />,
                                label: 'Copy Chart Config',
                                onClick: () => {
                                    handleCopyConfig();
                                }
                            },
                            { type: 'divider' as const },
                            {
                                key: 'export-png',
                                icon: <DownloadOutlined />,
                                label: 'Export as PNG',
                                onClick: () => {
                                    handleExport('png');
                                }
                            },
                            {
                                key: 'export-svg',
                                icon: <DownloadOutlined />,
                                label: 'Export as SVG',
                                onClick: () => {
                                    handleExport('svg');
                                }
                            },
                            ...(conversationId ? [{ type: 'divider' as const }] : []),
                            ...(conversationId ? [{
                                key: 'save-to-library',
                                icon: <SaveOutlined />,
                                label: 'Save to Library',
                                onClick: () => {
                                    handleSaveToLibrary();
                                }
                            }] : []),
                            {
                                key: 'save-to-dashboard',
                                icon: <BarChartOutlined />,
                                label: 'Save to Dashboard',
                                onClick: () => {
                                    // Store chart config in sessionStorage for dashboard import
                                    try {
                                        sessionStorage.setItem('chart_to_import', JSON.stringify({
                                            config: config,
                                            title: config?.title?.text || config?.title || 'Chart',
                                            messageId: messageId
                                        }));
                                        window.location.href = '/dash-studio?import=chart';
                                        antMessage.info('Opening Dashboard Studio...');
                                    } catch (e) {
                                        console.error('Failed to save chart for import:', e);
                                        window.location.href = '/dash-studio';
                                        antMessage.info('Opening Dashboard Studio...');
                                    }
                                }
                            }
                        ]
                    }}
                    trigger={['click']}
                    placement="bottomRight"
                    getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
                    overlayClassName="chart-menu-dropdown-overlay"
                    overlayStyle={{
                        zIndex: 1000
                    }}
                >
                    <Button
                        type="text"
                        size="small"
                        icon={<MoreOutlined />}
                        style={{ 
                            opacity: 0.7,
                            transition: 'opacity 0.2s ease',
                            zIndex: 11,
                            color: 'var(--ant-color-text-secondary)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '1';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '0.7';
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                        }}
                    />
                </Dropdown>
            </div>

            {/* Chart Container - Single, clean container */}
            <div 
                ref={chartRef} 
                style={{ 
                    height: '450px', 
                    width: '100%', 
                    minHeight: '400px',
                    position: 'relative',
                    zIndex: 1
                }} 
            />
        </div>
    );
};

export default ChartMessage;

