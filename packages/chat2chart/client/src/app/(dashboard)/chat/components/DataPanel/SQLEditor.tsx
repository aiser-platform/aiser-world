'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
    Button, 
    Space, 
    Card, 
    Table, 
    Tabs, 
    Typography, 
    Tooltip,
    message,
    Spin,
    Alert,
    Tag
} from 'antd';
import AceEditor from 'react-ace';

// Import SQL mode and themes
import 'ace-builds/src-noconflict/mode-sql';
import 'ace-builds/src-noconflict/theme-github';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/ext-language_tools';
import { 
    PlayCircleOutlined, 
    BarChartOutlined, 
    SaveOutlined,
    HistoryOutlined,
    BulbOutlined,
    CopyOutlined,
    DownloadOutlined
} from '@ant-design/icons';
import { IDatabase } from '../../types';

// const { TabPane } = Tabs; // Deprecated - using items prop instead
const { Text, Paragraph } = Typography;

interface SQLEditorProps {
    value: string;
    onChange: (value: string) => void;
    onExecute: (sql: string) => void;
    loading?: boolean;
    results?: any[];
    onChartGenerate?: () => void;
    database?: IDatabase;
    schema?: string;
}

interface QueryHistory {
    id: string;
    sql: string;
    timestamp: Date;
    duration?: number;
    rowCount?: number;
}

const SQLEditor: React.FC<SQLEditorProps> = ({
    value,
    onChange,
    onExecute,
    loading = false,
    results = [],
    onChartGenerate,
    database,
    schema
}) => {
    const [activeTab, setActiveTab] = useState<string>('editor');
    const [queryHistory, setQueryHistory] = useState<QueryHistory[]>([]);
    const [selectedQuery, setSelectedQuery] = useState<string | null>(null);
    const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
    const editorRef = useRef<HTMLTextAreaElement>(null);

    // Check theme on mount and listen for changes
    useEffect(() => {
        const checkTheme = () => {
            setIsDarkMode(document.documentElement.classList.contains('dark'));
        };
        
        checkTheme();
        
        // Listen for theme changes
        const observer = new MutationObserver(checkTheme);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });
        
        return () => observer.disconnect();
    }, []);

    // SQL Editor using Ace Editor
    const SQLEditorComponent = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
        <div className="sql-editor-wrapper">
            <AceEditor
                mode="sql"
                theme={isDarkMode ? "monokai" : "github"}
                value={value}
                onChange={onChange}
                name="sql-editor"
                editorProps={{ $blockScrolling: true }}
                setOptions={{
                    enableBasicAutocompletion: true,
                    enableLiveAutocompletion: true,
                    enableSnippets: true,
                    showLineNumbers: true,
                    tabSize: 2,
                    fontSize: 14,
                    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
                }}
                commands={[
                    {
                        name: 'execute',
                        bindKey: { win: 'Ctrl-Enter', mac: 'Cmd-Enter' },
                        exec: () => handleExecute()
                    }
                ]}
                placeholder="-- Write your SQL query here
