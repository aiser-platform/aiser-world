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
}

const EnhancedDataPanel: React.FC<EnhancedDataPanelProps> = ({
    selectedDataSource,
    onDataSourceSelect,
    onRefresh,
    onDataSourcesChange,
    onCollapse
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

    const handleDeleteDataSource = useCallback(async (dataSourceId: string) => {
        try {
            setLoading(true);
            const res = await fetch(`${getBackendUrlForApi()}/data/sources/${dataSourceId}`, { method: 'DELETE' });
            // ignore body; reload list regardless
            try {
                const response = await fetch(`${getBackendUrlForApi()}/data/sources`);
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

    const loadDataSources = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`${getBackendUrlForApi()}/data/sources`);
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
                
                // Add real Cube.js data source from actual running instance
                    const realCubeSource = {
                    id: 'cube_real_001',
                    name: 'Cube.js Analytics',
                    type: 'cube' as const,
                    status: 'connected' as const,
                    config: {
                        endpoint: environment.cubejs.url,
                        apiVersion: 'v1'
                    },
                    metadata: {
                        description: 'Real-time semantic data modeling and analytics'
                    },
                    lastUsed: new Date().toISOString(),
                    rowCount: 0
                };
                
                // Check if Cube.js source already exists
                if (!sources.find((s: DataSource) => s.type === 'cube')) {
                    sources = [realCubeSource, ...sources];
                }
                
                setDataSources(sources);
            } else {
                console.error('Failed to load data sources:', result.error);
                // Fallback with real Cube.js source
                setDataSources([{
                    id: 'cube_real_001',
                    name: 'Cube.js Analytics',
                    type: 'cube' as const,
                    status: 'connected' as const,
                    config: {
                        endpoint: 'http://localhost:4000',
                        apiVersion: 'v1'
                    },
                    metadata: {
                        description: 'Real-time semantic data modeling and analytics'
                    },
                    lastUsed: new Date().toISOString(),
                    rowCount: 0
                }]);
            }
        } catch (error) {
            console.error('Failed to load data sources:', error);
            // Fallback to localStorage for development
            const savedSources = localStorage.getItem('dataSources');
            if (savedSources) {
                try {
                    let sources = JSON.parse(savedSources);
                    // Add real Cube.js source if not present
                    if (!sources.find((s: DataSource) => s.type === 'cube')) {
                        sources = [{
                            id: 'cube_real_001',
                            name: 'Cube.js Analytics',
                            type: 'cube',
                            status: 'connected',
                            config: {
                                endpoint: 'http://localhost:4000',
                                apiVersion: 'v1'
                            },
                            metadata: {
                                description: 'Real-time semantic data modeling and analytics'
                            },
                            lastUsed: new Date().toISOString(),
                            rowCount: 0
                        }, ...sources];
                    }
                    setDataSources(sources);
                } catch (e) {
                    console.error('Failed to parse saved data sources:', e);
                    // Final fallback with just Cube.js
                    setDataSources([{
                        id: 'cube_mock_001',
                        name: 'Cube.js Analytics',
                        type: 'cube' as const,
                        status: 'connected' as const,
                        config: {
                            endpoint: 'http://localhost:4000',
                            apiVersion: 'v1'
                        },
                        metadata: {
                            description: 'Semantic data modeling and analytics'
                        },
                        lastUsed: new Date().toISOString(),
                        rowCount: 0
                    }]);
                }
            } else {
                // No saved sources, create with real Cube.js
                setDataSources([{
                    id: 'cube_real_001',
                    name: 'Cube Analytics',
                    type: 'cube' as const,
                    status: 'connected' as const,
                    config: {
                        endpoint: 'http://localhost:4000',
                        apiVersion: 'v1'
                    },
                    metadata: {
                        description: 'Real-time semantic data modeling and analytics'
                    },
                    lastUsed: new Date().toISOString(),
                    rowCount: 0
                }]);
            }
        } finally {
            setLoading(false);
        }
    }, []);

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
        if (schemas[dataSourceId]) return; // Already loaded
        
        setSchemaLoading(dataSourceId);
        try {
            if (dataSource.type === 'file') {
                // For file sources, get metadata from the data endpoint
                const response = await fetch(`${getBackendUrlForApi()}/data/sources/${dataSourceId}/data`);
                const result = await response.json();
                
                if (result.success) {
                    setSchemas(prev => ({
                        ...prev,
                        [dataSourceId]: {
                            tables: [{
                                name: dataSource.name,
                                columns: result.metadata.columns || [],
                                rowCount: result.metadata.row_count
                            }]
                        }
                    }));
                }
            } else if (dataSource.type === 'database') {
                // For database sources, get real schema information
                const response = await fetch(`${getBackendUrlForApi()}/data/sources/${dataSourceId}/schema`);
                const result = await response.json();
                
                if (result.success) {
                    const baseSchema: SchemaInfo = result.schema;
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
                    setSchemas(prev => ({
                        ...prev,
                        [dataSourceId]: baseSchema
                    }));
                } else {
                    console.error('Failed to load database schema:', result.error);
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
        console.log('🎯 Data source selected:', dataSource);
        onDataSourceSelect?.(dataSource);
        // Load schema if not already loaded
        if (!schemas[dataSource.id]) {
            loadSchemaInfo(dataSource.id, dataSource);
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
                                         fontSize: '12px',
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
                                    <TableOutlined style={{ marginRight: '4px', fontSize: '12px' }} />
                                    <Text 
                                        strong 
                                        style={{ 
                                            fontSize: '12px',
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
                                                    color: 'var(--ant-color-primary, #1677ff)', 
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
                                                 children: table.columns.map((col) => ({
                             key: `${dataSource.id}_${schemaName}_${table.name}_${col.name}`,
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
                                             code 
                                             style={{ 
                                                 fontSize: '12px',
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
                                         children: table.columns.map((col: any) => ({
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
                        <Space>
                            <TableOutlined />
                            <Text strong>{table.name}</Text>
                            <Tag color="green">{table.rowCount || 'N/A'} rows</Tag>
                        </Space>
                    ),
                                         children: table.columns.map((col: any) => ({
                         key: `${dataSource.id}_${table.name}_${col.name}`,
                         title: (
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
        // Skip file data sources - they're only shown in the dropdown
        if (dataSource.type === 'file') return null;
        
        const isSelected = selectedDataSource?.id === dataSource.id;
        const schema = schemas[dataSource.id];
        
        return (
            <Card
                key={dataSource.id}
                size="small"
                style={{
                    marginBottom: '8px',
                    border: isSelected ? '2px solid var(--ant-color-primary, #1677ff)' : '1px solid var(--ant-color-border, #d9d9d9)',
                    cursor: 'pointer',
                    background: 'var(--ant-color-bg-container, #ffffff)',
                    color: 'var(--ant-color-text, #141414)'
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
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                {dataSource.type.toUpperCase()}
                            </Text>
                        </div>
                    </Space>
                    <Space>
                        {isSelected && (
                            <CheckCircleOutlined 
                                style={{ 
                                    color: 'var(--ant-color-success, #52c41a)', 
                                    fontSize: '16px',
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
                                style={{ color: 'var(--ant-color-error, #ff4d4f)' }}
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
                        
                        {/* File dropdown below database schema */}
                        {dataSource.type === 'database' && (
                            <div className="file-dropdown-container" style={{
                                marginTop: '12px',
                                padding: '8px',
                                background: 'var(--ant-color-bg-container, rgba(255,255,255,0.02))',
                                borderRadius: '6px',
                                border: '1px solid var(--ant-color-border, #f0f0f0)'
                            }}>
                                <Text strong style={{ display: 'block', marginBottom: '8px', fontSize: '12px' }}>
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

    return (
        <div className="collapsible-history-panel EnhancedDataPanel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="history-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="DataTitle" style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '16px',
                    fontWeight: '600'
                }}>
                    <DatabaseOutlined />
                    <span style={{ marginLeft: '8px' }}>Sources</span>
                    {dataSources.filter(ds => ds.type === 'file').length > 0 && (
                        <Badge 
                            count={dataSources.filter(ds => ds.type === 'file').length} 
                            size="small" 
                            style={{ marginLeft: '8px' }}
                            title="Total uploaded files"
                        />
                    )}
                    <Tooltip title="Click a source to view schema and use it for AI analysis.">
                        <InfoCircleOutlined style={{ marginLeft: '8px', cursor: 'help' }} />
                    </Tooltip>
                </div>
                <Space>
                    <Tooltip title="Add Source">
                        <Button
                            type="text"
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={() => setModalVisible(true)}
                        />
                    </Tooltip>
                    <Tooltip title="Collapse">
                        <Button
                            type="text"
                            size="small"
                            icon={<CompressOutlined />}
                            onClick={() => onCollapse?.()}
                        />
                    </Tooltip>
                </Space>
            </div>
            


            <div className="history-panel-content DataContent" style={{ flex: 1, padding: '12px 12px', overflowY: 'auto' }}>
                {/* Unified Dropdown Controls */}
                <div style={{ marginBottom: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {/* Data Source Select (full width to match selection summary) */}
                    <div style={{ gridColumn: '1 / span 2' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text strong style={{ fontSize: 14 }}>Data Source</Text>
                            <Tooltip title="Refresh">
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
                            style={{ width: '100%', marginTop: 8, height: 40, fontSize: 14 }}
                            placeholder="Select data source"
                            size="middle"
                            showSearch
                            optionFilterProp="children"
                            optionLabelProp="label"
                        >
                            {dataSources.map(ds => (
                                <Select.Option key={ds.id} value={ds.id} label={ds.name}>
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
                {/* Selection Summary for AI Analysis */}
                {selectedDataSource && (
                    <div style={{
                        padding: '12px 16px',
                        background: 'linear-gradient(135deg, #1890ff20, #52c41a20)',
                        border: '1px solid #1890ff',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '16px' }}>🎯</span>
                            <Text strong>
                                For AI: {selectedDataSource.name}
                            </Text>
                            <Tag color="blue">{selectedDataSource.type}</Tag>
                            {selectedDataSource.rowCount && (
                                <Tag color="green">{selectedDataSource.rowCount.toLocaleString()} rows</Tag>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Button 
                                size="small" 
                                type="text" 
                                icon={<CloseOutlined />}
                                onClick={() => onDataSourceSelect?.(null)}
                                style={{ color: 'var(--ant-color-text, #141414)' }}
                                title="Clear Selection"
                            />
                        </div>
                    </div>
                )}



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
                    loadDataSources();
                    if (dataSource) {
                        handleDataSourceSelect(dataSource);
                    }
                }}
            />
        </div>
    );
};

export default EnhancedDataPanel;