'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import LoadingScreen from '@/components/LoadingScreen/LoadingScreen';
import { useThemeMode } from '@/components/Providers/ThemeModeContext';
import MonacoSQLEditor from '../dash-studio/components/MonacoSQLEditor';
import { Card, Typography, Alert, Space, Button, Tooltip, Dropdown, Tag, Popover, message } from 'antd';
import { 
  QuestionCircleOutlined, 
  RocketOutlined, 
  BulbOutlined,
  PlayCircleOutlined,
  DatabaseOutlined,
  CloseOutlined,
  InfoCircleOutlined,
  CodeOutlined
} from '@ant-design/icons';
import AnimatedAIAvatar from '@/app/(dashboard)/chat/components/ChatPanel/AnimatedAIAvatar';
import '@/app/(dashboard)/chat/components/ChatPanel/styles.css'; // Import animation CSS

export const dynamic = 'force-dynamic';

const { Title, Text } = Typography;

// Function to generate query templates based on available data source
const generateQueryTemplates = (tableName?: string, schemaName?: string): Array<{
  name: string;
  description: string;
  sql: string;
  icon: string;
}> => {
  // CRITICAL: For file sources, always use 'data' as table name
  const isFileSource = schemaName === 'file';
  const actualTableName = isFileSource ? 'data' : (tableName || 'your_table');
  const schemaPrefix = schemaName && schemaName !== 'public' && schemaName !== 'main' && !isFileSource
    ? `${schemaName}.` 
    : '';
  const fullTableName = isFileSource ? `"${actualTableName}"` : `${schemaPrefix}${actualTableName}`;
  
  return [
    {
      name: 'View All Data',
      description: tableName ? `See all records from ${actualTableName}` : 'See all records from a table',
      sql: `SELECT * FROM ${fullTableName} LIMIT 100;`,
      icon: '👀'
    },
    {
      name: 'Count Records',
      description: tableName ? `Count records in ${actualTableName}` : 'Count how many records are in a table',
      sql: `SELECT COUNT(*) as total_records FROM ${fullTableName};`,
      icon: '🔢'
    },
    {
      name: 'Find Specific Data',
      description: tableName ? `Search ${actualTableName} for specific records` : 'Search for records matching specific criteria',
      sql: `SELECT * FROM ${fullTableName} WHERE column_name = 'value' LIMIT 100;`,
      icon: '🔍'
    },
    {
      name: 'Group and Summarize',
      description: tableName ? `Group and summarize data from ${actualTableName}` : 'Group data and calculate totals',
      sql: `SELECT category, SUM(amount) as total FROM ${fullTableName} GROUP BY category;`,
      icon: '📊'
    },
    {
      name: 'Sort Results',
      description: tableName ? `Sort ${actualTableName} results` : 'Order results by a column',
      sql: `SELECT * FROM ${fullTableName} ORDER BY date_column DESC LIMIT 100;`,
      icon: '⬆️'
    },
    {
      name: 'Join Tables',
      description: 'Combine data from multiple tables',
      sql: isFileSource
        ? `-- File sources use "data" table\n-- For joins, you may need to load multiple files\nSELECT * FROM ${fullTableName} LIMIT 100;`
        : (tableName 
          ? `SELECT a.*, b.name FROM ${fullTableName} a JOIN ${schemaPrefix}other_table b ON a.id = b.id LIMIT 100;`
          : `SELECT a.*, b.name FROM table_a a JOIN table_b b ON a.id = b.id LIMIT 100;`),
      icon: '🔗'
    }
  ];
};