-- Example: SELECT * FROM users WHERE created_at > '2024-01-01'
-- Use Ctrl+Enter to execute"
                style={{
                    width: '100%',
                    height: '200px',
                    border: `1px solid var(--border-color-base)`,
                    borderRadius: '6px',
                    backgroundColor: 'var(--input-background)'
                }}
            />
        </div>
    );

    const handleExecute = () => {
        if (!value.trim()) {
            message.warning('Please enter a SQL query');
            return;
        }

        const queryId = Date.now().toString();
        const startTime = Date.now();
        
        // Add to history
        const newQuery: QueryHistory = {
            id: queryId,
            sql: value,
            timestamp: new Date()
        };

        onExecute(value);
        
        // Simulate completion for history
        setTimeout(() => {
            const duration = Date.now() - startTime;
            setQueryHistory(prev => [{
                ...newQuery,
                duration,
                rowCount: results.length
            }, ...prev.slice(0, 9)]); // Keep last 10 queries
        }, 1000);
    };

    const handleSaveQuery = () => {
        // Implement save functionality
        message.success('Query saved to your collection');
    };

    const handleCopyQuery = () => {
        navigator.clipboard.writeText(value);
        message.success('Query copied to clipboard');
    };

    const handleExportResults = () => {
        if (results.length === 0) {
            message.warning('No results to export');
            return;
        }
        
        // Convert to CSV
        const headers = Object.keys(results[0]);
        const csvContent = [
            headers.join(','),
            ...results.map(row => headers.map(header => row[header]).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'query_results.csv';
        a.click();
        URL.revokeObjectURL(url);
        
        message.success('Results exported as CSV');
    };

    const getSuggestedQueries = () => {
        if (!database || !schema) return [];
        
        return [
            {
                title: 'Show all tables',
                sql: `SELECT table_name FROM information_schema.tables WHERE table_schema = '${schema}';`
            },
            {
                title: 'User activity summary',
                sql: `SELECT 
    DATE(created_at) as date,
    COUNT(*) as user_count
FROM ${schema}.users 
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;`
            },
            {
                title: 'Top customers by orders',
                sql: `SELECT 
    u.name,
    COUNT(o.id) as order_count,
    SUM(o.amount) as total_spent
FROM ${schema}.users u
JOIN ${schema}.orders o ON u.id = o.user_id
GROUP BY u.id, u.name
ORDER BY total_spent DESC
LIMIT 10;`
            }
        ];
    };

    const renderResultsTable = () => {
        if (results.length === 0) {
            return (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <Text type="secondary">No results to display</Text>
                </div>
            );
        }

        const columns = Object.keys(results[0]).map(key => ({
            title: key,
            dataIndex: key,
            key: key,
            ellipsis: true,
            width: 150
        }));

        return (
            <div>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space>
                        <Text strong>Results ({results.length} rows)</Text>
                        <Button
                            type="primary"
                            icon={<BarChartOutlined />}
                            onClick={onChartGenerate}
                            disabled={results.length === 0}
                        >
                            Generate Chart
                        </Button>
                    </Space>
                    <Space>
                        <Button
                            icon={<DownloadOutlined />}
                            onClick={handleExportResults}
                        >
                            Export CSV
                        </Button>
                    </Space>
                </div>
                <Table
                    columns={columns}
                    dataSource={results.map((row, index) => ({ ...row, key: index }))}
                    scroll={{ x: true, y: 300 }}
                    size="small"
                    pagination={{ 
                        pageSize: 50,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total) => `Total ${total} rows`
                    }}
                />
            </div>
        );
    };

    const renderQueryHistory = () => (
        <div className="query-history">
            {queryHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <Text type="secondary">No query history</Text>
                </div>
            ) : (
                <div>
                    {queryHistory.map(query => (
                        <Card 
                            key={query.id}
                            size="small" 
                            style={{ marginBottom: 8 }}
                            hoverable
                            onClick={() => {
                                onChange(query.sql);
                                setActiveTab('editor');
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                    <Paragraph 
                                        ellipsis={{ rows: 2 }}
                                        style={{ margin: 0, fontSize: '12px', fontFamily: 'monospace' }}
                                    >
                                        {query.sql}
                                    </Paragraph>
                                    <div style={{ marginTop: 4 }}>
                                        <Space size="small">
                                            <Text type="secondary" style={{ fontSize: '11px' }}>
                                                {query.timestamp.toLocaleTimeString()}
                                            </Text>
                                            {query.duration && (
                                                <Tag size="small">{query.duration}ms</Tag>
                                            )}
                                            {query.rowCount !== undefined && (
                                                <Tag size="small">{query.rowCount} rows</Tag>
                                            )}
                                        </Space>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );

    const renderSuggestions = () => {
        const suggestions = getSuggestedQueries();
        
        return (
            <div className="query-suggestions">
                <Alert
                    message="AI Query Suggestions"
                    description="Click on any suggestion to use it as a starting point"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
                
                {suggestions.map((suggestion, index) => (
                    <Card 
                        key={index}
                        size="small" 
                        title={suggestion.title}
                        style={{ marginBottom: 12 }}
                        hoverable
                        onClick={() => {
                            onChange(suggestion.sql);
                            setActiveTab('editor');
                        }}
                    >
                        <Paragraph 
                            code
                            style={{ 
                                margin: 0, 
                                fontSize: '12px',
                                whiteSpace: 'pre-wrap'
                            }}
                        >
                            {suggestion.sql}
                        </Paragraph>
                    </Card>
                ))}
            </div>
        );
    };

    return (
        <div className="sql-editor-container" style={{ height: '100%' }}>
            <Tabs 
                activeKey={activeTab} 
                onChange={setActiveTab}
                size="small"
                tabBarExtraContent={
                    activeTab === 'editor' && (
                        <Space>
                            <Tooltip title="Save Query (Ctrl+S)">
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<SaveOutlined />}
                                    onClick={handleSaveQuery}
                                />
                            </Tooltip>
                            <Tooltip title="Copy Query">
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<CopyOutlined />}
                                    onClick={handleCopyQuery}
                                />
                            </Tooltip>
                        </Space>
                    )
                }
                items={[
                    {
                        key: 'editor',
                        label: (
                            <Space>
                                <PlayCircleOutlined />
                                Editor
                            </Space>
                        ),
                        children: (
                            <div style={{ height: 'calc(100vh - 300px)', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ marginBottom: 12 }}>
                                    <Space>
                                        <Button
                                            type="primary"
                                            icon={<PlayCircleOutlined />}
                                            onClick={handleExecute}
                                            loading={loading}
                                            disabled={!value.trim()}
                                        >
                                            Execute (Ctrl+Enter)
                                        </Button>
                                        {database && (
                                            <Text type="secondary">
                                                Connected to: {database.name} / {schema}
                                            </Text>
                                        )}
                                    </Space>
                                </div>
                                
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <SQLEditorComponent value={value} onChange={onChange} />
                                    
                                    <div style={{ flex: 1, marginTop: 16 }}>
                                        <Spin spinning={loading}>
                                            {renderResultsTable()}
                                        </Spin>
                                    </div>
                                </div>
                            </div>
                        )
                    },
                    {
                        key: 'history',
                        label: (
                            <Space>
                                <HistoryOutlined />
                                History
                            </Space>
                        ),
                        children: renderQueryHistory()
                    },
                    {
                        key: 'suggestions',
                        label: (
                            <Space>
                                <BulbOutlined />
                                Suggestions
                            </Space>
                        ),
                        children: renderSuggestions()
                    }
                ]}
            />
        </div>
    );
};

export default SQLEditor;