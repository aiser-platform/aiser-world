/**
 * Thought Process Display Component
 * Shows interactive step-by-step reasoning process from AI workflow
 */

import React, { useState } from 'react';
import { Card, Collapse, Tag, Typography, Space, Timeline } from 'antd';
import { 
    CheckCircleOutlined, 
    LoadingOutlined, 
    ClockCircleOutlined,
    BulbOutlined,
    DatabaseOutlined,
    BarChartOutlined,
    RocketOutlined
} from '@ant-design/icons';
import './ThoughtProcessDisplay.css';

const { Panel } = Collapse;
const { Text, Paragraph } = Typography;

interface ReasoningStep {
    step: string;
    description?: string;
    status: 'pending' | 'processing' | 'complete' | 'error';
    timestamp?: string;
    details?: any;
}

interface ThoughtProcessDisplayProps {
    reasoningSteps?: ReasoningStep[];
    currentStage?: string;
    progressMessage?: string;
    progressPercentage?: number;
    isDark: boolean;
}

const ThoughtProcessDisplay: React.FC<ThoughtProcessDisplayProps> = ({
    reasoningSteps,
    currentStage,
    progressMessage,
    progressPercentage,
    isDark
}) => {
    const [activeKey, setActiveKey] = useState<string[]>([]);

    // Map stages to icons and colors
    const getStageInfo = (stage: string) => {
        const stageMap: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
            'start': { icon: <RocketOutlined />, color: 'blue', label: 'Starting Analysis' },
            'route_query': { icon: <BulbOutlined />, color: 'cyan', label: 'Understanding Query' },
            'nl2sql': { icon: <DatabaseOutlined />, color: 'purple', label: 'Generating SQL' },
            'nl2sql_complete': { icon: <CheckCircleOutlined />, color: 'green', label: 'SQL Generated' },
            'validate_sql': { icon: <CheckCircleOutlined />, color: 'orange', label: 'Validating SQL' },
            'sql_validated': { icon: <CheckCircleOutlined />, color: 'green', label: 'SQL Validated' },
            'execute_query': { icon: <DatabaseOutlined />, color: 'blue', label: 'Executing Query' },
            'query_executed': { icon: <CheckCircleOutlined />, color: 'green', label: 'Query Executed' },
            'validate_results': { icon: <CheckCircleOutlined />, color: 'orange', label: 'Validating Results' },
            'results_validated': { icon: <CheckCircleOutlined />, color: 'green', label: 'Results Validated' },
            'generate_chart': { icon: <BarChartOutlined />, color: 'purple', label: 'Generating Chart' },
            'generate_insights': { icon: <BulbOutlined />, color: 'cyan', label: 'Generating Insights' },
            'unified_chart_insights': { icon: <BarChartOutlined />, color: 'purple', label: 'Creating Visualization' },
            'file_analysis': { icon: <DatabaseOutlined />, color: 'blue', label: 'Analyzing File Data' },
            'deep_file_analysis': { icon: <BulbOutlined />, color: 'purple', label: 'Deep Analysis' },
            'deep_analysis_complete': { icon: <CheckCircleOutlined />, color: 'green', label: 'Analysis Complete' },
            'complete': { icon: <CheckCircleOutlined />, color: 'green', label: 'Complete' }
        };
        return stageMap[stage] || { icon: <ClockCircleOutlined />, color: 'default', label: stage };
    };

    // If we have explicit reasoning steps, use them
    if (reasoningSteps && reasoningSteps.length > 0) {
        return (
            <Card 
                className={`thought-process-card ${isDark ? 'dark' : 'light'}`}
                title={
                    <Space>
                        <BulbOutlined />
                        <Text strong>Analysis Process</Text>
                    </Space>
                }
                size="small"
            >
                <Timeline mode="left" style={{ marginTop: 16 }}>
                    {reasoningSteps.map((step, index) => {
                        const statusIcon = 
                            step.status === 'complete' ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> :
                            step.status === 'processing' ? <LoadingOutlined style={{ color: '#1890ff' }} /> :
                            step.status === 'error' ? <CheckCircleOutlined style={{ color: '#ff4d4f' }} /> :
                            <ClockCircleOutlined style={{ color: '#d9d9d9' }} />;

                        return (
                            <Timeline.Item key={index} dot={statusIcon}>
                                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                    <Text strong style={{ color: isDark ? '#ffffff' : '#000000' }}>
                                        {step.step}
                                    </Text>
                                    {step.description && (
                                        <Text type="secondary" style={{ color: isDark ? '#d9d9d9' : '#595959' }}>
                                            {step.description}
                                        </Text>
                                    )}
                                    {step.timestamp && (
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            {step.timestamp}
                                        </Text>
                                    )}
                                </Space>
                            </Timeline.Item>
                        );
                    })}
                </Timeline>
            </Card>
        );
    }

    // Otherwise, use current stage and progress message
    if (!currentStage && !progressMessage && progressPercentage === undefined) {
        return null;
    }

    const stageInfo = currentStage ? getStageInfo(currentStage) : null;

    // Simplify: Only show title with stage label OR generic message, not both
    // If we have a stage, show stage label in title. If we have progressMessage, show it in body (not duplicate in title)
    const titleText = currentStage ? getStageInfo(currentStage).label : 'Aicser AI is analyzing...';
    
    return (
        <Card 
            className={`thought-process-card ${isDark ? 'dark' : 'light'}`}
            title={
                <Space>
                    <BulbOutlined />
                    <Text strong className="progress-text-animated" style={{ color: isDark ? '#ffffff' : '#000000' }}>
                        {titleText}
                    </Text>
                    {progressPercentage !== undefined && (
                        <Tag color="blue">{Math.round(progressPercentage)}%</Tag>
                    )}
                </Space>
            }
            size="small"
            style={{ 
                marginBottom: 0,
                border: 'none',
                boxShadow: 'none',
                background: 'transparent'
            }}
            bodyStyle={{ padding: '12px 0' }}
        >
            <Space direction="vertical" style={{ width: '100%' }} size="small">
                {/* Only show stage tag if it's different from title (avoid duplicate "Starting Analysis") */}
                {stageInfo && stageInfo.label !== titleText && (
                    <Tag icon={stageInfo.icon} color={stageInfo.color} style={{ marginBottom: 8 }}>
                        {stageInfo.label}
                    </Tag>
                )}
                {/* Show progress message only if it's different from title to avoid duplication */}
                {progressMessage && progressMessage.toLowerCase() !== titleText.toLowerCase() && (
                    <Text 
                        className="progress-text-animated"
                        style={{ 
                            color: isDark ? '#d9d9d9' : '#595959',
                            fontSize: 13,
                            display: 'block',
                            marginBottom: progressPercentage !== undefined ? 8 : 0,
                            fontWeight: 500
                        }}
                    >
                        {progressMessage}
                    </Text>
                )}
                {progressPercentage !== undefined && (
                    <div style={{ width: '100%', marginTop: 4 }}>
                        <div 
                            style={{
                                width: `${Math.min(100, Math.max(0, progressPercentage))}%`,
                                height: 4,
                                backgroundColor: '#1890ff',
                                borderRadius: 2,
                                transition: 'width 0.3s ease'
                            }}
                        />
                    </div>
                )}
            </Space>
        </Card>
    );
};

export default ThoughtProcessDisplay;

