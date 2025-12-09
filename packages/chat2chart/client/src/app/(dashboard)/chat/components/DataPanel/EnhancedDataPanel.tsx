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
import { environment } from '@/config/environment';
import CubeSchemaPanel from './CubeSchemaPanel';
import './styles.css';
import '../HistoryPanel/styles.css';
import { getBackendUrlForApi } from '@/utils/backendUrl';

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
    selectedDataSource?: DataSource | null;
    onDataSourceSelect?: (dataSource: DataSource | null) => void;
    onRefresh?: () => void;
    onDataSourcesChange?: (sources: DataSource[]) => void; // New callback for selected data sources
    onCollapse?: () => void;
    onTableClick?: (tableName: string, schemaName: string, dataSource: DataSource) => void; // Callback when table is clicked
    onColumnClick?: (tableName: string, columnName: string, schemaName: string, dataSource: DataSource) => void; // Callback when column is clicked
    compact?: boolean;
}

const EnhancedDataPanel: React.FC<EnhancedDataPanelProps> = ({
    selectedDataSource,
    onDataSourceSelect,
    onRefresh,
    onTableClick,
    onColumnClick,
    onDataSourcesChange,
    onCollapse,
    compact = false
}) => {
    const [dataSources, setDataSources] = useState<DataSource[]>([]);
    const [loading, setLoading] = useState(false);
    const [showDataSourceModal, setShowDataSourceModal] = useState(false);
    const [activeTab, setActiveTab] = useState<string>('overview');
    // Collapsed state is managed by the parent chat layout. Do not collapse here.
    const [schemaInfo, setSchemaInfo] = useState<SchemaInfo | null>(null);
    const [selectedTables, setSelectedTables] = useState<string[]>([]);
    const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
    const [autoExpandParent, setAutoExpandParent] = useState<boolean>(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [schemaLoading, setSchemaLoading] = useState<string | null>(null);
    const [schemas, setSchemas] = useState<Record<string, SchemaInfo>>({});
    const [includeFiles, setIncludeFiles] = useState<boolean>(true);
    const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
    const [selectedSchemaName, setSelectedSchemaName] = useState<string>('public');
    const [selectedEntityKey, setSelectedEntityKey] = useState<string>('');
    const [newlyCreatedDataSourceId, setNewlyCreatedDataSourceId] = useState<string | null>(null);

    const handleDeleteDataSource = useCallback(async (dataSourceId: string) => {
        try {
            setLoading(true);
            // Use API proxy for proper auth
            const res = await fetch(`/api/data/sources/${dataSourceId}`, { 
                method: 'DELETE',
                credentials: 'include'
            });
            // reload list regardless
            try {
                const response = await fetch('/api/data/sources', {
                    credentials: 'include'
                });
                const result = await response.json();
                if (result.success) {
                    setDataSources(result.data_sources || []);
                }
            } catch {}
            if (selectedDataSource?.id === dataSourceId) {
                onDataSourceSelect?.(null);
            }
        } catch (e) {
            console.error('Failed to delete data source:', e);
        } finally {
            setLoading(false);
        }
    }, [onDataSourceSelect, selectedDataSource]);

    // Define loadDataSources FIRST before using in useEffect
    const loadDataSources = useCallback(async () => {
        setLoading(true);
        try {
            // Use API proxy for proper auth handling
            const response = await fetch('/api/data/sources', {
                credentials: 'include'
            });
            const result = await response.json();
            
            if (result.success) {
                let sources = result.data_sources || [];
                // De-duplicate by id and by name (case-insensitive)
                const seenIds = new Set<string>();
                const seenNames = new Set<string>();
                sources = sources.filter((s: any) => {
                    const id = s?.id;
                    const nameKey = (s?.name || '').toLowerCase();
                    if (id && seenIds.has(id)) return false;
                    if (nameKey && seenNames.has(nameKey)) return false;
                    if (id) seenIds.add(id);
                    if (nameKey) seenNames.add(nameKey);
                    return true;
                });
                
                // Only use real data sources from the API - no hardcoded Cube.js
                setDataSources(sources);
            } else {
                console.error('Failed to load data sources:', result.error);
                // No fallback - only show real data sources
                setDataSources([]);
            }
        } catch (error) {
            console.error('Failed to load data sources:', error);
            // Fallback to localStorage for development
            const savedSources = localStorage.getItem('dataSources');
            if (savedSources) {
                try {
                    let sources = JSON.parse(savedSources);
                    setDataSources(sources);
                } catch (e) {
                    console.error('Failed to parse saved data sources:', e);
                    // No fallback - only show real data sources
                    setDataSources([]);
                }
            } else {
                // No saved sources - show empty state
                setDataSources([]);
            }
        } finally {
            setLoading(false);
        }
    }, []);

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
    
    // Listen for datasource-created events to auto-refresh and auto-select
    useEffect(() => {
        const handleDataSourceCreated = (event: any) => {
            console.log('📡 Data source created event received:', event.detail);
            const newDataSource = event.detail?.data_source;
            const dataSourceId = event.detail?.data_source_id || newDataSource?.id;
            
            // Refresh data sources first
            loadDataSources().then(() => {
                // Auto-select the newly created data source
                if (dataSourceId && onDataSourceSelect) {
                    // Wait a bit for data sources to load, then select
                    setTimeout(() => {
                        // Get all data sources (including files)
                        const allSources = dataSources || [];
                        const foundSource = allSources.find(ds => ds.id === dataSourceId);
                        if (foundSource) {
                            console.log('✅ Auto-selecting newly created data source:', foundSource.name);
                            onDataSourceSelect(foundSource);
                        } else if (newDataSource) {
                            // Use the data source from the event if not found in list
                            console.log('✅ Auto-selecting data source from event:', newDataSource.name);
                            onDataSourceSelect(newDataSource);
                        }
                    }, 300);
                }
            });
        };
        
        window.addEventListener('datasource-created', handleDataSourceCreated);
        
        return () => {
            window.removeEventListener('datasource-created', handleDataSourceCreated);
        };
    }, [loadDataSources, onDataSourceSelect, dataSources]);
    
    // Load data sources on component mount
    useEffect(() => {
        loadDataSources();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Auto-expand public schema by default
    useEffect(() => {
        if (dataSources.length > 0) {
            const defaultExpandedKeys = dataSources
                .filter(ds => ds.type === 'database')
                .map(ds => `${ds.id}_public`);
            setExpandedKeys(prev => Array.from(new Set([...prev, ...defaultExpandedKeys])));
        }
    }, [dataSources]);





    const loadSchemaInfo = async (dataSourceId: string, dataSource: DataSource) => {
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
                const response = await fetch(`/api/data/sources/${dataSourceId}/schema`, {
                    credentials: 'include'
                });
                const result = await response.json();
                
                if (result.success && result.schema) {
                    const schemaData = result.schema;
                    // File sources use 'data' as table name in DuckDB
                    const fileTable = schemaData.tables?.[0] || {
                        name: 'data', // CRITICAL: Use 'data' as table name for file sources
                        columns: (Array.isArray(dataSource.columns) ? dataSource.columns : []).map((col: any) => ({
                            name: typeof col === 'string' ? col : (col.name || col.column_name),
                            type: typeof col === 'string' ? 'string' : (col.type || 'string'),
                            nullable: true
                        })),
                        rowCount: dataSource.rowCount || schemaData.row_count || 0
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
                                columns: (Array.isArray(dataSource.columns) ? dataSource.columns : []).map((col: any) => ({
                                    name: typeof col === 'string' ? col : (col.name || col.column_name),
                                    type: typeof col === 'string' ? 'string' : (col.type || 'string'),
                                    nullable: true
                                })),
                                rowCount: dataSource.rowCount || 0
                            }],
                            schemas: ['file']
                        }
                    }));
                }
            } else if (dataSource.type === 'database' || dataSource.type === 'warehouse') {
                // For database and warehouse sources, get real schema information
                const response = await fetch(`/api/data/sources/${dataSourceId}/schema`, {
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

    const handleDataSourceSelect = (dataSource: DataSource) => {
        console.log('🎯 Data source selected via click:', dataSource);
        
        // Clear loading state for previous source
        setSchemaLoading(null);
        
        // Notify parent of selection change
        onDataSourceSelect?.(dataSource);
        
        // Always load schema for newly selected source (even if cached)
        // This ensures fresh data and proper UI update
        if (!schemas[dataSource.id]) {
            loadSchemaInfo(dataSource.id, dataSource);
        }
    };

    // CRITICAL: Load schema when selectedDataSource prop changes (e.g., from localStorage restore)
    useEffect(() => {
        if (selectedDataSource && selectedDataSource.id) {
            console.log('🔄 Selected data source prop changed, loading schema:', selectedDataSource.name, 'ID:', selectedDataSource.id);
            // Always reload schema when data source changes (ensures fresh data after page restore)
            // This handles the case when page is restored from localStorage
            loadSchemaInfo(selectedDataSource.id, selectedDataSource);
        }
    }, [selectedDataSource?.id]); // Only depend on ID to avoid unnecessary reloads

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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'connected': return 'success';
            case 'disconnected': return 'default';
            case 'error': return 'error';
            default: return 'default';
        }
    };

    const renderSchemaTree = (dataSource: DataSource) => {
        const schema = schemas[dataSource.id];
        if (!schema) return null;

        const treeData = [];

        if (dataSource.type === 'cube' && schema.cubes) {
            // Cube.js schema display - skip rendering here since CubeSchemaPanel handles it
            // This prevents duplication with the CubeSchemaPanel below
            return null;
        } else if (dataSource.type === 'database' && schema.schemas) {
            // Enhanced database schema display with proper hierarchy
                         // Group tables by schema
             const schemaGroups: Record<string, SchemaInfo['tables']> = {};
             schema.tables?.forEach((table) => {
                const schemaName = table.schema || 'public';
                if (!schemaGroups[schemaName]) {
                    schemaGroups[schemaName] = [];
                }
                schemaGroups[schemaName].push(table);
            });

                         // Create schema nodes
             Object.entries(schemaGroups).forEach(([schemaName, tables]) => {
                 if (!tables) return;
                 treeData.push({
                     key: `${dataSource.id}_${schemaName}`,
                     title: (
                         <div style={{ 
                             display: 'flex', 
                             alignItems: 'center', 
                             justifyContent: 'space-between',
                             width: '100%',
                             minWidth: 0,
                             paddingLeft: '0'
                         }}>
                             <div style={{ 
                                 display: 'flex', 
                                 alignItems: 'center', 
                                 minWidth: 0,
                                 flex: 1
                             }}>
                                 <Text 
                                     strong 
                                     style={{ 
                                         fontSize: 'var(--font-size-sm)',
                                         maxWidth: '100px',
                                         overflow: 'hidden',
                                         textOverflow: 'ellipsis',
                                         whiteSpace: 'nowrap'
                                     }}
                                     title={schemaName}
                                 >
                                     {schemaName}
                                 </Text>
                                 <Tag 
                                     color="blue" 
                                     style={{ 
                                         fontSize: '9px',
                                         marginLeft: '4px',
                                         padding: '0 3px'
                                     }}
                                 >
                                     Schema
                                 </Tag>
                             </div>
                             <Tag 
                                 color="green" 
                                 style={{ 
                                     fontSize: '9px',
                                     flexShrink: 0,
                                     padding: '0 3px'
                                     }}
                             >
                                 {tables.length} tables
                             </Tag>
                         </div>
                     ),
                     children: [
                        ...tables.map((table) => ({
                        key: `${dataSource.id}_${schemaName}_${table.name}`,
                        title: (
                            <div 
                                style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between',
                                    width: '100%',
                                    minWidth: 0,
                                    paddingLeft: '0',
                                    cursor: onTableClick ? 'pointer' : 'default'
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onTableClick) {
                                        onTableClick(table.name, schemaName, dataSource);
                                    }
                                }}
                            >
                                <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    minWidth: 0,
                                    flex: 1
                                }}>
                                    <TableOutlined style={{ marginRight: '4px', fontSize: 'var(--font-size-sm)' }} />
                                    <Text 
                                        strong 
                                        style={{ 
                                            fontSize: 'var(--font-size-sm)',
                                            maxWidth: '130px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}
                                        title={table.name}
                                    >
                                        {table.name}
                                    </Text>
                                    {table.description && (
                                        <Tooltip title={table.description}>
                                            <InfoCircleOutlined 
                                                style={{ 
                                                    color: 'var(--ant-color-primary, var(--color-brand-primary))', 
                                                    marginLeft: '4px',
                                                    fontSize: '11px'
                                                }} 
                                            />
                                        </Tooltip>
                                    )}
                                </div>
                                <Tag 
                                    color="green" 
                                    style={{ 
                                        fontSize: '9px',
                                        flexShrink: 0,
                                        padding: '0 3px'
                                    }}
                                >
                                    {table.rowCount || 'N/A'} rows
                                </Tag>
                            </div>
                        ),
                                                 children: (Array.isArray(table.columns) ? table.columns : []).map((col) => ({
                             key: `${dataSource.id}_${schemaName}_${table.name}_${col.name}`,
                             title: (
                                 <div 
                                     style={{ 
                                         display: 'flex', 
                                         alignItems: 'center', 
                                         justifyContent: 'space-between',
                                         width: '100%',
                                         minWidth: 0,
                                         paddingLeft: '0',
                                         cursor: onColumnClick ? 'pointer' : 'default'
                                     }}
                                     onClick={(e) => {
                                         e.stopPropagation();
                                         if (onColumnClick) {
                                             onColumnClick(table.name, col.name, schemaName, dataSource);
                                         }
                                     }}
                                 >
                                     <div style={{ 
                                         display: 'flex', 
                                         alignItems: 'center', 
                                         minWidth: 0,
                                         flex: 1
                                     }}>
                                         <Text 
                                             code 
                                             style={{ 
                                                 fontSize: 'var(--font-size-sm)',
                                                 maxWidth: '140px',
                                                 overflow: 'hidden',
                                                 textOverflow: 'ellipsis',
                                                 whiteSpace: 'nowrap'
                                             }}
                                             title={col.name}
                                         >
                                             {col.name}
                                         </Text>
                                         <Tag 
                                             color="purple" 
                                             style={{ 
                                                 fontSize: '10px',
                                                 marginLeft: '6px',
                                                 maxWidth: '90px',
                                                 overflow: 'hidden',
                                                 textOverflow: 'ellipsis'
                                             }}
                                             title={col.type}
                                         >
                                             {col.type}
                                         </Tag>
                                     </div>
                                     <div style={{ 
                                         display: 'flex', 
                                         gap: '3px',
                                         flexShrink: 0
                                     }}>
                                         {col.primary_key && <Tag color="red" style={{ fontSize: '9px', padding: '0 3px' }}>PK</Tag>}
                                         {col.unique && <Tag color="orange" style={{ fontSize: '9px', padding: '0 3px' }}>UNIQUE</Tag>}
                                         {col.foreign_key && <Tag color="cyan" style={{ fontSize: '9px', padding: '0 3px' }}>FK</Tag>}
                                         {!col.nullable && <Tag color="red" style={{ fontSize: '9px', padding: '0 3px' }}>NOT NULL</Tag>}
                                         {col.default && (
                                             <Tooltip title={`Default: ${col.default}`}>
                                                 <Tag color="geekblue" style={{ fontSize: '9px', padding: '0 3px' }}>DEFAULT</Tag>
                                             </Tooltip>
                                         )}
                                     </div>
                                 </div>
                             )
                         }))
                        })),
                        ...(((schema as any).views || []).filter((v: any) => (v.schema || 'public') === schemaName).map((view: any) => ({
                            key: `${dataSource.id}_${schemaName}_view_${view.name}`,
                            title: (
                                <Space>
                                    <TableOutlined />
                                    <Text strong>{view.name}</Text>
                                    <Tag color="blue">VIEW</Tag>
                                </Space>
                            ),
                            children: (view.columns || []).map((col: any) => ({
                                key: `${dataSource.id}_${schemaName}_view_${view.name}_${col.name}`,
                                title: (
                                    <Space>
                                        <Text code>{col.name}</Text>
                                        <Tag color="purple">{col.type}</Tag>
                                        {col.nullable === false && <Tag color="red">NOT NULL</Tag>}
                                    </Space>
                                )
                            }))
                        })))
                    ]
                });
            });

            // Add database info node
            if (schema.database_info) {
                treeData.unshift({
                    key: `${dataSource.id}_db_info`,
                    title: (
                        <Space>
                            <Text strong>Database Information</Text>
                            <Tag color="geekblue">Connection</Tag>
                        </Space>
                    ),
                    children: [
                        {
                            key: `${dataSource.id}_db_name`,
                            title: (
                                <Space>
                                    <Text>Database: {schema.database_info.name}</Text>
                                    <Tag color="blue">{schema.database_info.type}</Tag>
                                </Space>
                            )
                        },
                        {
                            key: `${dataSource.id}_db_host`,
                            title: (
                                <Space>
                                    <Text>Host: {schema.database_info.host}:{schema.database_info.port}</Text>
                                </Space>
                            )
                        },
                        {
                            key: `${dataSource.id}_db_user`,
                            title: (
                                <Space>
                                    <Text>User: {schema.database_info.username}</Text>
                                </Space>
                            )
                        }
                    ]
                });
            }

            // Add warning if using fallback schema
            if (schema.warning) {
                treeData.push({
                    key: `${dataSource.id}_warning`,
                    title: (
                        <Space>
                            <Text type="warning">⚠️ {schema.warning}</Text>
                        </Space>
                    )
                });
            }
        } else if (schema.tables) {
            // File or single schema database
            treeData.push({
                key: `${dataSource.id}_tables`,
                title: (
                    <Space>
                        <Text strong>Tables & Views</Text>
                        <Tag color="blue">{schema.tables.length}</Tag>
                    </Space>
                ),
                children: schema.tables.map((table: any) => ({
                    key: `${dataSource.id}_${table.name}`,
                    title: (
                        <Space>
                            <TableOutlined />
                            <Text strong>{table.name}</Text>
                            <Tag color="green">{table.rowCount || 'N/A'} rows</Tag>
                        </Space>
                    ),
                                         children: (Array.isArray(table.columns) ? table.columns : []).map((col: any) => ({
                         key: `${dataSource.id}_${table.name}_${col.name}`,
                         title: (
                             <Space>
                                 <Text code>{col.name}</Text>
                                 <Tag color="purple">{col.type}</Tag>
                                 {!col.nullable && <Tag color="red">NOT NULL</Tag>}
                             </Space>
                         )
                     }))
                }))
            });
        }

        return (
            <Tree
                treeData={treeData}
                expandedKeys={expandedKeys}
                onExpand={(keys) => setExpandedKeys(keys as string[])}
                showLine
                showIcon
                className="schema-tree-compact"
            />
        );
    };

    // Add dropdown selectors for database → schema → table selection
    const renderSchemaDropdowns = (dataSource: DataSource) => {
        // Removed Quick Navigation section as it's not working properly
        return null;
    };

    // Add dropdown for uploaded file list - only show unselected files
    const renderFileDropdown = () => {
        const fileSources = dataSources.filter(ds => ds.type === 'file' && ds.id !== selectedDataSource?.id);
        if (fileSources.length === 0) return null;

        return (
            <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text strong>Additional Files</Text>
                    <Checkbox checked={includeFiles} onChange={(e)=> {
                        const val = e.target.checked;
                        setIncludeFiles(val);
                        if (onDataSourcesChange) {
                            const selectedFileSources = selectedFileIds.map((fileId: string) => 
                                dataSources.find(ds => ds.id === fileId)
                            ).filter((ds): ds is DataSource => ds !== undefined);
                            const next = val ? (selectedDataSource ? [selectedDataSource, ...selectedFileSources] : selectedFileSources)
                                             : (selectedDataSource ? [selectedDataSource] : []);
                            onDataSourcesChange(next);
                        }
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
                        // Get the actual file data sources
                        const selectedFileSources = selectedFiles.map((fileId: string) => 
                            dataSources.find(ds => ds.id === fileId)
                        ).filter((ds): ds is DataSource => ds !== undefined);
                        
                        // Update the parent component with selected data sources
                        if (onDataSourcesChange && includeFiles) {
                            const allSelectedSources = selectedDataSource ? [selectedDataSource, ...selectedFileSources] : selectedFileSources;
                            onDataSourcesChange(allSelectedSources);
                        }
                    }}
                >
                    {fileSources.map(fileSource => (
                        <Option key={fileSource.id} value={fileSource.id}>
                            <Space>
                                <FileTextOutlined />
                                {fileSource.name}
                                {fileSource.rowCount && (
                                    <Tag color="blue">
                                        {fileSource.rowCount.toLocaleString()} rows
                                    </Tag>
                                )}
                            </Space>
                        </Option>
                    ))}
                </Select>
            </div>
        );
    };

    // Improve file data source display
    const renderFileSchemaTree = (dataSource: DataSource) => {
        const schema = schemas[dataSource.id];
        if (!schema || dataSource.type !== 'file') return null;

        const treeData = [];

        if (schema.tables && schema.tables.length > 0) {
            // File schema with tables
            treeData.push({
                key: `${dataSource.id}_file_info`,
                title: (
                    <Space>
                        <Text strong>File Information</Text>
                        <Tag color="blue">Uploaded</Tag>
                    </Space>
                ),
                children: [
                    {
                        key: `${dataSource.id}_file_name`,
                        title: (
                            <Space>
                                <Text>Filename: {dataSource.name}</Text>
                            </Space>
                        )
                    },
                    {
                        key: `${dataSource.id}_file_size`,
                        title: (
                            <Space>
                                <Text>Size: {dataSource.size || 'Unknown'}</Text>
                            </Space>
                        )
                    },
                    {
                        key: `${dataSource.id}_file_rows`,
                        title: (
                            <Space>
                                <Text>Total Rows: {dataSource.rowCount || 'Unknown'}</Text>
                            </Space>
                        )
                    }
                ]
            });

            // Data structure
            treeData.push({
                key: `${dataSource.id}_data_structure`,
                title: (
                    <Space>
                        <Text strong>Data Structure</Text>
                        <Tag color="green">{schema.tables.length} table(s)</Tag>
                    </Space>
                ),
                children: schema.tables.map((table: any) => ({
                    key: `${dataSource.id}_table_${table.name}`,
                    title: (
                        <div 
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between',
                                width: '100%',
                                cursor: onTableClick ? 'pointer' : 'default'
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onTableClick) {
                                    // For file sources, table name is always 'data'
                                    onTableClick('data', 'file', dataSource);
                                }
                            }}
                        >
                            <Space>
                                <TableOutlined />
                                <Text strong>{table.name}</Text>
                                <Tag color="green">{table.rowCount || 'N/A'} rows</Tag>
                            </Space>
                        </div>
                    ),
                    children: (Array.isArray(table.columns) ? table.columns : []).map((col: any) => ({
                        key: `${dataSource.id}_${table.name}_${col.name}`,
                        title: (
                            <div 
                                style={{ 
                                    cursor: onColumnClick ? 'pointer' : 'default'
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onColumnClick) {
                                        onColumnClick('data', col.name, 'file', dataSource);
                                    }
                                }}
                            >
                                <Space>
                                    <Text code>{col.name}</Text>
                                    <Tag color="purple">{col.type}</Tag>
                                    {!col.nullable && <Tag color="red">NOT NULL</Tag>}
                                    {col.statistics && (
                                        <Tooltip title={`Min: ${col.statistics.min}, Max: ${col.statistics.max}, Mean: ${col.statistics.mean}`}>
                                            <Tag color="geekblue">Stats</Tag>
                                        </Tooltip>
                                    )}
                                </Space>
                            </div>
                        )
                    }))
                }))
            });
        }

        return (
            <Tree
                treeData={treeData}
                expandedKeys={expandedKeys}
                onExpand={(keys) => setExpandedKeys(keys as string[])}
                showLine
                showIcon
                className="schema-tree-compact"
            />
        );
    };

    const renderDataSourceCard = (dataSource: DataSource) => {
        // CRITICAL: Show file data sources as cards too (not just in dropdown)
        // This allows users to click on them and see schema
        // if (dataSource.type === 'file') return null; // REMOVED: Allow file sources to be displayed
        
        const isSelected = selectedDataSource?.id === dataSource.id;
        const schema = schemas[dataSource.id];
        
        return (
            <Card
                key={dataSource.id}
                size="small"
                className={newlyCreatedDataSourceId === dataSource.id ? 'newly-created-data-source' : ''}
                style={{
                    marginBottom: '8px',
                    border: isSelected ? '2px solid var(--ant-color-primary)' : '1px solid var(--ant-color-border)',
                    cursor: 'pointer',
                    background: 'var(--ant-color-bg-container)',
                    color: 'var(--ant-color-text)',
                    ...(newlyCreatedDataSourceId === dataSource.id ? {
                        animation: 'highlightPulse 2s ease-in-out',
                        boxShadow: '0 0 0 2px rgba(24, 144, 255, 0.2)'
                    } : {})
                }}
                onClick={() => handleDataSourceSelect(dataSource)}
                hoverable
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Space>
                        {getDataSourceIcon(dataSource.type)}
                        <div>
                            <Text strong>{dataSource.name}</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 'var(--font-size-sm)' }}>
                                {dataSource.type.toUpperCase()}
                            </Text>
                        </div>
                    </Space>
                    <Space>
                        {isSelected && (
                            <CheckCircleOutlined 
                                style={{ 
                                    color: 'var(--ant-color-success, var(--color-functional-success))', 
                                    fontSize: 'var(--font-size-md)',
                                    marginRight: '8px'
                                }} 
                                title="Selected for AI Analysis"
                            />
                        )}
                        <Popconfirm
                            title="Delete data source?"
                            description="This will remove the data source."
                            onConfirm={(e) => { e?.stopPropagation?.(); handleDeleteDataSource(dataSource.id); }}
                            onCancel={(e) => e?.stopPropagation?.()}
                            okText="Delete"
                            cancelText="Cancel"
                        >
                            <Button
                                type="text"
                                icon={<DeleteOutlined />}
                                onClick={(e) => e.stopPropagation()}
                                title="Delete data source"
                                style={{ color: 'var(--ant-color-error, var(--color-functional-danger))' }}
                            />
                        </Popconfirm>
                        <Tag color={getStatusColor(dataSource.status)}>
                            {dataSource.status}
                        </Tag>
                        {dataSource.rowCount && (
                            <Tag color="blue">{dataSource.rowCount.toLocaleString()} rows</Tag>
                        )}
                    </Space>
                </div>
                
                {isSelected && schema && (
                    <div style={{ marginTop: '12px' }}>
                        <Divider style={{ margin: '8px 0' }} />
                        
                        {/* Render appropriate schema tree based on type */}
                        {dataSource.type === 'database' && renderSchemaTree(dataSource)}
                        {dataSource.type === 'cube' && renderSchemaTree(dataSource)}
                        {dataSource.type === 'file' && renderFileSchemaTree(dataSource)}
                        
                        {/* File dropdown below database schema */}
                        {dataSource.type === 'database' && (
                            <div className="file-dropdown-container" style={{
                                marginTop: '12px',
                                padding: '8px',
                                background: 'var(--layout-panel-background-subtle, rgba(255,255,255,0.02))',
                                borderRadius: '6px',
                                border: '1px solid var(--color-border-secondary, #f0f0f0)'
                            }}>
                                <Text strong style={{ display: 'block', marginBottom: '8px', fontSize: 'var(--font-size-sm)' }}>
                                    📁 Available Files for Analysis
                                </Text>
                                {renderFileDropdown()}
                            </div>
                        )}
                        
                        {/* Cube.js Schema Panel removed in favor of unified schema browser */}
                    </div>
                )}
            </Card>
        );
    };

    const rootStyle: React.CSSProperties = (typeof compact !== 'undefined' && compact)
        ? { height: '380px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }
        : { height: '100%', display: 'flex', flexDirection: 'column' };

    return (
        <div className="data-panel" style={rootStyle}>
            <div className="data-header">
                <div className="data-title">
                    <DatabaseOutlined className="data-source-icon" />
                    <span className="data-title-text">Sources</span>
                    {dataSources.filter(ds => ds.type === 'file').length > 0 && (
                        <Badge 
                            count={dataSources.filter(ds => ds.type === 'file').length} 
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
                            value={selectedDataSource?.id}
                            onChange={(val: string) => {
                                const ds = dataSources.find(d => d.id === val) || null;
                                if (ds) handleDataSourceSelect(ds);
                            }}
                            style={{ 
                                width: '100%', 
                                marginTop: 8, 
                                height: 40, 
                                fontSize: 14,
                                ...(newlyCreatedDataSourceId && selectedDataSource?.id === newlyCreatedDataSourceId ? {
                                    animation: 'highlightPulse 2s ease-in-out',
                                    boxShadow: '0 0 0 2px rgba(24, 144, 255, 0.2)'
                                } : {})
                            }}
                            className={newlyCreatedDataSourceId && selectedDataSource?.id === newlyCreatedDataSourceId ? 'newly-created-data-source' : ''}
                            placeholder="Select data source"
                            size="middle"
                            showSearch
                            optionFilterProp="children"
                            optionLabelProp="label"
                        >
                            {dataSources.map(ds => (
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
                    {selectedDataSource && selectedDataSource.type === 'database' && (
                        <div>
                            <Text strong style={{ fontSize: 14 }}>Schema</Text>
                            <Select
                                value={selectedSchemaName}
                                onChange={(val: string) => {
                                    setSelectedSchemaName(val);
                                    const sk = `${selectedDataSource.id}_${val}`;
                                    if (!expandedKeys.includes(sk)) setExpandedKeys(prev => Array.from(new Set([...prev, sk])));
                                }}
                                style={{ width: '100%', marginTop: 8, height: 40, fontSize: 14 }}
                                placeholder="Select schema"
                                size="middle"
                            >
                                {(schemas[selectedDataSource.id]?.schemas || ['public']).map((sn: string) => (
                                    <Select.Option key={sn} value={sn}>{sn}</Select.Option>
                                ))}
                            </Select>
                        </div>
                    )}
                    {/* Table/View Select for databases */}
                    {selectedDataSource && selectedDataSource.type === 'database' && (
                        <div style={{ gridColumn: '1 / span 2' }}>
                            <Text strong style={{ fontSize: 14 }}>Table / View</Text>
                            <Select
                                value={selectedEntityKey || undefined}
                                onChange={(val: string) => {
                                    setSelectedEntityKey(val);
                                    if (!expandedKeys.includes(val)) setExpandedKeys(prev => Array.from(new Set([...prev, val])));
                                }}
                                style={{ width: '100%', marginTop: 8, height: 40, fontSize: 14 }}
                                placeholder="Select table or view"
                                size="middle"
                                showSearch
                                optionFilterProp="children"
                            >
                                {/* Tables */}
                                {(schemas[selectedDataSource.id]?.tables || []).filter(t => (t.schema || 'public') === selectedSchemaName).map(t => (
                                    <Select.Option key={`${selectedDataSource.id}_${selectedSchemaName}_${t.name}`} value={`${selectedDataSource.id}_${selectedSchemaName}_${t.name}`}>🗄️ {t.name}</Select.Option>
                                ))}
                                {/* Views */}
                                {(schemas[selectedDataSource.id]?.views || []).filter(v => (v.schema || 'public') === selectedSchemaName).map(v => (
                                    <Select.Option key={`${selectedDataSource.id}_${selectedSchemaName}_view_${v.name}`} value={`${selectedDataSource.id}_${selectedSchemaName}_view_${v.name}`}>👁️ {v.name} (view)</Select.Option>
                                ))}
                            </Select>
                        </div>
                    )}
                </div>
                {/* Selection Summary removed - now shown in ChatPanel next to streaming toggle as "AI Connected To:" */}



                {loading ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        <Spin />
                        <div style={{ marginTop: '8px' }}>Loading data sources...</div>
                    </div>
                ) : dataSources.length === 0 ? (
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
                {selectedDataSource && schemas[selectedDataSource.id] && (
                    <div style={{ marginTop: 12 }}>
                        {renderSchemaTree(selectedDataSource)}
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
                        handleDataSourceSelect(dataSource);
                        // Trigger schema refresh for the new data source
                        setTimeout(() => {
                            loadDataSources();
                            loadSchemaInfo(dataSource.id, dataSource);
                        }, 500); // Small delay to ensure data source is loaded
                    } else {
                        loadDataSources();
                    }
                }}
            />
        </div>
    );
};

export default EnhancedDataPanel;