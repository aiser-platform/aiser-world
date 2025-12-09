import React, { useState, useEffect, useRef } from 'react';
import { message as antMessage } from 'antd';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { IChatMessage } from '../../types';

interface StreamingHandlerProps {
    query: string;
    conversationId?: string;
    dataSourceId?: string;
    onComplete: (message: IChatMessage) => void;
    onError: (error: string) => void;
    onProgress: (progress: { percentage: number; message: string; stage: string }) => void;
}

export const useStreamingHandler = ({
    query,
    conversationId,
    dataSourceId,
    onComplete,
    onError,
    onProgress
}: StreamingHandlerProps) => {
    const [isStreaming, setIsStreaming] = useState(false);
    const [partialMessage, setPartialMessage] = useState<Partial<IChatMessage> | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    
    const startStreaming = async () => {
        setIsStreaming(true);
        abortControllerRef.current = new AbortController();
        
        try {
            const response = await fetch('/ai/chat/analyze/stream', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query,
                    conversation_id: conversationId,
                    data_source_id: dataSourceId
                }),
                signal: abortControllerRef.current.signal
            });
            
            if (!response.ok || !response.body) {
                throw new Error('Streaming not supported or request failed');
            }
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            
            // Initialize partial message
            const messageId = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
            let currentMessage: Partial<IChatMessage> = {
                id: messageId,
                role: 'assistant',
                created_at: new Date(),
                content: '',
                message: '',
                isStreaming: true
            };
            
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                    if (!line.trim() || !line.startsWith('data: ')) continue;
                    
                    try {
                        const eventData = JSON.parse(line.slice(6));
                        
                        switch (eventData.type) {
                            case 'progress':
                                // CRITICAL: Use progress object if available, otherwise use top-level fields
                                const progressData = eventData.progress || eventData;
                                onProgress({
                                    percentage: progressData.percentage || eventData.percentage || 0,
                                    message: progressData.message || eventData.message || 'Processing...',
                                    stage: progressData.stage || eventData.stage || 'unknown'
                                });
                                // Update partial message with reasoning steps if available
                                const reasoningSteps = eventData.reasoning_steps || 
                                                      eventData.execution_metadata?.reasoning_steps ||
                                                      progressData.reasoning_steps;
                                if (reasoningSteps) {
                                    currentMessage.executionMetadata = {
                                        ...currentMessage.executionMetadata,
                                        reasoning_steps: reasoningSteps
                                    };
                                    setPartialMessage({ ...currentMessage });
                                }
                                break;
                            
                            case 'sql':
                                currentMessage.sqlQuery = eventData.sql_query;
                                currentMessage.message = `Generated SQL query`;
                                setPartialMessage({ ...currentMessage });
                                break;
                            
                            case 'data':
                                currentMessage.queryResult = eventData.query_result;
                                currentMessage.message = `Query executed successfully`;
                                setPartialMessage({ ...currentMessage });
                                break;
                            
                            case 'chart':
                                currentMessage.echartsConfig = eventData.echarts_config;
                                currentMessage.chartConfig = eventData.echarts_config;
                                currentMessage.message = `Chart generated`;
                                setPartialMessage({ ...currentMessage });
                                break;
                            
                            case 'insights':
                                currentMessage.insights = eventData.insights;
                                currentMessage.recommendations = eventData.recommendations;
                                currentMessage.message = eventData.message || 'Analysis complete';
                                currentMessage.content = eventData.message || 'Analysis complete';
                                setPartialMessage({ ...currentMessage });
                                break;
                            
                            case 'complete':
                                // CRITICAL: Ensure all chart data is included in final message
                                currentMessage.isStreaming = false;
                                currentMessage.saved = false;
                                currentMessage.echartsConfig = eventData.echarts_config || eventData.chart_config || currentMessage.echartsConfig;
                                currentMessage.chartConfig = eventData.echarts_config || eventData.chart_config || currentMessage.chartConfig;
                                currentMessage.insights = eventData.insights || currentMessage.insights;
                                currentMessage.recommendations = eventData.recommendations || currentMessage.recommendations;
                                currentMessage.sqlQuery = eventData.sql_query || currentMessage.sqlQuery;
                                currentMessage.queryResult = eventData.query_result || currentMessage.queryResult;
                                currentMessage.executiveSummary = eventData.executive_summary || eventData.executiveSummary || currentMessage.executiveSummary;
                                currentMessage.executive_summary = eventData.executive_summary || currentMessage.executive_summary;
                                // CRITICAL: Include deep_analysis_charts in execution_metadata
                                if (eventData.deep_analysis_charts || eventData.execution_metadata?.deep_analysis_charts) {
                                    currentMessage.executionMetadata = {
                                        ...currentMessage.executionMetadata,
                                        deep_analysis_charts: eventData.deep_analysis_charts || eventData.execution_metadata?.deep_analysis_charts
                                    };
                                }
                                // Also merge any other execution_metadata fields
                                if (eventData.execution_metadata) {
                                    currentMessage.executionMetadata = {
                                        ...currentMessage.executionMetadata,
                                        ...eventData.execution_metadata
                                    };
                                }
                                onComplete(currentMessage as IChatMessage);
                                setPartialMessage(null);
                                setIsStreaming(false);
                                break;
                            
                            case 'error':
                                onError(eventData.message);
                                setIsStreaming(false);
                                setPartialMessage(null);
                                break;
                        }
                    } catch (e) {
                        console.warn('Failed to parse SSE event:', line, e);
                    }
                }
            }
            
        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.log('Streaming aborted by user');
            } else {
                console.error('Streaming failed:', error);
                onError(error.message || 'Streaming failed');
            }
        } finally {
            setIsStreaming(false);
            setPartialMessage(null);
            abortControllerRef.current = null;
        }
    };
    
    const stopStreaming = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    };
    
    return {
        isStreaming,
        partialMessage,
        startStreaming,
        stopStreaming
    };
};

// Markdown renderer component for streaming messages
export const StreamingMessageRenderer: React.FC<{ content: string }> = ({ content }) => {
    return (
        <ReactMarkdown
            components={{
                code({ className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const isInline = !match;
                    return !isInline && match ? (
                        <SyntaxHighlighter
                            style={vscDarkPlus as any}
                            language={match[1]}
                            PreTag="div"
                            {...props}
                        >
                            {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                    ) : (
                        <code className={className} {...props}>
                            {children}
                        </code>
                    );
                }
            }}
        >
            {content}
        </ReactMarkdown>
    );
};