export default function QueryEditorPage() {
  const { isAuthenticated, authLoading } = useAuth();
  const router = useRouter();
  const { isDarkMode } = useThemeMode();
  const [showWelcome, setShowWelcome] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return window.localStorage.getItem('qe_welcome_dismissed') !== 'true';
      } catch {
        return true;
      }
    }
    return true;
  });
  const [editorMode, setEditorMode] = useState<'sql' | 'python'>('sql');
  const [selectedTableName, setSelectedTableName] = useState<string | undefined>();
  const [selectedSchemaName, setSelectedSchemaName] = useState<string | undefined>();

  // Listen for table selection from MonacoSQLEditor
  useEffect(() => {
    const handleTableSelect = (event: CustomEvent) => {
      if (event.detail?.tableName) {
        setSelectedTableName(event.detail.tableName);
        setSelectedSchemaName(event.detail.schemaName);
      }
    };

    window.addEventListener('table-selected', handleTableSelect as EventListener);
    return () => {
      window.removeEventListener('table-selected', handleTableSelect as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleDismissWelcome = () => {
    setShowWelcome(false);
    try {
      window.localStorage.setItem('qe_welcome_dismissed', 'true');
    } catch {
      // ignore storage errors
    }
  };

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <LoadingScreen />;
  }

  return (
    <div className="page-wrapper" style={{ paddingLeft: '24px', paddingRight: '0', paddingTop: '24px', paddingBottom: '24px' }}>
        <div className="page-header" style={{ zIndex: 998, position: 'sticky', top: 0, background: 'var(--ant-color-bg-layout)', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)', marginBottom: '24px' }}>
          <div className="page-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '16px' }}>
            <Title level={2} className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 0, flex: '0 0 auto' }}>
              <CodeOutlined style={{ color: 'var(--ant-color-primary)', fontSize: '24px', flexShrink: 0 }} />
              <span style={{ flexShrink: 0 }}>Query Editor</span>
              {editorMode === 'python' && (
                <Tag color="orange" icon={<CodeOutlined />} style={{ margin: 0, flexShrink: 0, marginLeft: '4px' }}>
                  Python Mode
                </Tag>
              )}
            </Title>
            <Space size="large" style={{ flex: '0 0 auto', marginLeft: 'auto' }}>
                  {/* Templates Popover - Separate from dropdown to allow clicking without closing */}
                  <Popover
                    content={
                      <div style={{ width: '320px' }}>
                        <div style={{ 
                          fontWeight: 600, 
                          marginBottom: '12px',
                          color: 'var(--ant-color-text)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <BulbOutlined style={{ color: 'var(--ant-color-primary)' }} />
                          Query Templates
                          {selectedTableName && (
                            <Tag 
                              color="blue" 
                              style={{ 
                                marginLeft: '4px', 
                                fontSize: '10px',
                                height: '20px',
                                lineHeight: '18px',
                                padding: '0 6px'
                              }}
                            >
                              {selectedTableName}
                            </Tag>
                          )}
                        </div>
                        <div className="data-content" style={{ 
                          maxHeight: '300px', 
                          overflowY: 'auto',
                          padding: '4px 0'
                        }}>
                          {generateQueryTemplates(selectedTableName, selectedSchemaName).map((template, index) => (
                            <div
                              key={index}
                              onClick={(e) => {
                                e.stopPropagation();
                                // Dispatch event to load template
                                const event = new CustomEvent('load-query-template', { 
                                  detail: { sql: template.sql } 
                                });
                                window.dispatchEvent(event);
                                message.success(`Template "${template.name}" loaded!`);
                              }}
                              style={{
                                padding: '12px',
                                margin: '6px 0',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                background: isDarkMode 
                                  ? 'rgba(255, 255, 255, 0.05)' 
                                  : 'var(--ant-color-fill-quaternary, #f5f5f5)',
                                border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)'}`,
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = isDarkMode 
                                  ? 'rgba(37, 99, 235, 0.2)' 
                                  : 'var(--ant-color-primary-bg, #e6f4ff)';
                                e.currentTarget.style.borderColor = 'var(--ant-color-primary, #1890ff)';
                                e.currentTarget.style.transform = 'translateX(2px)';
                                e.currentTarget.style.boxShadow = isDarkMode 
                                  ? '0 2px 8px rgba(37, 99, 235, 0.2)' 
                                  : '0 2px 8px rgba(24, 144, 255, 0.15)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = isDarkMode 
                                  ? 'rgba(255, 255, 255, 0.05)' 
                                  : 'var(--ant-color-fill-quaternary, #f5f5f5)';
                                e.currentTarget.style.borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)';
                                e.currentTarget.style.transform = 'translateX(0)';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '20px', lineHeight: 1 }}>{template.icon}</span>
                                <div style={{ flex: 1 }}>
                                  <div style={{ 
                                    fontWeight: 600, 
                                    fontSize: '14px',
                                    color: 'var(--ant-color-text)',
                                    marginBottom: '4px'
                                  }}>
                                    {template.name}
                                  </div>
                                  <div style={{ 
                                    fontSize: '12px', 
                                    color: 'var(--ant-color-text-secondary)',
                                    lineHeight: '1.5'
                                  }}>
                                    {template.description}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    }
                    title={null}
                    trigger="click"
                    placement="bottomRight"
                    overlayStyle={{ maxWidth: '360px' }}
                  >
                    <Tooltip title="Query Templates">
                      <Button 
                        type="text"
                        icon={<BulbOutlined />}
                        style={{ 
                          fontSize: '18px',
                          width: '36px',
                          height: '36px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--ant-color-text)',
                          borderRadius: '6px'
                        }}
                      />
                    </Tooltip>
                  </Popover>

                  {/* Help Dropdown */}
                  <Dropdown
                    menu={{
                      items: [
                        {
                          key: 'tips',
                          label: (
                            <div>
                              <div style={{ 
                                fontWeight: 600, 
                                marginBottom: '16px',
                                color: 'var(--ant-color-text)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                fontSize: '15px'
                              }}>
                                <QuestionCircleOutlined style={{ color: 'var(--ant-color-primary)', fontSize: '16px' }} />
                                Quick Tips
                              </div>
                              <div style={{ 
                                fontSize: '13px', 
                                color: 'var(--ant-color-text)',
                                lineHeight: '1.7'
                              }}>
                                <div style={{ 
                                  marginBottom: '16px',
                                  marginTop: '12px',
                                  padding: '18px',
                                  background: isDarkMode 
                                    ? 'linear-gradient(135deg, rgba(24, 144, 255, 0.2) 0%, rgba(24, 144, 255, 0.12) 100%)' 
                                    : 'linear-gradient(135deg, rgba(24, 144, 255, 0.15) 0%, rgba(24, 144, 255, 0.08) 100%)',
                                  borderRadius: '12px',
                                  border: `2px solid ${isDarkMode ? 'rgba(24, 144, 255, 0.4)' : 'rgba(24, 144, 255, 0.3)'}`,
                                  boxShadow: isDarkMode 
                                    ? '0 4px 12px rgba(24, 144, 255, 0.15)' 
                                    : '0 4px 12px rgba(24, 144, 255, 0.12)',
                                  position: 'relative',
                                  zIndex: 1
                                }}>
                                  <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '14px',
                                    marginBottom: '12px'
                                  }}>
                                    <Tooltip title="Aicser AI Assistant - Ask questions in plain language to generate SQL queries">
                                      <AnimatedAIAvatar size={32} isSpeaking={true} />
                                    </Tooltip>
                                    <Text strong style={{ 
                                      color: 'var(--ant-color-primary)', 
                                      fontSize: '18px',
                                      fontWeight: 700,
                                      letterSpacing: '0.2px'
                                    }}>
                                      Aicser AI Assistant
                                    </Text>
                                  </div>
                                  <div style={{ 
                                    color: 'var(--ant-color-text)', 
                                    fontSize: '15px',
                                    display: 'block',
                                    lineHeight: '1.75',
                                    paddingLeft: '46px',
                                    fontWeight: 400
                                  }}>
                                    Describe what you want to find in your data, and AI will generate the SQL query for you. Example: "Show me sales from last month" or "What are the top 10 products?"
                                  </div>
                                </div>
                                <div style={{ 
                                  marginBottom: '12px',
                                  padding: '12px 14px',
                                  background: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'var(--ant-color-fill-quaternary, #f5f5f5)',
                                  borderRadius: '8px',
                                  border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)'}`
                                }}>
                                  <Text strong style={{ color: 'var(--ant-color-text)', display: 'block', marginBottom: '6px', fontSize: '13px' }}>📊 Explore Data:</Text>
                                  <span style={{ color: 'var(--ant-color-text-secondary)', fontSize: '13px', lineHeight: '1.6' }}>
                                    Click tables/columns in the sidebar to generate queries.
                                  </span>
                                </div>
                                <div style={{ 
                                  padding: '12px 14px',
                                  background: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'var(--ant-color-fill-quaternary, #f5f5f5)',
                                  borderRadius: '8px',
                                  border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)'}`
                                }}>
                                  <Text strong style={{ color: 'var(--ant-color-text)', display: 'block', marginBottom: '6px', fontSize: '13px' }}>▶️ Run Query:</Text>
                                  <span style={{ color: 'var(--ant-color-text-secondary)', fontSize: '13px', lineHeight: '1.6' }}>
                                    Press <Tag style={{ fontSize: '11px', margin: '0 3px', height: '20px', lineHeight: '18px', padding: '0 6px' }}>Ctrl+Enter</Tag> or click Run.
                                  </span>
                                </div>
                              </div>
                            </div>
                          ),
                        },
                        {
                          type: 'divider',
                        },
                        {
                          key: 'python',
                          label: (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span>
                                <CodeOutlined style={{ marginRight: '8px' }} />
                                Python Notebook
                              </span>
                              <Tag color={editorMode === 'python' ? 'green' : 'default'}>
                                {editorMode === 'python' ? 'Active' : 'Available'}
                              </Tag>
                            </div>
                          ),
                          onClick: () => {
                            setEditorMode(editorMode === 'python' ? 'sql' : 'python');
                          }
                        }
                      ]
                    }}
                    placement="bottomRight"
                    trigger={['click']}
                  >
                    <Tooltip title="Help & Options">
                      <Button 
                        type="text"
                        icon={<QuestionCircleOutlined />}
                        style={{ 
                          fontSize: '18px',
                          width: '36px',
                          height: '36px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--ant-color-text)',
                          borderRadius: '6px'
                        }}
                      />
                    </Tooltip>
                  </Dropdown>
                  {showWelcome && (
                    <Button 
                      type="text" 
                      icon={<CloseOutlined />}
                      onClick={handleDismissWelcome}
                      title="Dismiss welcome message"
                    />
                  )}
                </Space>
          </div>
        </div>

        {/* Compact Welcome Alert - Ensure visible below header */}
        {showWelcome && (
          <div style={{ padding: '16px 24px', paddingTop: '16px', marginTop: 0, position: 'relative', zIndex: 1 }}>
            <Alert
              message={
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--ant-color-text)', lineHeight: '1.6' }}>
                  <InfoCircleOutlined style={{ color: 'var(--ant-color-primary)', fontSize: '18px', flexShrink: 0 }} />
                  <span><strong style={{ color: 'var(--ant-color-text)', fontSize: '14px' }}>New to SQL?</strong> Use <strong style={{ color: 'var(--ant-color-primary)', fontSize: '14px' }}>Aicser AI Assistant</strong> (💡 in Help menu) or click the <BulbOutlined style={{ margin: '0 5px', color: 'var(--ant-color-primary)', fontSize: '16px' }} /> icon for templates.</span>
                </div>
              }
              type="info"
              showIcon={false}
              closable
              onClose={handleDismissWelcome}
              style={{ 
                marginTop: 0,
                marginBottom: 0,
                borderRadius: '8px',
                background: isDarkMode 
                  ? 'rgba(24, 144, 255, 0.15)' 
                  : 'var(--ant-color-info-bg, #e6f7ff)',
                border: `1px solid ${isDarkMode ? 'rgba(24, 144, 255, 0.4)' : 'var(--ant-color-info-border, #91d5ff)'}`,
                padding: '14px 18px'
              }}
            />
          </div>
        )}

        <div
          className="page-body"
          style={{ 
            '--page-body-gap': '0px',
            flex: 1,
            minHeight: 0,
            maxHeight: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: 'var(--ant-color-bg-layout)',
            marginTop: 0,
            paddingTop: 0,
            position: 'relative',
            zIndex: 1
          } as React.CSSProperties}
        >
            {/* Query Editor - Maximized Space */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                maxHeight: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                padding: 0,
                margin: 0,
                background: 'var(--ant-color-bg-layout)',
                border: 'none',
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              {editorMode === 'sql' ? (
                <div style={{ 
                  flex: 1, 
                  minHeight: 0, 
                  maxHeight: '100%', 
                  height: '100%', 
                  display: 'flex', 
                  width: '100%',
                  margin: 0,
                  padding: 0,
                  overflow: 'hidden',
                  boxSizing: 'border-box'
                }}>
                  <MonacoSQLEditor isDarkMode={isDarkMode} />
                </div>
              ) : (
                <Card
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'var(--ant-color-bg-container)',
                    border: `1px solid ${isDarkMode ? 'var(--ant-color-border)' : 'var(--ant-color-border-secondary)'}`
                  }}
                  bodyStyle={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '16px',
                    overflow: 'hidden'
                  }}
                >
                  <Alert
                    message="Python Notebook Mode"
                    description={
                      <div>
                        <p style={{ color: 'var(--ant-color-text)', marginBottom: '8px' }}>
                          Python notebook support is coming soon! This will allow you to:
                        </p>
                        <ul style={{ 
                          margin: '8px 0', 
                          paddingLeft: '20px',
                          color: 'var(--ant-color-text-secondary)'
                        }}>
                          <li>Write Python code to analyze your data</li>
                          <li>Use pandas, numpy, and other data science libraries</li>
                          <li>Create visualizations with matplotlib, seaborn, or plotly</li>
                          <li>Access your connected data sources directly</li>
                        </ul>
                        <p style={{ marginTop: '12px' }}>
                          <Button 
                            type="link" 
                            onClick={() => setEditorMode('sql')}
                            style={{ padding: 0 }}
                          >
                            Switch back to SQL Editor
                          </Button>
                        </p>
                      </div>
                    }
                    type="info"
                    showIcon
                    style={{ 
                      marginBottom: '16px',
                      background: isDarkMode 
                        ? 'rgba(24, 144, 255, 0.1)' 
                        : 'var(--ant-color-info-bg)',
                      border: `1px solid ${isDarkMode ? 'rgba(24, 144, 255, 0.3)' : 'var(--ant-color-info-border)'}`
                    }}
                  />
                  <div style={{
                    flex: 1,
                    border: `1px solid ${isDarkMode ? 'var(--ant-color-border, #404040)' : 'var(--ant-color-border-secondary, #e8e8e8)'}`,
                    borderRadius: '8px',
                    padding: '24px',
                    background: isDarkMode 
                      ? 'rgba(255, 255, 255, 0.03)' 
                      : 'var(--ant-color-bg-layout, #f5f5f5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--ant-color-text-secondary)'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <CodeOutlined style={{ 
                        fontSize: '48px', 
                        marginBottom: '16px', 
                        opacity: isDarkMode ? 0.5 : 0.4,
                        color: isDarkMode ? 'var(--ant-color-text-tertiary, #8c8c8c)' : 'var(--ant-color-text-tertiary, #8c8c8c)'
                      }} />
                      <div style={{ 
                        fontSize: '16px',
                        color: 'var(--ant-color-text)',
                        marginBottom: '4px',
                        fontWeight: 500
                      }}>
                        Python Notebook Editor
                      </div>
                      <div style={{ 
                        fontSize: '12px', 
                        marginTop: '8px',
                        color: 'var(--ant-color-text-secondary)'
                      }}>
                        Coming soon...
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
        </div>
      </div>
  );
}

