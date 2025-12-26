'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Card, 
    Tree, 
    Select, 
    Button, 
    Space, 
    Typography, 
    Tag, 
    Tooltip, 
    Spin, 
    Empty, 
    Collapse,
    Badge,
    Divider,
    Alert,
    Checkbox,
    Popconfirm
} from 'antd';
import {
    DatabaseOutlined,
    TableOutlined,
    FileTextOutlined,
    CloudOutlined,
    ApiOutlined,
    EyeOutlined,
    ReloadOutlined,
    PlusOutlined,
    InfoCircleOutlined,
    CheckCircleOutlined,
    CloseOutlined,
    DeleteOutlined,
    CompressOutlined
} from '@ant-design/icons';
import UniversalDataSourceModal from '@/app/components/UniversalDataSourceModal/UniversalDataSourceModal';
import SchemaTree from './SchemaTree';
import FileSchemaTree from './FileSchemaTree';
import SchemaSelect from './SchemaSelect';
import TableViewSelect from './TableViewSelect';
import './styles.css';
import '../HistoryPanel/styles.css';
import { getBackendUrlForApi } from '@/utils/backendUrl';
import { useAuth } from '@/context/AuthContext';
import { useDataSources, DataSource as ContextDataSource, SchemaInfo as ContextSchemaInfo } from '@/context/DataSourceContext';

const { Title, Text } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

interface DataSource {
    id: string;
    name: string;
    type: 'file' | 'database' | 'warehouse' | 'api' | 'cube';
    status: 'connected' | 'disconnected' | 'error';
    config: Record<string, any>;
    metadata?: Record<string, any>;
    lastUsed?: string;
    rowCount?: number;
    columns?: string[];
    size?: string;
}

interface SchemaInfo {
    tables?: Array<{
        name: string;
        schema?: string;
        columns: Array<{
            name: string;
            type: string;
            nullable: boolean;
            primary_key?: boolean;
            unique?: boolean;
            foreign_key?: string;
            default?: string;
        }>;
        rowCount?: number;
        description?: string;
    }>;
    views?: Array<{
        name: string;
        schema?: string;
        columns: Array<{
            name: string;
            type: string;
            nullable?: boolean;
        }>;
        description?: string;
    }>;
    schemas?: string[];
    // Cube.js specific schema
    cubes?: Array<{
        name: string;
        title: string;
        description?: string;
        dimensions: Array<{
            name: string;
            title: string;
            type: string;
            sql?: string;
        }>;
        measures: Array<{
            name: string;
            title: string;
            type: string;
            sql?: string;
            format?: string;
            shortTitle?: string;
        }>;
        segments?: Array<{
            name: string;
            title: string;
            sql: string;
        }>;
        preAggregations?: Array<{
            name: string;
            type: string;
            timeDimension?: string;
            granularity?: string;
        }>;
    }>;
    // Add metadata for Cube.js
    metadata?: {
        total_cubes: number;
        total_dimensions: number;
        total_measures: number;
        has_time_dimensions: boolean;
        has_pre_aggregations: boolean;
    };
    // Enhanced database schema
    database_info?: {
        name: string;
        type: string;
        host: string;
        port: number;
        username: string;
    };
    warning?: string;
    error?: string; // Added for error state
}

interface EnhancedDataPanelProps {
    onCollapse?: () => void;
    onTableClick?: (tableName: string, schemaName: string, dataSource: DataSource) => void; // Callback when table is clicked
    onColumnClick?: (tableName: string, columnName: string, schemaName: string, dataSource: DataSource) => void; // Callback when column is clicked
    compact?: boolean;
}

