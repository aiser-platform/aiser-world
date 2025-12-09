/**
 * Deep Analysis Report Component
 * Displays comprehensive analysis results with multiple charts, insights, and recommendations
 * in a structured report format with carousel navigation
 */

import React, { useState } from 'react';
import { Card, Carousel, Tabs, Typography, Tag, Space, Button, Divider, Empty } from 'antd';
import { LeftOutlined, RightOutlined, BarChartOutlined, BulbOutlined, RiseOutlined } from '@ant-design/icons';
import ChartMessage from './ChartMessage';
import './DeepAnalysisReport.css';

const { Title, Text, Paragraph } = Typography;

interface DeepAnalysisReportProps {
    messageId: string;
    charts: any[];
    insights: any[];
    recommendations: any[];
    executiveSummary: string;
    isDark: boolean;
    planType?: string;
    conversationId?: string;
    selectedDataSourceId?: string;
    queryResults?: any[];
}

const DeepAnalysisReport: React.FC<DeepAnalysisReportProps> = ({
    messageId,
    charts,
    insights,
    recommendations,
    executiveSummary,
    isDark,
    planType,
    conversationId,
    selectedDataSourceId,
    queryResults
}) => {
    const [currentChartIndex, setCurrentChartIndex] = useState(0);
    const carouselRef = React.useRef<any>(null);

    const handlePrevChart = () => {
        if (carouselRef.current) {
            carouselRef.current.prev();
        }
    };

    const handleNextChart = () => {
        if (carouselRef.current) {
            carouselRef.current.next();
        }
    };

    return (
        <div className={`deep-analysis-report ${isDark ? 'dark' : 'light'}`} style={{ marginTop: 16 }}>
            {/* Executive Summary Section */}
            {executiveSummary && (
                <Card 
                    className="executive-summary-card" 
                    style={{ 
                        marginBottom: 16,
                        border: 'none',
                        boxShadow: 'none',
                        background: 'transparent'
                    }}
                >
                    <Title level={4} className="section-title" style={{ marginBottom: 12 }}>
                        <BulbOutlined style={{ marginRight: 8 }} />
                        Executive Summary
                    </Title>
                    <Paragraph className="executive-summary-text" style={{ marginBottom: 0 }}>
                        {executiveSummary}
                    </Paragraph>
                </Card>
            )}

            {/* Charts Carousel Section */}
            {charts && charts.length > 0 && (
                <Card 
                    className="charts-section-card" 
                    style={{ 
                        marginBottom: 16,
                        border: 'none',
                        boxShadow: 'none',
                        background: 'transparent'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <Title level={4} className="section-title" style={{ marginBottom: 0 }}>
                            <BarChartOutlined style={{ marginRight: 8 }} />
                            Visualizations ({charts.length})
                        </Title>
                        {charts.length > 1 && (
                            <Space>
                                <Button
                                    icon={<LeftOutlined />}
                                    onClick={handlePrevChart}
                                    disabled={currentChartIndex === 0}
                                    size="small"
                                />
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {currentChartIndex + 1} / {charts.length}
                                </Text>
                                <Button
                                    icon={<RightOutlined />}
                                    onClick={handleNextChart}
                                    disabled={currentChartIndex === charts.length - 1}
                                    size="small"
                                />
                            </Space>
                        )}
                    </div>
                    <Carousel
                        ref={carouselRef}
                        dots={charts.length > 1}
                        beforeChange={(from, to) => setCurrentChartIndex(to)}
                        className="chart-carousel"
                    >
                        {charts.map((chartConfig, index) => (
                            <div key={`chart-${index}`} className="chart-slide">
                                <ChartMessage
                                    messageId={`${messageId}-chart-${index}`}
                                    config={chartConfig}
                                    isDark={isDark}
                                    planType={planType}
                                    conversationId={conversationId}
                                    selectedDataSourceId={selectedDataSourceId}
                                    queryResult={queryResults?.[index]}
                                />
                            </div>
                        ))}
                    </Carousel>
                </Card>
            )}

            {/* Insights Section */}
            {insights && insights.length > 0 && (
                <Card 
                    className="insights-section-card" 
                    style={{ 
                        marginBottom: 16,
                        border: 'none',
                        boxShadow: 'none',
                        background: 'transparent'
                    }}
                >
                    <Title level={4} className="section-title" style={{ marginBottom: 12 }}>
                        <BulbOutlined style={{ marginRight: 8 }} />
                        Key Insights ({insights.length})
                    </Title>
                    <div className="insights-list">
                        {insights.map((insight, index) => (
                            <Card
                                key={`insight-${index}`}
                                size="small"
                                style={{ marginBottom: 12, backgroundColor: isDark ? '#1f1f1f' : '#fafafa' }}
                            >
                                <Space direction="vertical" style={{ width: '100%' }} size="small">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                        <Title level={5} style={{ margin: 0, color: isDark ? '#ffffff' : '#000000' }}>
                                            {insight.title || `Insight ${index + 1}`}
                                        </Title>
                                        {insight.confidence && (
                                            <Tag color={insight.confidence > 0.8 ? 'green' : insight.confidence > 0.6 ? 'orange' : 'red'}>
                                                {Math.round(insight.confidence * 100)}% confidence
                                            </Tag>
                                        )}
                                    </div>
                                    <Text style={{ color: isDark ? '#d9d9d9' : '#595959' }}>
                                        {insight.description || insight}
                                    </Text>
                                    {insight.impact && (
                                        <Tag color={insight.impact === 'high' ? 'red' : insight.impact === 'medium' ? 'orange' : 'blue'}>
                                            {insight.impact} impact
                                        </Tag>
                                    )}
                                </Space>
                            </Card>
                        ))}
                    </div>
                </Card>
            )}

            {/* Recommendations Section */}
            {recommendations && recommendations.length > 0 && (
                <Card 
                    className="recommendations-section-card"
                    style={{ 
                        border: 'none',
                        boxShadow: 'none',
                        background: 'transparent'
                    }}
                >
                    <Title level={4} className="section-title" style={{ marginBottom: 12 }}>
                        <RiseOutlined style={{ marginRight: 8 }} />
                        Recommendations ({recommendations.length})
                    </Title>
                    <div className="recommendations-list">
                        {recommendations.map((rec, index) => (
                            <Card
                                key={`rec-${index}`}
                                size="small"
                                style={{ marginBottom: 12, backgroundColor: isDark ? '#1f1f1f' : '#fafafa' }}
                            >
                                <Space direction="vertical" style={{ width: '100%' }} size="small">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                        <Title level={5} style={{ margin: 0, color: isDark ? '#ffffff' : '#000000' }}>
                                            {rec.title || rec.action || `Recommendation ${index + 1}`}
                                        </Title>
                                        {rec.priority && (
                                            <Tag color={rec.priority === 'high' ? 'red' : rec.priority === 'medium' ? 'orange' : 'blue'}>
                                                {rec.priority} priority
                                            </Tag>
                                        )}
                                    </div>
                                    <Text style={{ color: isDark ? '#d9d9d9' : '#595959' }}>
                                        {rec.description || rec.rationale || rec}
                                    </Text>
                                    {rec.expected_impact && (
                                        <Tag color={rec.expected_impact === 'high' ? 'green' : rec.expected_impact === 'medium' ? 'orange' : 'default'}>
                                            {rec.expected_impact} impact expected
                                        </Tag>
                                    )}
                                </Space>
                            </Card>
                        ))}
                    </div>
                </Card>
            )}

            {(!charts || charts.length === 0) && (!insights || insights.length === 0) && (!recommendations || recommendations.length === 0) && (
                <Empty description="No analysis results available" />
            )}
        </div>
    );
};

export default DeepAnalysisReport;