const EnhancedDataPanel: React.FC<EnhancedDataPanelProps> = ({
    onTableClick,
    onColumnClick,
    onCollapse,
    compact = false
}) => {
    const { session } = useAuth();
    const { 
        dataSources: contextDataSources,
        selectedDataSourceId,
        getSelectedDataSource,
        selectDataSource: contextSelectDataSource,
        deleteDataSource: contextDeleteDataSource,
        getDataSourceSchema,
        refreshDataSources
    } = useDataSources();
    
    // Helper functions to access context DataSource properties
    const getDataSourceStatus = (ds: ContextDataSource): 'connected' | 'disconnected' | 'error' => {
        if (ds.connection_status === 'connected') return 'connected';
        if (ds.connection_status === 'failed') return 'error';
        return 'disconnected';
    };
    
    const getDataSourceConfig = (ds: ContextDataSource): Record<string, any> => {
        return ds.connection_config || {};
    };
    
    const getDataSourceSize = (ds: ContextDataSource): string => {
        return ds.size?.toString() || '';
    };
    
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [schemaLoading, setSchemaLoading] = useState<string | null>(null);
    const [schemas, setSchemas] = useState<Record<string, ContextSchemaInfo>>({});
    const [includeFiles, setIncludeFiles] = useState<boolean>(true);
    const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
    const [selectedSchemaName, setSelectedSchemaName] = useState<string>('public');
    const [selectedEntityKey, setSelectedEntityKey] = useState<string>('');
    const [newlyCreatedDataSourceId, setNewlyCreatedDataSourceId] = useState<string | null>(null);

    const handleDeleteDataSource = async (dataSourceId: string) => {
        try {
            setLoading(true);
            await contextDeleteDataSource(dataSourceId);
        } catch (e) {
            console.error('Failed to delete data source:', e);
        } finally {
            setLoading(false);
        }
    };

    // Use context's refreshDataSources instead of local loadDataSources
    const loadDataSources = async () => {
        await refreshDataSources();
    };

    // hydrate includeFiles from localStorage
    useEffect(() => {
        try {
            const raw = localStorage.getItem('chat_include_files');
            if (raw !== null) setIncludeFiles(raw === '1');
        } catch {}
    }, []);
    
    // persist includeFiles
    useEffect(() => {
        try { localStorage.setItem('chat_include_files', includeFiles ? '1' : '0'); } catch {}
    }, [includeFiles]);

    // Auto-expand public schema by default
    // useEffect(() => {
    //     if (dataSources.length > 0) {
    //         const defaultExpandedKeys = dataSources
    //             .filter(ds => ds.type === 'database')
    //             .map(ds => `${ds.id}_public`);
    //         setExpandedKeys(prev => Array.from(new Set([...prev, ...defaultExpandedKeys])));
    //     }
    // }, [dataSources]);

    const loadSchemaInfo = async (dataSourceId: string, dataSource: ContextDataSource) => {
        // Always load schema (even if cached) when called from useEffect
        // This ensures schema is loaded when data source is restored from localStorage
        // Only skip if currently loading the same source
        if (schemaLoading === dataSourceId) {
            console.log('⏭️ Schema already loading for:', dataSourceId);
            return;
        }
        
        setSchemaLoading(dataSourceId);
        try {
            if (dataSource.type === 'file') {
                // For file sources, get schema from the schema endpoint (uses 'data' table name)
                const headers: Record<string, string> = {};
                if (session?.access_token) {
                    headers['Authorization'] = `Bearer ${session.access_token}`;
                }
                const response = await fetch(`/api/data/sources/${dataSourceId}/schema`, {
                    headers,
                    credentials: 'include'
                });
                const result = await response.json();
                
                if (result.success && result.schema) {
                    const schemaData = result.schema;
                    // File sources use 'data' as table name in DuckDB
                    const fileTable = schemaData.tables?.[0] || {
                        name: 'data', // CRITICAL: Use 'data' as table name for file sources
                        columns: [],
                        rowCount: dataSource.row_count || schemaData.row_count || 0
                    };
                    
                    setSchemas(prev => ({
                        ...prev,
                        [dataSourceId]: {
                            tables: [fileTable],
                            schemas: ['file']
                        }
                    }));
                } else {
                    // Fallback: use metadata from data source
                    setSchemas(prev => ({
                        ...prev,
                        [dataSourceId]: {
                            tables: [{
                                name: 'data', // CRITICAL: Use 'data' as table name
                                columns: [],
                                rowCount: dataSource.row_count || 0
                            }],
                            schemas: ['file']
                        }
                    }));
                }
            } else if (dataSource.type === 'database' || dataSource.type === 'warehouse') {
                // For database and warehouse sources, get real schema information
                const headers: Record<string, string> = {};
                if (session?.access_token) {
                    headers['Authorization'] = `Bearer ${session.access_token}`;
                }
                const response = await fetch(`/api/data/sources/${dataSourceId}/schema`, {
                    headers,
                    credentials: 'include'
                });
                const result = await response.json();
                
                console.log(`📊 Schema response for ${dataSourceId}:`, {
                    success: result.success,
                    hasSchema: !!result.schema,
                    tablesCount: result.schema?.tables?.length || 0,
                    schemasCount: result.schema?.schemas?.length || 0,
                    schema: result.schema
                });
                
                if (result.success) {
                    const baseSchema: SchemaInfo = result.schema;
                    
                    // Ensure schema has proper structure
                    if (!baseSchema.tables) {
                        baseSchema.tables = [];
                    }
                    if (!baseSchema.schemas) {
                        baseSchema.schemas = [];
                    }
                    
                    // Fetch views
                    try {
                        const vres = await fetch(`${getBackendUrlForApi()}/data/sources/${dataSourceId}/views`);
                        if (vres.ok) {
                            const vj = await vres.json();
                            baseSchema.views = (vj.views || []).map((v: any) => ({
                                name: v.name,
                                schema: v.schema,
                                columns: (v.columns || []).map((c: any) => ({ name: c.name, type: c.type, nullable: c.nullable }))
                            }));
                        }
                    } catch {}
                    
                    console.log(`✅ Setting schema for ${dataSourceId}:`, {
                        tables: baseSchema.tables?.length || 0,
                        schemas: baseSchema.schemas?.length || 0
                    });
                    
                    setSchemas(prev => ({
                        ...prev,
                        [dataSourceId]: baseSchema
                    }));
                } else {
                    console.error(`Failed to load ${dataSource.type} schema:`, result.error);
                    // Fallback to basic schema info
                    setSchemas(prev => ({
                        ...prev,
                        [dataSourceId]: {
                            schemas: ['public'],
                            tables: [{
                                name: 'schema_loading_failed',
                                columns: [
                                    { name: 'error', type: 'text', nullable: true }
                                ],
                                rowCount: 0
                            }]
                        }
                    }));
                }
            } else if (dataSource.type === 'cube') {
                // For Cube.js sources, get schema from Cube.js API
                try {
                    const cubeResponse = await fetch(`http://localhost:4000/cubejs-api/v1/meta`);
                    const cubeResult = await cubeResponse.json();
                    
                                         if (cubeResult.cubes && Array.isArray(cubeResult.cubes)) {
                         // Calculate totals from real data
                         const totalDimensions = cubeResult.cubes.reduce((sum: number, cube: any) => sum + (cube.dimensions?.length || 0), 0);
                         const totalMeasures = cubeResult.cubes.reduce((sum: number, cube: any) => sum + (cube.measures?.length || 0), 0);
                         const hasTimeDimensions = cubeResult.cubes.some((cube: any) =>
                             cube.dimensions?.some((dim: any) => dim.type === 'time')
                         );
                         const hasPreAggregations = cubeResult.cubes.some((cube: any) => 
                             cube.preAggregations && cube.preAggregations.length > 0
                         );
                        
                        setSchemas(prev => ({
                            ...prev,
                            [dataSourceId]: {
                                cubes: cubeResult.cubes || [],
                                metadata: {
                                    total_cubes: cubeResult.cubes.length,
                                    total_dimensions: totalDimensions,
                                    total_measures: totalMeasures,
                                    has_time_dimensions: hasTimeDimensions,
                                    has_pre_aggregations: hasPreAggregations
                                }
                            }
                        }));
                    } else {
                        throw new Error('Invalid Cube.js schema format');
                    }
                } catch (cubeError) {
                    console.error('Failed to load Cube.js schema:', cubeError);
                    // Show error in schema
                    setSchemas(prev => ({
                        ...prev,
                        [dataSourceId]: {
                            cubes: [],
                            metadata: {
                                total_cubes: 0,
                                total_dimensions: 0,
                                total_measures: 0,
                                has_time_dimensions: false,
                                has_pre_aggregations: false
                            },
                            error: 'Failed to load Cube.js schema'
                        }
                    }));
                }
            }
        } catch (error) {
            console.error('Failed to load schema info:', error);
        } finally {
            setSchemaLoading(null);
        }
    };

    const handleDataSourceSelect = async (dataSource: ContextDataSource) => {
        console.log('🎯 Data source selected via click:', dataSource);
        
        // Clear loading state for previous source
        setSchemaLoading(null);
        try {
            // Use context's selectDataSource - this is the ONLY place selection happens (single source of truth)
            await contextSelectDataSource(dataSource.id);
            
            // Load schema info if not already cached (for file sources or additional schema details)
            const cachedSchema = getDataSourceSchema(dataSource.id);
            if (!cachedSchema && (dataSource.type === 'file' || dataSource.type === 'database' || dataSource.type === 'warehouse')) {
                loadSchemaInfo(dataSource.id, dataSource);
            } else if (cachedSchema) {
                // Use cached schema from context
                setSchemas(prev => ({
                    ...prev,
                    [dataSource.id]: cachedSchema
                }));
            }
            
        } catch (error) {
            console.error('Failed to select data source:', error);
        }
    };

    const getDataSourceIcon = (type: string) => {
        switch (type) {
            case 'file': return <FileTextOutlined />;
            case 'database': return <DatabaseOutlined />;
            case 'warehouse': return <CloudOutlined />;
            case 'cube': return <CloudOutlined />;
            case 'api': return <ApiOutlined />;
            default: return <InfoCircleOutlined />;
        }
    };

    const getStatusColor = (status: 'connected' | 'disconnected' | 'error') => {
        switch (status) {
            case 'connected': return 'success';
            case 'disconnected': return 'default';
            case 'error': return 'error';
            default: return 'default';
        }
    };

    // Convert ContextDataSource to DataSource for callbacks that still expect the old format
    const convertToLegacyDataSource = (ds: ContextDataSource): DataSource => {
        return {
            id: ds.id,
            name: ds.name,
            type: ds.type,
            status: getDataSourceStatus(ds),
            config: getDataSourceConfig(ds),
            metadata: ds.metadata || {},
            lastUsed: ds.last_accessed,
            rowCount: ds.row_count,
            columns: [],
            size: getDataSourceSize(ds)
        };
    };
    
    // Get the selected data source from context (single source of truth)
    const selectedContextDataSource = selectedDataSourceId 
        ? getSelectedDataSource() 
        : null;

    // Removed renderSchemaTree and renderFileSchemaTree - now using SchemaTree and FileSchemaTree components

    // Add dropdown for uploaded file list - only show unselected files
    const renderFileDropdown = () => {
        const fileSources = contextDataSources.filter(ds => ds.type === 'file' && ds.id !== selectedContextDataSource?.id);
        if (fileSources.length === 0) return null;

        return (
            <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text strong>Additional Files</Text>
                    <Checkbox checked={includeFiles} onChange={(e)=> {
                        const val = e.target.checked;
                        setIncludeFiles(val);
                    }}>Include in analysis</Checkbox>
                </div>

                <Select
                    mode="multiple"
                    placeholder={`Choose files (${fileSources.length} available)`}
                    style={{ width: '100%', marginBottom: '8px' }}
                    maxTagCount={3}
                    onChange={(selectedFiles: string[]) => {
                        console.log('Selected files for analysis:', selectedFiles);
                        setSelectedFileIds(selectedFiles);
                    }}
                >
                    {fileSources.map(fileSource => (
                        <Option key={fileSource.id} value={fileSource.id}>
                            <Space>
                                <FileTextOutlined />
                                {fileSource.name}
                                {fileSource.row_count && (
                                    <Tag color="blue">
                                        {fileSource.row_count.toLocaleString()} rows
                                    </Tag>
                                )}
                            </Space>
                        </Option>
                    ))}
                </Select>
            </div>
        );
    };

    // Removed renderFileSchemaTree - now using FileSchemaTree component


    const rootStyle: React.CSSProperties = (typeof compact !== 'undefined' && compact)
        ? { height: '380px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }
        : { height: '100%', display: 'flex', flexDirection: 'column' };

    return (
        <div className="data-panel" style={rootStyle}>
            <div className="data-header">
                <div className="data-title">
                    <DatabaseOutlined className="data-source-icon" />
                    <span className="data-title-text">Sources</span>
                    {contextDataSources.filter(ds => ds.type === 'file').length > 0 && (
                        <Badge 
                            count={contextDataSources.filter(ds => ds.type === 'file').length} 
                            size="small" 
                            className="data-source-badge"
                            title="Total uploaded files"
                        />
                    )}
                    <Tooltip title="Click a source to view schema and use it for AI analysis." placement="bottom">
                        <InfoCircleOutlined className="data-info-icon" />
                    </Tooltip>
                </div>
                <Space>
                    <Tooltip title="Add Source" placement="bottom">
                        <Button
                            type="text"
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={() => setModalVisible(true)}
                        />
                    </Tooltip>
                    {onCollapse && (
                        <Tooltip title="Collapse" placement="left">
                            <div
                                onClick={() => {
                                    onCollapse?.();
                                    // Broadcast collapse state so other components can sync
                                    try {
                                        window.dispatchEvent(new CustomEvent('sidebar-collapse-changed', { detail: { collapsed: true } }));
                                    } catch (e) {
                                        // ignore in non-browser environments
                                    }
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '32px',
                                    height: '32px',
                                    cursor: 'pointer',
                                    color: 'var(--ant-color-text-secondary)',
                                    borderRadius: '6px',
                                    transition: 'all 0.2s ease',
                                    marginRight: '-8px', // Move closer to sidebar border
                                    paddingRight: '8px'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.color = 'var(--ant-color-primary)';
                                    e.currentTarget.style.background = 'var(--ant-color-fill-tertiary)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.color = 'var(--ant-color-text-secondary)';
                                    e.currentTarget.style.background = 'transparent';
                                }}
                            >
                                <CompressOutlined style={{ fontSize: '16px' }} />
                            </div>
                        </Tooltip>
                    )}
                </Space>
            </div>
            


            <div className="data-content" style={{ flex: 1, padding: '12px 12px', overflowY: 'auto' }}>
                {/* Unified Dropdown Controls */}
                <div style={{ marginBottom: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {/* Data Source Select (full width to match selection summary) */}
                    <div style={{ gridColumn: '1 / span 2' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text strong style={{ fontSize: 14 }}>Data Source</Text>
                            <Tooltip title="Refresh" placement="bottom">
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<ReloadOutlined />}
                                    onClick={loadDataSources}
                                    loading={loading}
                                />
                            </Tooltip>
                        </div>
                        <Select
                            value={selectedContextDataSource?.id}
                            onChange={(val: string) => {
                                const ds = contextDataSources.find(d => d.id === val) || null;
                                if (ds) handleDataSourceSelect(ds);
                            }}
                            style={{ 
                                width: '100%', 
                                marginTop: 8, 
                                height: 40, 
                                fontSize: 14,
                                ...(newlyCreatedDataSourceId && selectedContextDataSource?.id === newlyCreatedDataSourceId ? {
                                    animation: 'highlightPulse 2s ease-in-out',
                                    boxShadow: '0 0 0 2px rgba(24, 144, 255, 0.2)'
                                } : {})
                            }}
                            className={newlyCreatedDataSourceId && selectedContextDataSource?.id === newlyCreatedDataSourceId ? 'newly-created-data-source' : ''}
                            placeholder="Select data source"
                            size="middle"
                            showSearch
                            optionFilterProp="children"
                            optionLabelProp="label"
                        >
                            {contextDataSources.map(ds => (
                                <Select.Option 
                                    key={ds.id} 
                                    value={ds.id} 
                                    label={ds.name}
                                    className={newlyCreatedDataSourceId === ds.id ? 'newly-created-data-source-option' : ''}
                                    style={newlyCreatedDataSourceId === ds.id ? {
                                        animation: 'highlightPulse 2s ease-in-out',
                                        backgroundColor: 'rgba(24, 144, 255, 0.1)'
                                    } : {}}
                                >
                                    <span title={ds.name} style={{ display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', verticalAlign: 'bottom' }}>{ds.name}</span>
                                </Select.Option>
                            ))}
                        </Select>
                    </div>
                    {/* Schema Select for databases */}
                    {selectedContextDataSource && selectedContextDataSource.type === 'database' && (
                        <div>
                            <Text strong style={{ fontSize: 14 }}>Schema</Text>
                            <SchemaSelect
                                value={selectedSchemaName}
                                onChange={setSelectedSchemaName}
                                schemas={schemas[selectedContextDataSource.id]?.schemas || ['public']}
                            />
                        </div>
                    )}
                    {/* Table/View Select for databases */}
                    {selectedContextDataSource && selectedContextDataSource.type === 'database' && (
                        <div style={{ gridColumn: '1 / span 2' }}>
                            <Text strong style={{ fontSize: 14 }}>Table / View</Text>
                            <TableViewSelect
                                value={selectedEntityKey || undefined}
                                onChange={setSelectedEntityKey}
                                tables={schemas[selectedContextDataSource.id]?.tables || []}
                                views={schemas[selectedContextDataSource.id]?.views || []}
                                dataSourceId={selectedContextDataSource.id}
                                selectedSchemaName={selectedSchemaName}
                            />
                        </div>
                    )}
                </div>
                {/* Selection Summary removed - now shown in ChatPanel next to streaming toggle as "AI Connected To:" */}



                {loading ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        <Spin />
                        <div style={{ marginTop: '8px' }}>Loading data sources...</div>
                    </div>
                ) : contextDataSources.length === 0 ? (
                    <Empty
                        description="No data sources connected"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                    >
                        <Button type="primary" onClick={() => setModalVisible(true)}>
                            Connect Your First Data Source
                        </Button>
                    </Empty>
                ) : null}
                {/* After dropdown selection UX, render schema tree for selected only */}
                {selectedContextDataSource && schemas[selectedContextDataSource.id] && (
                    <div style={{ marginTop: 12 }}>
                        {selectedContextDataSource.type === 'database' || selectedContextDataSource.type === 'cube' ? (
                            <SchemaTree
                                dataSource={selectedContextDataSource}
                                schema={schemas[selectedContextDataSource.id]}
                                onTableClick={onTableClick ? (tableName, schemaName) => onTableClick(tableName, schemaName, convertToLegacyDataSource(selectedContextDataSource)) : undefined}
                                onColumnClick={onColumnClick ? (tableName, columnName, schemaName) => onColumnClick(tableName, columnName, schemaName, convertToLegacyDataSource(selectedContextDataSource)) : undefined}
                            />
                        ) : selectedContextDataSource.type === 'file' ? (
                            <FileSchemaTree
                                dataSource={selectedContextDataSource}
                                schema={schemas[selectedContextDataSource.id]}
                                onTableClick={onTableClick ? (tableName, schemaName) => onTableClick(tableName, schemaName, convertToLegacyDataSource(selectedContextDataSource)) : undefined}
                                onColumnClick={onColumnClick ? (tableName, columnName, schemaName) => onColumnClick(tableName, columnName, schemaName, convertToLegacyDataSource(selectedContextDataSource)) : undefined}
                            />
                        ) : null}
                    </div>
                )}
            </div>

            <UniversalDataSourceModal
                isOpen={modalVisible}
                onClose={() => setModalVisible(false)}
                isChatIntegration={true}
                onDataSourceCreated={(dataSource) => {
                    setModalVisible(false);
                    if (dataSource) {
                        // Mark as newly created for highlighting
                        setNewlyCreatedDataSourceId(dataSource.id);
                        // Clear highlight after 3 seconds
                        setTimeout(() => {
                            setNewlyCreatedDataSourceId(null);
                        }, 3000);
                        
                        // Auto-select and highlight the newly created data source
                        const newDataSource = contextDataSources.find(ds => ds.id === dataSource.id);
                        if (newDataSource) {
                            handleDataSourceSelect(newDataSource);
                            // Trigger schema refresh for the new data source
                            setTimeout(() => {
                                loadDataSources();
                                loadSchemaInfo(newDataSource.id, newDataSource);
                            }, 500); // Small delay to ensure data source is loaded
                        }
                    } else {
                        loadDataSources();
                    }
                }}
            />
        </div>
    );
};

export default EnhancedDataPanel;