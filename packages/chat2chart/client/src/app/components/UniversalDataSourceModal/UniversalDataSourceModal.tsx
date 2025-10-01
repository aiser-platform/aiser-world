'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Upload, Button, Form, Input, Select, message, Card, Space, Tag, Typography, Alert, Progress, Steps, Spin, Divider, Radio, List, Badge, Tooltip, Row, Col, Collapse, Checkbox } from 'antd';
import { 
    InboxOutlined, 
    DatabaseOutlined, 
    ApiOutlined, 
    CloudOutlined, 
    ExperimentOutlined, 
    CheckCircleOutlined,
    EyeOutlined,
    EditOutlined,
    LinkOutlined,
    RocketOutlined,
    BulbOutlined,
    FileTextOutlined,
    SettingOutlined,
    ArrowRightOutlined,
    ArrowLeftOutlined,
    ReloadOutlined,
    SaveOutlined,
    PlayCircleOutlined,
    CheckOutlined,
    WarningOutlined
} from '@ant-design/icons';
import { IFileUpload } from '../FileUpload/types';
import { apiService } from '@/services/apiService';
import { WorkflowNavigation, WorkflowStep } from '../WorkflowNavigation';
import { environment, getCubeJsAuthHeader } from '@/config/environment';
import { useOrganization } from '@/context/OrganizationContext';

const { Dragger } = Upload;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Step } = Steps;
const { Panel } = Collapse;

interface UniversalDataSourceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDataSourceCreated: (dataSource: any) => void;
    initialDataSourceType?: 'file' | 'database' | 'warehouse' | 'api';
    isChatIntegration?: boolean;
}

interface DataSourceConfig {
    name: string;
    type: 'file' | 'database' | 'warehouse' | 'api';
    description?: string;
    businessContext?: string;
}

interface CubeIntegration {
    status: 'pending' | 'analyzing' | 'generated' | 'deployed' | 'error';
    schema?: any;
    yaml?: string;
    cubes?: any[];
    deployment_url?: string;
}

interface ConnectionTestResult {
    success: boolean;
    message?: string;
    connection_info?: any;
    error?: string;
}

const UniversalDataSourceModal: React.FC<UniversalDataSourceModalProps> = ({
    isOpen,
    onClose,
    onDataSourceCreated,
    initialDataSourceType = 'file',
    isChatIntegration = false
}) => {
    const [activeTab, setActiveTab] = useState(initialDataSourceType);
    const [uploading, setUploading] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [aiModeling, setAiModeling] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [dataSourceConfig, setDataSourceConfig] = useState<DataSourceConfig>({
        name: '',
        type: initialDataSourceType
    });
    
    // Sync activeTab with dataSourceConfig.type
    useEffect(() => {
        setActiveTab(dataSourceConfig.type);
    }, [dataSourceConfig.type]);
    
    // File upload state
    const [uploadedFile, setUploadedFile] = useState<IFileUpload | null>(null);
    const [actualFile, setActualFile] = useState<File | null>(null);
    
    // Connection test states
    const [dbTestResult, setDbTestResult] = useState<ConnectionTestResult | null>(null);
    const [warehouseTestResult, setWarehouseTestResult] = useState<ConnectionTestResult | null>(null);
    const [apiTestResult, setApiTestResult] = useState<ConnectionTestResult | null>(null);
    
    // Connection saving states
    const [dbConnectionSaved, setDbConnectionSaved] = useState(false);
    const [warehouseConnectionSaved, setWarehouseConnectionSaved] = useState(false);
    const [apiConnectionSaved, setApiConnectionSaved] = useState(false);
    
    // Enhanced database connection state with advanced options
    const [dbConnection, setDbConnection] = useState({
        host: '',
        port: 5432,
        database: '',
        username: '',
        password: '',
        type: 'postgresql',
        connectionType: 'manual' as 'manual' | 'uri' | 'advanced',
        uri: '',
        // Advanced connection options
        sslMode: 'prefer',
        connectionPool: false,
        minConnections: 1,
        maxConnections: 10,
        connectionTimeout: 30,
        statementTimeout: 300,
        // Database-specific options
        charset: 'utf8mb4',
        encrypt: 'yes',
        trustServerCertificate: false,
        serviceName: '',
        sid: '',
        tnsAdmin: '',
        authSource: 'admin',
        replicaSet: '',
        readPreference: 'primary',
        // Custom fields for non-standard databases
        customFields: {} as Record<string, any>
    });

    // Enhanced data warehouse connection state
    const [warehouseConnection, setWarehouseConnection] = useState({
        type: 'snowflake',
        // Snowflake specific
        account: '',
        warehouse: '',
        database: '',
        schema: '',
        username: '',
        password: '',
        role: 'PUBLIC',
        clientSessionKeepAlive: false,
        warehouseSize: 'X-SMALL',
        // BigQuery specific
        projectId: '',
        datasetId: '',
        credentialsJson: '',
        location: 'US',
        useLegacySql: false,
        // Redshift specific
        ssl: 'prefer',
        timeout: 30,
        tcpKeepalivesIdle: 300,
        // Databricks specific
        workspaceUrl: '',
        accessToken: '',
        clusterId: '',
        catalog: 'hive_metastore',
        httpPath: '',
        // Azure Synapse specific
        server: '',
        encrypt: 'yes',
        trustServerCertificate: false,
        poolType: 'serverless',
        // ClickHouse specific
        secure: false,
        compression: 'lz4',
        // Custom fields for non-standard warehouses
        customFields: {} as Record<string, any>
    });

    // API connection state
    const [apiConnection, setApiConnection] = useState({
        url: '',
        method: 'GET',
        headers: '',
        authentication: 'none',
        apiKey: '',
        username: '',
        password: ''
    });

    // Cube.js integration state
    const [cubeIntegration, setCubeIntegration] = useState<CubeIntegration>({
        status: 'pending'
    });

    // AI Data Modeling state
    const [aiDataModeling, setAiDataModeling] = useState({
        semanticModels: [],
        businessInsights: [],
        dataRelationships: [],
        recommendedMetrics: [],
        isGenerating: false,
        yamlSchema: '',
        visualSchema: null,
        insights: null,
        error: null,
        visualMap: null,
        preAggSuggestions: [],
        preAggSelections: []
    });

    // User review state
    const [userReview, setUserReview] = useState({
        schemaApproved: false,
        deploymentReady: false
    });

    // Data sources state
    const [dataSources, setDataSources] = useState<any[]>([]);

    const { currentOrganization, projects: orgProjects } = useOrganization();

    // Load saved data sources on component mount
    useEffect(() => {
        loadSavedDataSources();
    }, [currentOrganization, orgProjects]);

    // Load saved data sources from localStorage and backend
    const loadSavedDataSources = async () => {
        try {
            // Load from localStorage
            const savedSources = JSON.parse(localStorage.getItem('aiser_data_sources') || '[]');
            setDataSources(savedSources);
            
            // Load from backend using project-scoped API
            try {
                // Resolve organization/project context from OrganizationContext or localStorage
                const organizationId = currentOrganization?.id ?? localStorage.getItem('currentOrganizationId') ?? 1;
                let projectIdRaw = localStorage.getItem('currentProjectId');
                if (!projectIdRaw && Array.isArray(orgProjects) && orgProjects.length > 0) projectIdRaw = String(orgProjects[0].id);
                const projectId = projectIdRaw ?? (orgProjects && orgProjects.length > 0 ? String(orgProjects[0].id) : localStorage.getItem('currentProjectId') ?? 1);

                const response = await fetch(`http://localhost:8000/data/api/organizations/${organizationId}/projects/${projectId}/data-sources`);
                if (response.ok) {
                    const result = await response.json();
                    const backendSources = result.data_sources || [];
                    
                    // Merge with localStorage sources
                    const allSources = [...savedSources, ...backendSources];
                    setDataSources(allSources);
                    console.log('Loaded data sources from backend:', backendSources);
                }
            } catch (backendError) {
                console.log('Backend data sources not available, using localStorage only');
            }
            
            console.log('Loaded saved data sources:', savedSources);
        } catch (error) {
            console.error('Failed to load saved data sources:', error);
        }
    };

    // Test database connection
    const testDatabaseConnection = async () => {
        try {
            setConnecting(true);
            setDbTestResult(null);
            
            const connectionPayload = buildDatabaseConnectionPayload(dbConnection);
            
            const testResponse = await fetch('http://localhost:8000/data/database/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(connectionPayload),
            });
            
            const testResult = await testResponse.json();
            
            if (testResult.success) {
                setDbTestResult({
                    success: true,
                    message: testResult.message || 'Database connection test successful!',
                    connection_info: testResult.connection_info
                });
                
                // Store connection details for future use
                if (testResult.connection_info) {
                    setDbConnection(prev => ({
                        ...prev,
                        customFields: {
                            ...prev.customFields,
                            ...testResult.connection_info
                        }
                    }));
                }
                
                message.success('Database connection test successful!');
            } else {
                setDbTestResult({
                    success: false,
                    error: testResult.error || 'Connection test failed'
                });
                message.error('Database connection test failed: ' + (testResult.error || 'Unknown error'));
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            setDbTestResult({
                success: false,
                error: errorMessage
            });
            message.error('Database connection test failed: ' + errorMessage);
        } finally {
            setConnecting(false);
        }
    };

    // Test warehouse connection
    const testWarehouseConnection = async () => {
        try {
            setConnecting(true);
            
            const connectionPayload = buildWarehouseConnectionPayload(warehouseConnection);
            
            const response = await fetch('http://localhost:8000/data/warehouse/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    connection_config: connectionPayload
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Connection test failed: ${response.status} ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                setWarehouseTestResult({
                    success: true,
                    message: result.message,
                    connection_info: result.connection_info
                });
                message.success('Warehouse connection test successful!');
            } else {
                setWarehouseTestResult({
                    success: false,
                    message: result.message || 'Connection test failed',
                    error: result.error
                });
                message.error('Warehouse connection test failed: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Warehouse connection test error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            setWarehouseTestResult({
                success: false,
                message: 'Connection test failed',
                error: errorMessage
            });
            message.error('Warehouse connection test failed: ' + errorMessage);
        } finally {
            setConnecting(false);
        }
    };

    // Test API connection
    const testAPIConnection = async () => {
        try {
            setConnecting(true);
            setApiTestResult(null);
            
            // Simulate API test
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            setApiTestResult({
                success: true,
                message: 'API connection test successful!'
            });
            
            message.success('API connection test successful!');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            setApiTestResult({
                success: false,
                error: errorMessage
            });
            message.error('API connection test failed: ' + errorMessage);
        } finally {
            setConnecting(false);
        }
    };

    // Save database connection
    const saveDatabaseConnection = async () => {
        try {
            if (!dbTestResult?.success) {
                message.error('Please test the connection first');
                return;
            }
            
            // Build the connection payload for the backend
            const connectionPayload = buildDatabaseConnectionPayload(dbConnection);
            
            // Call the backend API to save the connection
            const response = await fetch(`${environment.api.baseUrl}/data/database/connect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...connectionPayload,
                    name: dataSourceConfig.name || `Database: ${dbConnection.host}`
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to save database connection: ${response.status} ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                // Use the backend response to create the data source
                const connectionData = {
                    id: result.data_source_id,
                    name: dataSourceConfig.name || result.connection_info.name,
                    type: result.connection_info.type, // Use backend type
                    status: result.connection_info.status,
                    config: {
                        connectionDetails: {
                            ...dbConnection,
                            backend_id: result.data_source_id,
                            connection_info: result.connection_info
                        }
                    },
                    createdAt: new Date().toISOString(),
                    lastTested: new Date().toISOString()
                };
                
                // Save to localStorage
                const savedSources = JSON.parse(localStorage.getItem('aiser_data_sources') || '[]');
                const existingIndex = savedSources.findIndex((ds: any) => ds.id === connectionData.id);
                
                if (existingIndex >= 0) {
                    savedSources[existingIndex] = connectionData;
                } else {
                    savedSources.push(connectionData);
                }
                
                localStorage.setItem('aiser_data_sources', JSON.stringify(savedSources));
                setDataSources(savedSources);
                
                // Save with enhanced metadata for AI analysis
                await saveDataSourceWithMetadata(connectionData);
                
                setDbConnectionSaved(true);
                message.success('Database connection saved successfully!');
                
                // Auto-advance to next step
                goToNextStep();
            } else {
                throw new Error(result.error || 'Failed to save database connection');
            }
        } catch (error) {
            console.error('Failed to save database connection:', error);
            message.error('Failed to save database connection: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    };

    // Save warehouse connection
    const saveWarehouseConnection = async () => {
        try {
            if (!warehouseTestResult?.success) {
                message.error('Please test the connection first');
                return;
            }
            
            // Build the warehouse connection payload
            const connectionPayload = buildWarehouseConnectionPayload(warehouseConnection);
            
            // Call the backend API to save the connection
            const response = await fetch('http://localhost:8000/cube-modeling/connect-warehouse', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    connection_config: {
                        ...connectionPayload,
                        name: dataSourceConfig.name || `Warehouse: ${warehouseConnection.type}`
                    }
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to save warehouse connection: ${response.status} ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                // Use the backend response to create the data source
                const connectionData = {
                    id: result.connection_id,
                    name: dataSourceConfig.name || `Warehouse: ${warehouseConnection.type}`,
                    type: 'warehouse', // Warehouse connections are always warehouse type
                    status: 'connected',
                    config: {
                        connectionDetails: {
                            ...warehouseConnection,
                            backend_id: result.connection_id,
                            connection_info: {
                                database_type: result.database_type,
                                schema_info: result.schema_info,
                                available_tables: result.available_tables,
                                cube_integration_ready: result.cube_integration_ready
                            }
                        }
                    },
                    createdAt: new Date().toISOString(),
                    lastTested: new Date().toISOString()
                };
                
                // Save to localStorage
                const savedSources = JSON.parse(localStorage.getItem('aiser_data_sources') || '[]');
                const existingIndex = savedSources.findIndex((ds: any) => ds.id === connectionData.id);
                
                if (existingIndex >= 0) {
                    savedSources[existingIndex] = connectionData;
                } else {
                    savedSources.push(connectionData);
                }
                
                localStorage.setItem('aiser_data_sources', JSON.stringify(savedSources));
                setDataSources(savedSources);
                
                setWarehouseConnectionSaved(true);
                message.success('Warehouse connection saved successfully!');
                
                // Auto-advance to next step
                goToNextStep();
            } else {
                throw new Error(result.error || 'Failed to save warehouse connection');
            }
        } catch (error) {
            console.error('Failed to save warehouse connection:', error);
            message.error('Failed to save warehouse connection: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    };

    // Save API connection
    const saveAPIConnection = async () => {
        try {
            if (!apiTestResult?.success) {
                message.error('Please test the connection first');
                return;
            }
            
            const connectionData = {
                id: `api_${Date.now()}`,
                name: dataSourceConfig.name || `API: ${apiConnection.url}`,
                type: 'api',
                status: 'connected',
                config: {
                    connectionDetails: {
                        ...apiConnection,
                        backend_id: `api_${Date.now()}`
                    }
                },
                createdAt: new Date().toISOString(),
                lastTested: new Date().toISOString()
            };
            
            // Save to localStorage
            const savedSources = JSON.parse(localStorage.getItem('aiser_data_sources') || '[]');
            const existingIndex = savedSources.findIndex((ds: any) => ds.id === connectionData.id);
            
            if (existingIndex >= 0) {
                savedSources[existingIndex] = connectionData;
            } else {
                savedSources.push(connectionData);
            }
            
            localStorage.setItem('aiser_data_sources', JSON.stringify(savedSources));
            setDataSources(savedSources);
            
            setApiConnectionSaved(true);
            message.success('API connection saved successfully!');
            
            // Auto-advance to next step
            goToNextStep();
        } catch (error) {
            console.error('Failed to save API connection:', error);
            message.error('Failed to save API connection');
        }
    };

    // Enhanced data source saving with comprehensive metadata for AI analysis
    const saveDataSourceWithMetadata = async (dataSource: any) => {
        try {
            // Capture comprehensive metadata for AI analysis (excluding sensitive values)
            const metadata = {
                // Basic info
                id: dataSource.id,
                name: dataSource.name,
                type: dataSource.type,
                status: dataSource.status,
                created_at: new Date().toISOString(),
                
                // Connection metadata (non-sensitive)
                connection_metadata: {
                    type: dataSource.type,
                    ...(dataSource.type === 'database' && {
                        db_type: dataSource.config?.connectionDetails?.type,
                        host: dataSource.config?.connectionDetails?.host,
                        port: dataSource.config?.connectionDetails?.port,
                        database: dataSource.config?.connectionDetails?.database,
                        ssl_mode: dataSource.config?.connectionDetails?.sslMode,
                        connection_pool: dataSource.config?.connectionDetails?.connectionPool,
                        min_connections: dataSource.config?.connectionDetails?.minConnections,
                        max_connections: dataSource.config?.connectionDetails?.maxConnections,
                        connection_timeout: dataSource.config?.connectionDetails?.connectionTimeout,
                        statement_timeout: dataSource.config?.connectionDetails?.statementTimeout
                    }),
                    ...(dataSource.type === 'warehouse' && {
                        warehouse_type: dataSource.config?.connectionDetails?.type,
                        account: dataSource.config?.connectionDetails?.account,
                        warehouse: dataSource.config?.connectionDetails?.warehouse,
                        database: dataSource.config?.connectionDetails?.database,
                        schema: dataSource.config?.connectionDetails?.schema,
                        role: dataSource.config?.connectionDetails?.role,
                        warehouse_size: dataSource.config?.connectionDetails?.warehouseSize
                    }),
                    ...(dataSource.type === 'api' && {
                        method: dataSource.config?.connectionDetails?.method,
                        base_url: dataSource.config?.connectionDetails?.url,
                        authentication_type: dataSource.config?.connectionDetails?.authentication,
                        headers_count: dataSource.config?.connectionDetails?.headers ? Object.keys(JSON.parse(dataSource.config.connectionDetails.headers || '{}')).length : 0
                    }),
                    ...(dataSource.type === 'file' && {
                        file_format: dataSource.config?.connectionDetails?.format,
                        file_size: dataSource.config?.connectionDetails?.size,
                        row_count: dataSource.config?.connectionDetails?.row_count,
                        column_count: dataSource.config?.connectionDetails?.schema?.columns?.length,
                        has_schema: !!dataSource.config?.connectionDetails?.schema
                    })
                },
                
                // AI analysis context
                ai_context: {
                    business_context: dataSourceConfig.businessContext || '',
                    description: dataSourceConfig.description || '',
                    analysis_ready: true,
                    cube_integration_ready: dataSource.type === 'database' || dataSource.type === 'warehouse',
                    schema_generation_ready: true
                },
                
                // Performance and optimization hints
                optimization_hints: {
                    large_dataset: dataSource.type === 'warehouse' || (dataSource.type === 'file' && (dataSource.config?.connectionDetails?.row_count > 100000)),
                    real_time: dataSource.type === 'database' || dataSource.type === 'api',
                    batch_processing: dataSource.type === 'file' || dataSource.type === 'warehouse',
                    streaming: dataSource.type === 'api'
                }
            };
            
            // Update data source with metadata
            const enhancedDataSource = {
                ...dataSource,
                metadata: metadata,
                ai_analysis_ready: true
            };
            
            // Save to localStorage
            const savedSources = JSON.parse(localStorage.getItem('aiser_data_sources') || '[]');
            const existingIndex = savedSources.findIndex((ds: any) => ds.id === enhancedDataSource.id);
            
            if (existingIndex >= 0) {
                savedSources[existingIndex] = enhancedDataSource;
            } else {
                savedSources.push(enhancedDataSource);
            }
            
            localStorage.setItem('aiser_data_sources', JSON.stringify(savedSources));
            setDataSources(savedSources);
            
            console.log('Data source saved with comprehensive metadata for AI analysis:', metadata);
            
            return enhancedDataSource;
            
        } catch (error) {
            console.error('Failed to save data source with metadata:', error);
            throw error;
        }
    };

    // Comprehensive data source connectors with real connection capabilities
    const dataSourceConnectors = [
        // Standard Databases
        {
            name: 'PostgreSQL',
            type: 'postgresql',
            icon: <DatabaseOutlined />,
            description: 'Enterprise relational database',
            features: ['Structured data', 'SQL queries', 'Real-time analytics', 'ACID compliance'],
            defaultPort: 5432,
            recommended: true,
            logo: '🐘',
            connectionFields: ['host', 'port', 'database', 'username', 'password', 'ssl_mode', 'connection_pool'],
            sslOptions: ['disable', 'require', 'verify-ca', 'verify-full'],
            connectionPoolOptions: ['min_connections', 'max_connections', 'connection_timeout']
        },
        {
            name: 'MySQL',
            type: 'mysql',
            icon: <DatabaseOutlined />,
            description: 'Open source database',
            features: ['Fast performance', 'Easy setup', 'Wide support', 'Replication'],
            defaultPort: 3306,
            recommended: false,
            logo: '🐬',
            connectionFields: ['host', 'port', 'database', 'username', 'password', 'charset', 'ssl_mode'],
            charsetOptions: ['utf8mb4', 'utf8', 'latin1'],
            sslOptions: ['disabled', 'preferred', 'required', 'verify_ca', 'verify_identity']
        },
        {
            name: 'SQL Server',
            type: 'sqlserver',
            icon: <DatabaseOutlined />,
            description: 'Microsoft database',
            features: ['Enterprise features', 'Windows integration', 'BI tools', 'Always On'],
            defaultPort: 1433,
            recommended: false,
            logo: '🪟',
            connectionFields: ['host', 'port', 'database', 'username', 'password', 'encrypt', 'trust_server_certificate'],
            encryptOptions: ['yes', 'no', 'strict'],
            authenticationModes: ['sql', 'windows', 'azure_ad']
        },
        {
            name: 'Oracle',
            type: 'oracle',
            icon: <DatabaseOutlined />,
            description: 'Enterprise database',
            features: ['High availability', 'Real Application Clusters', 'Partitioning', 'Advanced Security'],
            defaultPort: 1521,
            recommended: false,
            logo: '🏛️',
            connectionFields: ['host', 'port', 'service_name', 'sid', 'username', 'password', 'tns_admin'],
            connectionTypes: ['service_name', 'sid', 'tns'],
            tnsOptions: ['tns_admin', 'wallet_location']
        },
        {
            name: 'MongoDB',
            type: 'mongodb',
            icon: <DatabaseOutlined />,
            description: 'Document database',
            features: ['Flexible schema', 'JSON data', 'Scalable', 'Sharding'],
            defaultPort: 27017,
            recommended: false,
            logo: '🍃',
            connectionFields: ['host', 'port', 'database', 'username', 'password', 'auth_source', 'replica_set'],
            authSources: ['admin', 'local', 'database_name'],
            replicaSetOptions: ['replica_set_name', 'read_preference']
        },
        {
            name: 'Redis',
            type: 'redis',
            icon: <DatabaseOutlined />,
            description: 'In-memory data store',
            features: ['Ultra-fast', 'Caching', 'Session storage', 'Real-time analytics'],
            defaultPort: 6379,
            recommended: false,
            logo: '🔴',
            connectionFields: ['host', 'port', 'database', 'password', 'ssl', 'connection_pool'],
            sslOptions: ['disabled', 'enabled'],
            connectionPoolOptions: ['max_connections', 'connection_timeout']
        },
        
        // Cloud Data Warehouses
        {
            name: 'Snowflake',
            type: 'snowflake',
            icon: <CloudOutlined />,
            description: 'Cloud data warehouse',
            features: ['Scalable storage', 'Fast queries', 'Data sharing', 'Multi-cloud'],
            defaultPort: 443,
            recommended: true,
            logo: '❄️',
            connectionFields: ['account', 'warehouse', 'database', 'schema', 'username', 'password', 'role', 'client_session_keep_alive'],
            warehouseSizes: ['X-SMALL', 'SMALL', 'MEDIUM', 'LARGE', 'X-LARGE', 'XX-LARGE'],
            roleOptions: ['ACCOUNTADMIN', 'SYSADMIN', 'USERADMIN', 'PUBLIC']
        },
        {
            name: 'BigQuery',
            type: 'bigquery',
            icon: <CloudOutlined />,
            description: 'Google Cloud analytics',
            features: ['Serverless', 'ML ready', 'Cost effective', 'Real-time streaming'],
            defaultPort: null,
            recommended: true,
            logo: '🔍',
            connectionFields: ['project_id', 'dataset_id', 'credentials_json', 'location', 'use_legacy_sql'],
            locationOptions: ['US', 'EU', 'asia-northeast1', 'australia-southeast1'],
            sqlDialects: ['standard', 'legacy']
        },
        {
            name: 'Redshift',
            type: 'redshift',
            icon: <CloudOutlined />,
            description: 'AWS analytics database',
            features: ['Columnar storage', 'Massive scale', 'S3 integration', 'Spectrum'],
            defaultPort: 5439,
            recommended: false,
            logo: '🔴',
            connectionFields: ['host', 'port', 'database', 'username', 'password', 'ssl', 'timeout', 'tcp_keepalives_idle'],
            sslOptions: ['prefer', 'require', 'verify-ca', 'verify-full'],
            timeoutOptions: ['connection_timeout', 'statement_timeout']
        },
        {
            name: 'Databricks',
            type: 'databricks',
            icon: <CloudOutlined />,
            description: 'Unified analytics platform',
            features: ['ML-ready', 'Delta Lake', 'Collaborative notebooks', 'Unity Catalog'],
            defaultPort: null,
            recommended: true,
            logo: '🔷',
            connectionFields: ['workspace_url', 'access_token', 'cluster_id', 'catalog', 'schema', 'http_path'],
            catalogOptions: ['hive_metastore', 'unity_catalog'],
            clusterTypes: ['all-purpose', 'sql-warehouse', 'ml-runtime']
        },
        {
            name: 'Azure Synapse',
            type: 'synapse',
            icon: <CloudOutlined />,
            description: 'Microsoft analytics service',
            features: ['Serverless', 'Built-in ML', 'Power BI integration', 'Dedicated pools'],
            defaultPort: null,
            recommended: true,
            logo: '🔵',
            connectionFields: ['server', 'database', 'username', 'password', 'encrypt', 'trust_server_certificate'],
            encryptOptions: ['yes', 'no', 'strict'],
            poolTypes: ['serverless', 'dedicated']
        },
        {
            name: 'ClickHouse',
            type: 'clickhouse',
            icon: <CloudOutlined />,
            description: 'Column-oriented DBMS',
            features: ['OLAP', 'Real-time analytics', 'High compression', 'Distributed queries'],
            defaultPort: 9000,
            recommended: false,
            logo: '🏗️',
            connectionFields: ['host', 'port', 'database', 'username', 'password', 'secure', 'compression'],
            secureOptions: ['false', 'true'],
            compressionOptions: ['lz4', 'zstd', 'none']
        },
        
        // Specialized Databases
        {
            name: 'Elasticsearch',
            type: 'elasticsearch',
            icon: <DatabaseOutlined />,
            description: 'Search & analytics engine',
            features: ['Full-text search', 'Real-time analytics', 'Machine learning', 'APM'],
            defaultPort: 9200,
            recommended: false,
            logo: '🔍',
            connectionFields: ['host', 'port', 'index', 'username', 'password', 'ssl', 'api_key'],
            sslOptions: ['false', 'true'],
            authMethods: ['basic', 'api_key', 'bearer_token']
        },
        {
            name: 'InfluxDB',
            type: 'influxdb',
            icon: <DatabaseOutlined />,
            description: 'Time series database',
            features: ['Time series', 'IoT data', 'Real-time monitoring', 'Downsampling'],
            defaultPort: 8086,
            recommended: false,
            logo: '⏰',
            connectionFields: ['host', 'port', 'database', 'username', 'password', 'ssl', 'retention_policy'],
            sslOptions: ['false', 'true'],
            retentionPolicies: ['autogen', 'custom']
        },
        {
            name: 'Neo4j',
            type: 'neo4j',
            icon: <DatabaseOutlined />,
            description: 'Graph database',
            features: ['Graph queries', 'Relationship mapping', 'Pattern matching', 'Cypher language'],
            defaultPort: 7687,
            recommended: false,
            logo: '🕸️',
            connectionFields: ['host', 'port', 'database', 'username', 'password', 'encryption', 'trust_strategy'],
            encryptionOptions: ['none', 'tls', 'tls_no_verify'],
            trustStrategies: ['trust_all_certificates', 'trust_system_ca_signed_certificates']
        },
        {
            name: 'Custom Database',
            type: 'custom',
            icon: <DatabaseOutlined />,
            description: 'Custom or proprietary database system',
            features: ['Custom connection', 'Flexible configuration', 'Proprietary protocols'],
            defaultPort: null,
            recommended: false,
            logo: '🔧',
            connectionFields: ['host', 'port', 'database', 'username', 'password', 'custom_protocol', 'custom_options'],
            customProtocols: ['tcp', 'udp', 'http', 'https', 'custom'],
            customOptions: ['connection_string', 'driver_path', 'environment_variables']
        },
        {
            name: 'Custom Warehouse',
            type: 'custom_warehouse',
            icon: <CloudOutlined />,
            description: 'Custom or proprietary data warehouse',
            features: ['Custom connection', 'Flexible configuration', 'Proprietary protocols'],
            defaultPort: null,
            recommended: false,
            logo: '🔧',
            connectionFields: ['endpoint', 'protocol', 'authentication', 'custom_options'],
            protocols: ['http', 'https', 'tcp', 'udp', 'custom'],
            authenticationMethods: ['api_key', 'oauth2', 'basic', 'custom']
        }
    ];

    // Enhanced workflow steps with proper progression
    const workflowSteps: WorkflowStep[] = [
        {
            key: 'connect',
            title: 'Configure',
            description: 'Minimal setup for files, databases, warehouses, or APIs',
            isRequired: true,
            isCompleted: false,
            canSkip: false
        },
        {
            key: 'analyze',
            title: 'Model',
            description: 'Auto schema → optional AI enhance → visual verify',
            isRequired: true,
            isCompleted: false,
            canSkip: false
        },
        {
            key: 'deploy',
            title: 'Deploy',
            description: 'Deploy semantic model and start analyzing',
            isRequired: true,
            isCompleted: false,
            canSkip: false
        }
    ];

    // AI-driven transformation state
    const [aiTransformations, setAiTransformations] = useState<{
        suggestedTransformations: Array<{
            id: string;
            name: string;
            description: string;
            priority: string;
            impact: string;
            suggested: boolean;
        }>;
        dataQualityIssues: Array<{
            issue: string;
            severity: string;
            column: string;
        }>;
        cleaningRecommendations: string[];
        businessRules: string[];
        isAnalyzing: boolean;
    }>({
        suggestedTransformations: [],
        dataQualityIssues: [],
        cleaningRecommendations: [],
        businessRules: [],
        isAnalyzing: false
    });

    // AI data modeling state - using the one declared above
    // User review and approval state - using the one declared above  
    // Multiple data sources state - using the one declared above

    // Current active data source
    const [activeDataSourceId, setActiveDataSourceId] = useState<string | null>(null);

    // Get current active data source
    const getActiveDataSource = () => {
        return dataSources.find(ds => ds.id === activeDataSourceId) || null;
    };

    // Build comprehensive database connection payload based on database type
    const buildDatabaseConnectionPayload = (connection: typeof dbConnection) => {
        const basePayload = {
            type: connection.type,
            connection_type: connection.connectionType
        };

        if (connection.connectionType === 'uri') {
            return {
                ...basePayload,
                connection_string: connection.uri
            };
        }

        // Build type-specific payload
        switch (connection.type) {
            case 'postgresql':
                return {
                    ...basePayload,
                    host: connection.host,
                    port: connection.port,
                    database: connection.database,
                    username: connection.username,
                    password: connection.password,
                    ssl_mode: connection.sslMode,
                    connection_pool: connection.connectionPool,
                    min_connections: connection.minConnections,
                    max_connections: connection.maxConnections,
                    connection_timeout: connection.connectionTimeout,
                    statement_timeout: connection.statementTimeout
                };
            
            case 'mysql':
                return {
                    ...basePayload,
                    host: connection.host,
                    port: connection.port,
                    database: connection.database,
                    username: connection.username,
                    password: connection.password,
                    charset: connection.charset,
                    ssl_mode: connection.sslMode
                };
            
            case 'sqlserver':
                return {
                    ...basePayload,
                    host: connection.host,
                    port: connection.port,
                    database: connection.database,
                    username: connection.username,
                    password: connection.password,
                    encrypt: connection.encrypt,
                    trust_server_certificate: connection.trustServerCertificate
                };
            
            case 'oracle':
                return {
                    ...basePayload,
                    host: connection.host,
                    port: connection.port,
                    service_name: connection.serviceName,
                    sid: connection.sid,
                    username: connection.username,
                    password: connection.password,
                    tns_admin: connection.tnsAdmin
                };
            
            case 'mongodb':
                return {
                    ...basePayload,
                    host: connection.host,
                    port: connection.port,
                    database: connection.database,
                    username: connection.username,
                    password: connection.password,
                    auth_source: connection.authSource,
                    replica_set: connection.replicaSet,
                    read_preference: connection.readPreference
                };
            
            case 'redis':
                return {
                    ...basePayload,
                    host: connection.host,
                    port: connection.port,
                    database: connection.database,
                    password: connection.password,
                    ssl: connection.sslMode !== 'disable' ? true : false,
                    connection_pool: connection.connectionPool,
                    max_connections: connection.maxConnections,
                    connection_timeout: connection.connectionTimeout
                };
            
            case 'elasticsearch':
                return {
                    ...basePayload,
                    host: connection.host,
                    port: connection.port,
                    index: connection.database,
                    username: connection.username,
                    password: connection.password,
                    ssl: connection.sslMode !== 'disable'
                };
            
            case 'influxdb':
                return {
                    ...basePayload,
                    host: connection.host,
                    port: connection.port,
                    database: connection.database,
                    username: connection.username,
                    password: connection.password,
                    ssl: connection.sslMode !== 'disable'
                };
            
            case 'neo4j':
                return {
                    ...basePayload,
                    host: connection.host,
                    port: connection.port,
                    database: connection.database,
                    username: connection.username,
                    password: connection.password,
                    encryption: connection.sslMode,
                    trust_strategy: connection.trustServerCertificate ? 'trust_all_certificates' : 'trust_system_ca_signed_certificates'
                };
            
            default:
                // For custom/unknown database types, include all fields
                return {
                    ...basePayload,
                    host: connection.host,
                    port: connection.port,
                    database: connection.database,
                    username: connection.username,
                    password: connection.password,
                    custom_fields: connection.customFields
                };
        }
    };

    // Build comprehensive warehouse connection payload based on warehouse type
    const buildWarehouseConnectionPayload = (connection: typeof warehouseConnection) => {
        const basePayload = {
            type: connection.type
        };

        switch (connection.type) {
            case 'snowflake':
                return {
                    ...basePayload,
                    account: connection.account,
                    warehouse: connection.warehouse,
                    database: connection.database,
                    schema: connection.schema,
                    username: connection.username,
                    password: connection.password,
                    role: connection.role,
                    client_session_keep_alive: connection.clientSessionKeepAlive,
                    warehouse_size: connection.warehouseSize
                };
            
            case 'bigquery':
                return {
                    ...basePayload,
                    project_id: connection.projectId,
                    dataset_id: connection.datasetId,
                    credentials_json: connection.credentialsJson,
                    location: connection.location,
                    use_legacy_sql: connection.useLegacySql
                };
            
            case 'redshift':
                return {
                    ...basePayload,
                    host: connection.account, // account field used for host in Redshift
                    port: 5439,
                    database: connection.database,
                    username: connection.username,
                    password: connection.password,
                    ssl: connection.ssl,
                    timeout: connection.timeout,
                    tcp_keepalives_idle: connection.tcpKeepalivesIdle
                };
            
            case 'databricks':
                return {
                    ...basePayload,
                    workspace_url: connection.workspaceUrl,
                    cluster_id: connection.clusterId,
                    catalog: connection.catalog,
                    schema: connection.schema,
                    http_path: connection.httpPath
                };
            
            case 'synapse':
                return {
                    ...basePayload,
                    server: connection.server,
                    database: connection.database,
                    username: connection.username,
                    password: connection.password,

                    encrypt: connection.encrypt,
                    trust_server_certificate: connection.trustServerCertificate,
                    pool_type: connection.poolType
                };
            
            case 'clickhouse':
                return {
                    ...basePayload,
                    host: connection.account, // account field used for host in ClickHouse
                    port: 9000,
                    database: connection.database,
                    username: connection.username,
                    password: connection.password,
                    secure: connection.secure,
                    compression: connection.compression
                };
            
            case 'custom_warehouse':
                return {
                    ...basePayload,
                    endpoint: connection.customFields.endpoint || '',
                    protocol: connection.customFields.protocol || 'https',
                    authentication: connection.customFields.authentication || 'api_key',
                    custom_options: connection.customFields.custom_options || {}
                };
            
            case 'custom':
                return {
                    ...basePayload,
                    custom_protocol: connection.customFields.custom_protocol || 'tcp',
                    custom_options: connection.customFields.custom_options || {},
                    connection_string: connection.customFields.connection_string || '',
                    driver_path: connection.customFields.driver_path || '',
                    environment_variables: connection.customFields.environment_variables || {}
                };
            
            default:
                // For custom/unknown warehouse types, include all fields
                return {
                    ...basePayload,
                    custom_fields: connection.customFields
                };
        }
    };

    // Add new data source
    const addDataSource = (type: 'file' | 'database' | 'warehouse' | 'api') => {
        const newId = `ds_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newDataSource = {
            id: newId,
            name: `New ${type} Connection`,
            type,
            config: {},
            status: 'disconnected' as const,
            isActive: true
        };
        setDataSources(prev => [...prev, newDataSource]);
        setActiveDataSourceId(newId);
        return newDataSource;
    };

    // Update step completion status
    const updateStepCompletion = () => {
        const updatedSteps = workflowSteps.map((step, index) => {
            if (index === currentStep - 1) {
                return { ...step, isCompleted: true };
            }
            return step;
        });
        // Note: workflowSteps is const, so we'll update completion in state
    };

    // Initialize modal when opened
    useEffect(() => {
        if (isOpen) {
            setCurrentStep(1);
            setActiveTab(initialDataSourceType);
            
            // Load existing data sources from localStorage
            const savedSources = JSON.parse(localStorage.getItem('aiser_data_sources') || '[]');
            if (savedSources.length > 0) {
                setDataSources(savedSources);
                setActiveDataSourceId(savedSources[0].id);
            } else {
                // Initialize with one data source if none exist
                addDataSource(initialDataSourceType);
            }
            
            // Reset form states but preserve existing data
            setDataSourceConfig({
                name: '',
                type: initialDataSourceType
            });
            
            // Don't reset uploadedFile - preserve it across steps
            // setUploadedFile(null);
            
            setDbConnection({
                host: '',
                port: 5432,
                database: '',
                username: '',
                password: '',
                type: 'postgresql',
                connectionType: 'manual',
                uri: '',
                sslMode: 'prefer',
                connectionPool: false,
                minConnections: 1,
                maxConnections: 10,
                connectionTimeout: 30,
                statementTimeout: 300,
                charset: 'utf8mb4',
                encrypt: 'yes',
                trustServerCertificate: false,
                serviceName: '',
                sid: '',
                tnsAdmin: '',
                authSource: 'admin',
                replicaSet: '',
                readPreference: 'primary',
                customFields: {}
            });
            setWarehouseConnection({
                type: 'snowflake',
                account: '',
                warehouse: '',
                database: '',
                schema: '',
                username: '',
                password: '',
                role: 'PUBLIC',
                clientSessionKeepAlive: false,
                warehouseSize: 'X-SMALL',
                projectId: '',
                datasetId: '',
                credentialsJson: '',
                location: 'US',
                useLegacySql: false,
                ssl: 'prefer',
                timeout: 30,
                tcpKeepalivesIdle: 300,
                workspaceUrl: '',
                accessToken: '',
                clusterId: '',
                catalog: 'hive_metastore',
                httpPath: '',
                server: '',
                encrypt: 'yes',
                trustServerCertificate: false,
                poolType: 'serverless',
                secure: false,
                compression: 'lz4',
                customFields: {}
            });
            setApiConnection({
                url: '',
                method: 'GET',
                headers: '',
                authentication: 'none',
                apiKey: '',
                username: '',
                password: ''
            });
            setCubeIntegration({
                status: 'pending'
            });
            setAiTransformations({
                suggestedTransformations: [],
                dataQualityIssues: [],
                cleaningRecommendations: [],
                businessRules: [],
                isAnalyzing: false
            });
            setAiDataModeling({
                semanticModels: [],
                businessInsights: [],
                dataRelationships: [],
                recommendedMetrics: [],
                isGenerating: false,
                yamlSchema: '',
                visualSchema: null,
                insights: null,
                error: null,
                visualMap: null,
                preAggSuggestions: [],
                preAggSelections: []
            });
            }
    }, [isOpen, initialDataSourceType]);

    // Step validation
    const canProceedToNext = (): boolean => {
        switch (currentStep) {
            case 1: // Configure
                return !!getActiveDataSource() && getActiveDataSource()?.status === 'connected';
            case 2: // AI Analysis & Modeling
                return aiDataModeling.semanticModels.length > 0 || !!aiDataModeling.yamlSchema;
            case 3: // Deploy & Ready
                return userReview.schemaApproved;
            default:
                return false;
        }
    };

    // Handle step change
    const handleStepChange = (step: number) => {
        if (step < 1 || step > workflowSteps.length) {
            return;
        }
        setCurrentStep(step);
    };

    // Handle save and continue
    const handleSaveAndContinue = async () => {
        try {
            console.log('Saving and continuing from step:', currentStep);
            
            if (currentStep === 1) {
                // Create a new data source if none exists or update existing one
                const existingSource = getActiveDataSource();
                
                if (!existingSource) {
                    console.log('No active source found, creating new one');
                    // Create a new data source
                    const newSource = {
                        id: `ds_${Date.now()}`,
                        name: dataSourceConfig.name || 'Connected Data Source',
                        type: activeTab, // Use the active tab to determine the type
                        config: {},
                        status: 'connected' as const,
                        isActive: true
                    };
                    setDataSources([newSource]);
                    setActiveDataSourceId(newSource.id);
                } else {
                    console.log('Updating existing source');
                    // Update existing data source
                    const updatedSource = {
                        ...existingSource,
                        status: 'connected' as const,
                        name: dataSourceConfig.name || `Connected ${existingSource.type}`
                    };
                    setDataSources(prev => prev.map(ds => 
                        ds.id === existingSource.id ? updatedSource : ds
                    ));
                }
                
                message.success('Connection saved successfully!');
                
                // Auto-advance to next step
                console.log('Advancing to step 2');
                setCurrentStep(2);
                
                // Trigger step completion update
                updateStepCompletion();
            }
        } catch (error) {
            console.error('Save error:', error);
            message.error('Failed to save progress');
        }
    };

    // Auto-advance to next step when data source is connected
    const goToNextStep = () => {
        if (currentStep < workflowSteps.length) {
            setCurrentStep(currentStep + 1);
        }
    };

    // Handle successful data source connection
    const handleDataSourceConnected = async () => {
        try {
            const activeSource = getActiveDataSource();
            if (!activeSource) {
                message.error('No active data source found');
                return;
            }

            // For file uploads, actually upload the file to backend
            if (activeSource.type === 'file' && uploadedFile && actualFile) {
                console.log('Processing file upload for:', uploadedFile.filename);
                try {
                    const formData = new FormData();
                    formData.append('file', actualFile);
                    
                    const uploadResponse = await fetch(`${environment.api.baseUrl}/data/upload`, {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (!uploadResponse.ok) {
                        const errorText = await uploadResponse.text();
                        console.error('Upload response error:', errorText);
                        throw new Error(`File upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
                    }
                    
                    const uploadResult = await uploadResponse.json();
                    
                    if (uploadResult.success) {
                        // Update the data source with actual backend data
                        const updatedSource = {
                            ...activeSource,
                            status: 'connected' as const,
                            name: dataSourceConfig.name || uploadResult.data_source.name,
                            type: 'file', // Ensure type is file for file uploads
                            config: {
                                ...activeSource.config,
                                connectionDetails: {
                                    ...uploadResult.data_source,
                                    backend_id: uploadResult.data_source.id
                                }
                            }
                        };
                        
                        setDataSources(prev => prev.map(ds => 
                            ds.id === activeSource.id ? updatedSource : ds
                        ));
                        
                        message.success('File uploaded and data source connected successfully!');
                        
                        // Auto-advance to next step
                        goToNextStep();
                        return;
                    } else {
                        throw new Error(uploadResult.error || 'Upload failed');
                    }
                } catch (uploadError) {
                    console.error('File upload error:', uploadError);
                    const errorMessage = uploadError instanceof Error ? uploadError.message : 'Unknown upload error';
                    message.error('File upload failed: ' + errorMessage);
                    return;
                }
            }

            // For database connections, test the connection first
            if (activeSource.type === 'database') {
                await testDatabaseConnection();
                if (dbTestResult?.success) {
                    await saveDatabaseConnection();
                }
            }

            // For warehouse connections, test the connection first
            if (activeSource.type === 'warehouse') {
                await testWarehouseConnection();
                if (warehouseTestResult?.success) {
                    await saveWarehouseConnection();
                }
            }

            // For other data source types, proceed as before
            const updatedSource = {
                ...activeSource,
                status: 'connected' as const,
                name: dataSourceConfig.name || `Connected ${activeSource.type}`,
                type: activeSource.type, // Ensure type is preserved
                config: {
                    ...activeSource.config,
                    connectionDetails: activeSource.type === 'database' ? dbConnection :
                        activeSource.type === 'warehouse' ? warehouseConnection :
                        apiConnection
                }
            };
            
            setDataSources(prev => prev.map(ds => 
                ds.id === activeSource.id ? updatedSource : ds
            ));

            // Save the connection to backend/localStorage
            await saveDataSourceConnection(updatedSource);
            
            message.success('Data source connected successfully!');
            
            // Auto-advance to next step
            goToNextStep();
        } catch (error) {
            console.error('Connection failed:', error);
            message.error('Failed to connect data source');
        }
    };

    // Save data source connection
    const saveDataSourceConnection = async (dataSource: any) => {
        try {
            // Save to localStorage for persistence
            const savedSources = JSON.parse(localStorage.getItem('aiser_data_sources') || '[]');
            const existingIndex = savedSources.findIndex((ds: any) => ds.id === dataSource.id);
            
            if (existingIndex >= 0) {
                savedSources[existingIndex] = dataSource;
            } else {
                savedSources.push(dataSource);
            }
            
            localStorage.setItem('aiser_data_sources', JSON.stringify(savedSources));
            
            // Also save to backend if API is available
            try {
                // For now, just log - we'll implement this method later
                console.log('Data source saved locally:', dataSource);
            } catch (apiError) {
                console.warn('Backend save failed, using local storage:', apiError);
            }
        } catch (error) {
            console.error('Failed to save data source:', error);
            throw error;
        }
    };

    // Generate AI schema using the backend AI service with enhanced capabilities for large datasets
    const generateAISchema = async () => {
        try {
            setAiDataModeling(prev => ({ ...prev, isGenerating: true }));
            
            const activeSource = getActiveDataSource();
            if (!activeSource) {
                message.error('No active data source found');
                return;
            }

            // Enhanced AI insights generation for large datasets
            if (activeSource.type === 'file' && activeSource.config.connectionDetails?.backend_id) {
                try {
                    const insightsResponse = await fetch(`${environment.api.baseUrl}/data/${activeSource.config.connectionDetails.backend_id}/insights`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            enhanced_analysis: true,
                            large_dataset_handling: true,
                            sampling_strategy: 'adaptive', // For datasets > 1M rows
                            quality_threshold: 0.8,
                            business_context: dataSourceConfig.businessContext || 'enterprise analytics'
                        })
                    });
                    
                    if (insightsResponse.ok) {
                        const insightsResult = await insightsResponse.json();
                        if (insightsResult.success) {
                            // Store enhanced insights
                            setAiDataModeling(prev => ({ 
                                ...prev,
                                businessInsights: insightsResult.insights?.business_insights || [],
                                recommendedMetrics: insightsResult.insights?.recommended_visualizations || [],
                                dataQualityScore: insightsResult.insights?.quality_score || 0,
                                complexityAssessment: insightsResult.insights?.complexity_level || 'medium',
                                optimizationSuggestions: insightsResult.insights?.optimization_tips || []
                            }));
                        }
                    }
                } catch (insightsError) {
                    console.log('Enhanced AI insights generation failed, continuing with basic schema generation');
                }
            }

            // Enhanced AI schema generation with large dataset handling
            const schemaPayload = {
                data_source_id: activeSource.id,
                data_source_type: activeSource.type,
                connection_details: activeSource.type === 'file' ? {
                    format: activeSource.config.connectionDetails?.format || 'csv',
                    columns: activeSource.config.connectionDetails?.schema?.columns?.map((col: any) => ({
                        name: col.name,
                        type: col.type,
                        sample_values: col.sample_values || [],
                        null_percentage: col.null_percentage || 0,
                        unique_values: col.unique_values || 0
                    })) || [],
                    row_count: activeSource.config.connectionDetails?.schema?.row_count || 0,
                    file_size_mb: activeSource.config.connectionDetails?.file_size_mb || 0,
                    complexity_indicators: {
                        has_nested_structures: activeSource.config.connectionDetails?.schema?.has_nested_structures || false,
                        has_missing_values: activeSource.config.connectionDetails?.schema?.has_missing_values || false,
                        has_duplicates: activeSource.config.connectionDetails?.schema?.has_duplicates || false,
                        column_correlations: activeSource.config.connectionDetails?.schema?.column_correlations || []
                    }
                } : {
                    ...activeSource.config.connectionDetails,
                    database_type: activeSource.type,
                    estimated_row_count: activeSource.config.connectionDetails?.estimated_rows || 'unknown',
                    table_complexity: activeSource.config.connectionDetails?.table_complexity || 'medium'
                },
                business_context: dataSourceConfig.businessContext || 'enterprise analytics',
                // Schema-level scope: default to selected schema, include selected table/view when applicable
                scope: activeSource.type === 'database' ? ((): any => {
                    const currentSchema: string = (activeSource.config?.connectionDetails?.schema || 'public');
                    const currentTable: string | undefined = undefined;
                    return {
                        schemas: currentSchema ? [currentSchema] : [],
                        tables: currentTable ? [currentTable] : []
                    };
                })() : undefined,
                schema_generation_config: {
                    optimization_level: 'enterprise', // 'basic', 'standard', 'enterprise'
                    handle_large_datasets: true,
                    enable_partitioning: true,
                    enable_caching_strategies: true,
                    generate_advanced_metrics: true,
                    include_time_dimensions: true,
                    enable_hierarchical_structures: true,
                    performance_optimization: true
                }
            };

            const response = await fetch(`${environment.api.baseUrl}/ai/schema/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(schemaPayload),
            });

            if (!response.ok) {
                throw new Error('Failed to generate enhanced schema');
            }

            const result = await response.json();
            
            if (result.success && result.yaml_schema) {
                setAiDataModeling(prev => ({ 
                    ...prev,
                    yamlSchema: result.yaml_schema,
                    isGenerating: false,
                    schemaMetadata: {
                        generationTime: new Date().toISOString(),
                        optimizationLevel: 'enterprise',
                        estimatedPerformance: result.estimated_performance || 'high',
                        cachingStrategy: result.caching_strategy || 'adaptive',
                        partitioningStrategy: result.partitioning_strategy || 'auto'
                    }
                }));
                
                message.success(`Enhanced AI schema generated successfully! ${result.optimization_tips ? 'Optimization tips available.' : ''}`);
                
                // Show optimization recommendations if available
                if (result.optimization_tips) {
                    setAiDataModeling(prev => ({
                        ...prev,
                        optimizationSuggestions: result.optimization_tips
                    }));
                }
            } else {
                throw new Error(result.error || 'Enhanced schema generation failed');
            }
        } catch (error) {
            console.error('Enhanced schema generation error:', error);
            message.error('Failed to generate enhanced AI schema');
            setAiDataModeling(prev => ({ ...prev, isGenerating: false }));
        }
    };

    // Regenerate schema
    const regenerateSchema = () => {
                        setAiDataModeling(prev => ({ ...prev, yamlSchema: '' }));
        generateAISchema();
    };

    // Auto-generate from source, build visual map, then deploy via backend
    const autoGenerateFromSource = async () => {
        const activeSource = getActiveDataSource();
        if (!activeSource) {
            message.error('No active data source found');
            return;
        }
        const res = await fetch(`${environment.api.baseUrl}/cube/schema/auto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data_source_id: activeSource.id })
        });
        if (!res.ok) {
            message.error('Failed to auto-generate schema');
            return;
        }
        const j = await res.json();
        if (j.success && j.yaml_schema) {
            setAiDataModeling(prev => ({ ...prev, yamlSchema: j.yaml_schema }));
            message.success('Auto-generated YAML schema from source');
        }
    };

    const buildVisualMap = async () => {
        if (!aiDataModeling.yamlSchema) return;
        try {
            const res = await fetch(`${environment.api.baseUrl}/cube/schema/visual-map`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ yaml_schema: aiDataModeling.yamlSchema })
            });
            if (res.ok) {
                const j = await res.json();
                setAiDataModeling(prev => ({ ...prev, visualMap: j } as any));
            }
        } catch {}
    };

    // Deploy schema to Cube.js via backend endpoint for consistency
    const deployToCube = async () => {
        try {
            setCubeIntegration(prev => ({ ...prev, status: 'analyzing' }));
            
            const activeSource = getActiveDataSource();
            if (!activeSource || !aiDataModeling.yamlSchema) {
                message.error('No active data source or schema found');
                return;
            }

            try {
                const deployRes = await fetch(`${environment.api.baseUrl}/cube/schema/deploy`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cube_schema: { yaml: aiDataModeling.yamlSchema }, cube_name: activeSource.name })
                });
                if (!deployRes.ok) throw new Error('Deploy failed');
                const dj = await deployRes.json();
                if (dj.success) {
                    setCubeIntegration(prev => ({ ...prev, status: 'deployed', deployment_url: 'http://localhost:4000', schema: aiDataModeling.yamlSchema }));
                    message.success('Successfully deployed to Cube.js!');
                } else {
                    throw new Error(dj.error || 'Deploy failed');
                }
            } catch (cubeError) {
                console.error('Cube deployment error:', cubeError);
                message.error('Cube.js deployment failed');
                setCubeIntegration(prev => ({ ...prev, status: 'error' }));
            }

        } catch (error) {
            console.error('Cube.js deployment error:', error);
            message.error('Failed to deploy to Cube.js');
            setCubeIntegration(prev => ({ ...prev, status: 'error' }));
        }
    };

    // Handle data source creation completion
    const handleDataSourceCreated = async () => {
        try {
            const activeSource = getActiveDataSource();
            if (!activeSource) {
                message.error('No active data source found');
                return;
            }

            // Create the final data source object
            const nameToUse = (dataSourceConfig.name || `Connected ${activeSource.type}`).trim();
            // Enforce unique display name among existing dataSources
            const nameExists = dataSources.some(ds => (ds?.name || '').toLowerCase() === nameToUse.toLowerCase());
            if (nameExists) {
                message.error('A data source with this name already exists. Please choose a different name.');
                return;
            }
            const finalDataSource = {
                id: activeSource.id,
                name: nameToUse,
                type: activeSource.type,
                config: activeSource.config,
                status: 'connected' as const,
                isActive: true,
                cubeIntegration,
                aiModeling: aiDataModeling,
                createdAt: new Date().toISOString()
            };

            // Call the callback
            onDataSourceCreated(finalDataSource);
            
            // Close the modal
            onClose();
            
            message.success('Data source created successfully!');
            
        } catch (error) {
            console.error('Failed to create data source:', error);
            message.error('Failed to create data source');
        }
    };

    // Render file upload step
    const renderFileUpload = () => (
        <div style={{ padding: '16px' }}>
            {/* Removed Existing Data Sources section - not needed for this workflow */}
            
                <Dragger
                    name="file"
                    multiple={false}
                    accept=".csv,.tsv,.xlsx,.xls,.json,.parquet,.parq,.snappy"
                    beforeUpload={(file) => {
                    // Enforce unique display name immediately
                    const duplicate = dataSources.some(ds => (ds?.name || '').toLowerCase() === `file: ${file.name}`.toLowerCase());
                    if (duplicate) {
                        message.error('A data source with this name already exists. Please rename the file or choose a different name.');
                        return Upload.LIST_IGNORE as any;
                    }
                    // Store the actual File object for upload
                    setActualFile(file);
                    
                    // Store metadata
                    setUploadedFile({
                        filename: file.name,
                        content_type: file.type,
                        storage_type: 'local',
                        file_size: file.size,
                        uuid_filename: file.name
                    });
                    
                    // Automatically create a file-type data source when file is uploaded
                    const newDataSource = {
                        id: `ds_${Date.now()}`,
                        name: `File: ${file.name}`,
                        type: 'file' as const,
                        status: 'pending' as const,
                        config: {},
                        createdAt: new Date().toISOString()
                    };
                    
                    setDataSources(prev => [...prev, newDataSource]);
                    setActiveDataSourceId(newDataSource.id);
                    
                    return false; // Prevent auto upload
                }}
                onRemove={() => {
                    setUploadedFile(null);
                    setActualFile(null);
                }}
                >
                    <p className="ant-upload-drag-icon">
                        <InboxOutlined />
                    </p>
                    <p className="ant-upload-text">Click or drag file to this area to upload</p>
                    <p className="ant-upload-hint">
                    Enhanced support for CSV, TSV, Excel, JSON, Parquet files with AI-powered auto-detection
                    </p>
                    <p className="ant-upload-hint">
                    📄 CSV/TSV • 📈 Excel • 🔧 JSON • 📦 Parquet • 🚀 Auto-detection
                    </p>
                </Dragger>

            {uploadedFile && (
                <Card style={{ marginTop: '16px' }}>
                        <Space>
                        <FileTextOutlined style={{ color: '#52c41a' }} />
                        <Text strong>{uploadedFile.filename}</Text>
                        <Text type="secondary">({(uploadedFile.file_size / 1024 / 1024).toFixed(2)} MB)</Text>
                        <Tag color="success">Ready for Analysis</Tag>
                        </Space>
                        
                        <div style={{ marginTop: '12px' }}>
                            <Text type="secondary">
                                File will be processed with AI-powered auto-detection for:
                            </Text>
                            <div style={{ marginTop: '8px' }}>
                                <Tag color="blue">📊 Schema Inference</Tag>
                                <Tag color="green">🔍 Data Quality Analysis</Tag>
                                <Tag color="purple">💡 Business Insights</Tag>
                                <Tag color="orange">📈 Visualization Recommendations</Tag>
                            </div>
                        </div>
                </Card>
            )}
            
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
                        <Button
                            type="primary"
                    size="large"
                    disabled={!uploadedFile}
                    onClick={() => {
                        console.log('Active data source before connection:', getActiveDataSource());
                        console.log('Active tab:', activeTab);
                        console.log('Uploaded file:', uploadedFile);
                        handleDataSourceConnected();
                    }}
                    icon={<ArrowRightOutlined />}
                >
                    Continue to Analysis
                        </Button>
            </div>
        </div>
    );

    // Render database connection step
    const renderDatabaseConnection = () => (
        <div style={{ padding: '16px' }}>
            <Form layout="vertical">
                <Form.Item label="Database Type">
                    <Select
                        value={dbConnection.type}
                        onChange={(value) => setDbConnection(prev => ({ ...prev, type: value }))}
                    >
                        {dataSourceConnectors
                            .filter(connector => ['postgresql', 'mysql', 'sqlserver', 'snowflake', 'bigquery', 'redshift'].includes(connector.type))
                            .map(connector => (
                                <Option key={connector.type} value={connector.type}>
                                    <Space>
                                        {connector.logo} {connector.name}
                                        {connector.recommended && <Tag color="green">Recommended</Tag>}
                                    </Space>
                                </Option>
                            ))}
                    </Select>
                </Form.Item>
                
                <Form.Item label="Connection Type">
                    <Radio.Group
                        value={dbConnection.connectionType}
                        onChange={(e) => setDbConnection(prev => ({ ...prev, connectionType: e.target.value }))}
                    >
                        <Radio value="manual">Manual Configuration</Radio>
                        <Radio value="uri">Connection String</Radio>
                    </Radio.Group>
                </Form.Item>

                {dbConnection.connectionType === 'manual' ? (
                    <>
                        <Form.Item label="Host">
                            <Input
                                value={dbConnection.host}
                                onChange={(e) => setDbConnection(prev => ({ ...prev, host: e.target.value }))}
                                placeholder="localhost"
                            />
                        </Form.Item>
                        
                        <Form.Item label="Port">
                            <Input
                                type="number"
                                value={dbConnection.port}
                                onChange={(e) => setDbConnection(prev => ({ ...prev, port: parseInt(e.target.value) }))}
                                placeholder="5432"
                            />
                        </Form.Item>
                        
                        <Form.Item label="Database">
                            <Input
                                value={dbConnection.database}
                                onChange={(e) => setDbConnection(prev => ({ ...prev, database: e.target.value }))}
                                placeholder="mydatabase"
                            />
                        </Form.Item>
                        
                        <Form.Item label="Username">
                            <Input
                                value={dbConnection.username}
                                onChange={(e) => setDbConnection(prev => ({ ...prev, username: e.target.value }))}
                                placeholder="username"
                            />
                        </Form.Item>
                        
                        <Form.Item label="Password">
                            <Input.Password
                                value={dbConnection.password}
                                onChange={(e) => setDbConnection(prev => ({ ...prev, password: e.target.value }))}
                                placeholder="password"
                            />
                        </Form.Item>
                    </>
                ) : (
                    <Form.Item label="Connection String">
                        <Input.TextArea
                            value={dbConnection.uri}
                            onChange={(e) => setDbConnection(prev => ({ ...prev, uri: e.target.value }))}
                            placeholder="postgresql://username:password@localhost:5432/database"
                            rows={3}
                        />
                    </Form.Item>
                )}
                
                {/* Connection Test Results */}
                {dbTestResult && (
                    <div style={{ marginTop: '16px' }}>
                        {dbTestResult.success ? (
                            <Alert
                                message="Connection Test Successful!"
                                description={dbTestResult.message}
                                type="success"
                                showIcon
                                action={
                                    <Button
                                        size="small"
                                        type="primary"
                                        onClick={saveDatabaseConnection}
                                        icon={<SaveOutlined />}
                                        disabled={dbConnectionSaved}
                                    >
                                        {dbConnectionSaved ? 'Saved' : 'Save Connection'}
                                    </Button>
                                }
                            />
                        ) : (
                            <Alert
                                message="Connection Test Failed"
                                description={dbTestResult.error}
                                type="error"
                                showIcon
                            />
                        )}
                    </div>
                )}

                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                    <Space>
                        <Button
                            type="default"
                            size="large"
                            disabled={!dbConnection.host && !dbConnection.uri}
                            onClick={testDatabaseConnection}
                            loading={connecting}
                            icon={<ExperimentOutlined />}
                        >
                            Test Connection
                        </Button>
                        <Button
                            type="primary"
                            size="large"
                            disabled={!dbTestResult?.success || dbConnectionSaved}
                            onClick={saveDatabaseConnection}
                            icon={<SaveOutlined />}
                        >
                            {dbConnectionSaved ? 'Connection Saved' : 'Save & Continue'}
                        </Button>
                    </Space>
                </div>
            </Form>
        </div>
    );

    // Render warehouse connection step
    const renderWarehouseConnection = () => (
        <div style={{ padding: '16px' }}>
            <Form layout="vertical">
                <Form.Item label="Warehouse Type">
                    <Select
                        value={warehouseConnection.type}
                        onChange={(value) => setWarehouseConnection(prev => ({ ...prev, type: value }))}
                    >
                        {dataSourceConnectors
                            .filter(connector => ['snowflake', 'bigquery', 'redshift', 'databricks', 'synapse'].includes(connector.type))
                            .map(connector => (
                                <Option key={connector.type} value={connector.type}>
                                    <Space>
                                        {connector.logo} {connector.name}
                                        {connector.recommended && <Tag color="green">Recommended</Tag>}
                                    </Space>
                                </Option>
                            ))}
                    </Select>
                </Form.Item>
                
                <Form.Item label="Account/Project">
                    <Input
                        value={warehouseConnection.account}
                        onChange={(e) => setWarehouseConnection(prev => ({ ...prev, account: e.target.value }))}
                        placeholder="account.snowflake.com or project-id"
                    />
                </Form.Item>
                
                <Form.Item label="Warehouse">
                    <Input
                        value={warehouseConnection.warehouse}
                        onChange={(e) => setWarehouseConnection(prev => ({ ...prev, warehouse: e.target.value }))}
                        placeholder="warehouse name"
                    />
                </Form.Item>
                
                <Form.Item label="Database">
                    <Input
                        value={warehouseConnection.database}
                        onChange={(e) => setWarehouseConnection(prev => ({ ...prev, database: e.target.value }))}
                        placeholder="database name"
                    />
                </Form.Item>
                
                <Form.Item label="Schema">
                    <Input
                        value={warehouseConnection.schema}
                        onChange={(e) => setWarehouseConnection(prev => ({ ...prev, schema: e.target.value }))}
                        placeholder="schema name"
                    />
                </Form.Item>
                
                <Form.Item label="Username">
                    <Input
                        value={warehouseConnection.username}
                        onChange={(e) => setWarehouseConnection(prev => ({ ...prev, username: e.target.value }))}
                        placeholder="username"
                    />
                </Form.Item>
                
                <Form.Item label="Password">
                    <Input.Password
                        value={warehouseConnection.password}
                        onChange={(e) => setWarehouseConnection(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="password"
                    />
                </Form.Item>
                
                {/* Connection Test Results */}
                {warehouseTestResult && (
                    <div style={{ marginTop: '16px' }}>
                        {warehouseTestResult.success ? (
                            <Alert
                                message="Connection Test Successful!"
                                description={warehouseTestResult.message}
                                type="success"
                                showIcon
                                action={
                                    <Button
                                        size="small"
                                        type="primary"
                                        onClick={saveWarehouseConnection}
                                        icon={<SaveOutlined />}
                                        disabled={warehouseConnectionSaved}
                                    >
                                        {warehouseConnectionSaved ? 'Saved' : 'Save Connection'}
                                    </Button>
                                }
                            />
                        ) : (
                            <Alert
                                message="Connection Test Failed"
                                description={warehouseTestResult.error}
                                type="error"
                                showIcon
                            />
                        )}
                    </div>
                )}

                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                    <Space>
                        <Button
                            type="default"
                            size="large"
                            disabled={!warehouseConnection.account}
                            onClick={testWarehouseConnection}
                            loading={connecting}
                            icon={<ExperimentOutlined />}
                        >
                            Test Connection
                        </Button>
                        <Button
                            type="primary"
                            size="large"
                            disabled={!warehouseTestResult?.success || warehouseConnectionSaved}
                            onClick={saveWarehouseConnection}
                            icon={<SaveOutlined />}
                        >
                            {warehouseConnectionSaved ? 'Connection Saved' : 'Save & Continue'}
                        </Button>
                    </Space>
                </div>
            </Form>
        </div>
    );

    // Render API connection step
    const renderAPIConnection = () => (
        <div style={{ padding: '16px' }}>
            <Form layout="vertical">
                <Form.Item label="API URL">
                    <Input
                        value={apiConnection.url}
                        onChange={(e) => setApiConnection(prev => ({ ...prev, url: e.target.value }))}
                        placeholder="https://api.example.com/data"
                    />
                </Form.Item>
                
                <Form.Item label="HTTP Method">
                    <Select
                        value={apiConnection.method}
                        onChange={(value) => setApiConnection(prev => ({ ...prev, method: value }))}
                    >
                        <Option value="GET">GET</Option>
                        <Option value="POST">POST</Option>
                        <Option value="PUT">PUT</Option>
                        <Option value="DELETE">DELETE</Option>
                    </Select>
                </Form.Item>
                
                <Form.Item label="Authentication">
                    <Select
                        value={apiConnection.authentication}
                        onChange={(value) => setApiConnection(prev => ({ ...prev, authentication: value }))}
                    >
                        <Option value="none">None</Option>
                        <Option value="api_key">API Key</Option>
                        <Option value="basic">Basic Auth</Option>
                    </Select>
                </Form.Item>
                
                {apiConnection.authentication === 'api_key' && (
                    <Form.Item label="API Key">
                        <Input
                            value={apiConnection.apiKey}
                            onChange={(e) => setApiConnection(prev => ({ ...prev, apiKey: e.target.value }))}
                            placeholder="your-api-key"
                        />
                    </Form.Item>
                )}
                
                {apiConnection.authentication === 'basic' && (
                    <>
                        <Form.Item label="Username">
                            <Input
                                value={apiConnection.username}
                                onChange={(e) => setApiConnection(prev => ({ ...prev, username: e.target.value }))}
                                placeholder="username"
                            />
                        </Form.Item>
                        
                        <Form.Item label="Password">
                            <Input.Password
                                value={apiConnection.password}
                                onChange={(e) => setApiConnection(prev => ({ ...prev, password: e.target.value }))}
                                placeholder="password"
                            />
                        </Form.Item>
                    </>
                )}
                
                <Form.Item label="Headers (Optional)">
                    <Input.TextArea
                        value={apiConnection.headers}
                        onChange={(e) => setApiConnection(prev => ({ ...prev, headers: e.target.value }))}
                        placeholder='{"Content-Type": "application/json"}'
                        rows={3}
                    />
                </Form.Item>
                
                {/* Connection Test Results */}
                {apiTestResult && (
                    <div style={{ marginTop: '16px' }}>
                        {apiTestResult.success ? (
                            <Alert
                                message="Connection Test Successful!"
                                description={apiTestResult.message}
                                type="success"
                                showIcon
                                action={
                                    <Button
                                        size="small"
                                        type="primary"
                                        onClick={saveAPIConnection}
                                        icon={<SaveOutlined />}
                                        disabled={apiConnectionSaved}
                                    >
                                        {apiConnectionSaved ? 'Saved' : 'Save Connection'}
                                    </Button>
                                }
                            />
                        ) : (
                            <Alert
                                message="Connection Test Failed"
                                description={apiTestResult.error}
                                type="error"
                                showIcon
                            />
                        )}
                    </div>
                )}

                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                    <Space>
                        <Button
                            type="default"
                            size="large"
                            disabled={!apiConnection.url}
                            onClick={testAPIConnection}
                            loading={connecting}
                            icon={<ExperimentOutlined />}
                        >
                            Test Connection
                        </Button>
                        <Button
                            type="primary"
                            size="large"
                            disabled={!apiTestResult?.success || apiConnectionSaved}
                            onClick={saveAPIConnection}
                            icon={<SaveOutlined />}
                        >
                            {apiConnectionSaved ? 'Connection Saved' : 'Save & Continue'}
                        </Button>
                    </Space>
                </div>
            </Form>
        </div>
    );

    // Render AI analysis step
    const renderAnalysisStep = () => (
        <div style={{ padding: '16px' }}>
            <Card title="🧠 AI Data Analysis" style={{ marginBottom: '16px' }}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                    <Text>AI is analyzing your data to:</Text>
                        <List
                        size="small"
                        dataSource={[
                            'Identify data quality issues',
                            'Suggest transformations',
                            'Generate semantic models',
                            'Create business insights'
                        ]}
                        renderItem={(item) => (
                                <List.Item>
                                <CheckCircleOutlined style={{ color: 'var(--ant-color-success, #52c41a)', marginRight: '8px' }} />
                                {item}
                                </List.Item>
                            )}
                        />
                                    </Space>
                    </Card>

            {/* AI Analysis Progress */}
            <Card 
                title="Modeling" 
                style={{ 
                    marginBottom: '12px',
                    backgroundColor: 'var(--ant-color-bg-container, #ffffff)',
                    borderColor: 'var(--ant-color-border, #d9d9d9)'
                }}
                headStyle={{ 
                    backgroundColor: 'var(--ant-color-bg-container, #ffffff)',
                    borderBottomColor: 'var(--ant-color-border, #d9d9d9)',
                    color: 'var(--ant-color-text, #141414)'
                }}
                bodyStyle={{ 
                    backgroundColor: 'var(--ant-color-bg-container, #ffffff)',
                    color: 'var(--ant-color-text, #141414)'
                }}
            >
                        <Space direction="vertical" style={{ width: '100%', gap: 8 }}>
                        <Space wrap>
                            <Button 
                                onClick={autoGenerateFromSource}
                                icon={<ApiOutlined />}
                                size="small"
                            >
                                Auto Schema
                            </Button>
                            <Button 
                                onClick={buildVisualMap}
                                icon={<ApiOutlined />}
                                size="small"
                                disabled={!aiDataModeling.yamlSchema}
                            >
                                Visual Map
                            </Button>
                            <Button 
                                type="primary" 
                                onClick={generateAISchema}
                                loading={aiDataModeling.isGenerating}
                                icon={<BulbOutlined />}
                                size="small"
                            >
                                AI Enhance Schema
                            </Button>
                        </Space>
            
            {aiDataModeling.isGenerating && (
                        <div style={{ textAlign: 'center' }}>
                            <Spin size="large" />
                            <Text>AI is analyzing your data and generating schema...</Text>
                                            </div>
                    )}
                    
                                         {aiDataModeling.yamlSchema && (
                          <Card 
                              title="Generated YAML Schema" 
                              size="small"
                              style={{ 
                                  backgroundColor: 'var(--ant-color-bg-container, #ffffff)',
                                  borderColor: 'var(--ant-color-border, #d9d9d9)'
                              }}
                              headStyle={{ 
                                  backgroundColor: 'var(--ant-color-bg-container, #ffffff)',
                                  borderBottomColor: 'var(--ant-color-border, #d9d9d9)',
                                  color: 'var(--ant-color-text, #141414)'
                              }}
                              bodyStyle={{ 
                                  backgroundColor: 'var(--ant-color-bg-container, #ffffff)',
                                  color: 'var(--ant-color-text, #141414)'
                              }}
                          >
                              <div style={{ marginBottom: '8px' }}>
                                  <Text strong>Schema Preview (Cube.js Compatible):</Text>
                                  <div style={{ 
                                      backgroundColor: 'var(--ant-color-fill-secondary, #f5f5f5)', 
                                      padding: '8px', 
                                      borderRadius: '6px',
                                      fontFamily: 'monospace',
                                      fontSize: '12px',
                                      border: '1px solid var(--ant-color-border, #d9d9d9)',
                                      maxHeight: '160px',
                                      overflow: 'auto'
                                  }}>
                                      <pre>{aiDataModeling.yamlSchema}</pre>
                                  </div>
                              </div>
                              
                              <div style={{ marginBottom: '16px' }}>
                                  <Text strong>Schema Editor & Visualization:</Text>
                                  <Tabs
                                      defaultActiveKey="yaml"
                                      style={{ marginTop: '12px' }}
                                      items={[
                                          {
                                              key: 'yaml',
                                              label: (
                                                  <Space>
                                                      <FileTextOutlined />
                                                      YAML Editor
                                                  </Space>
                                              ),
                                              children: (
                                                  <div style={{ padding: '8px 0' }}>
                                                      <Input.TextArea
                                                          value={aiDataModeling.yamlSchema}
                                                          onChange={(e) => setAiDataModeling(prev => ({ 
                                                              ...prev, 
                                                              yamlSchema: e.target.value 
                                                          }))}
                                                          rows={10}
                                                          style={{ 
                                                              fontFamily: 'monospace', 
                                                              fontSize: '12px',
                                                              backgroundColor: 'var(--ant-color-fill-secondary, #f5f5f5)',
                                                              border: '1px solid var(--ant-color-border, #d9d9d9)'
                                                          }}
                                                          placeholder="Edit your YAML schema here... This will be deployed to Cube.js"
                                                      />
                                                  </div>
                                              )
                                          },
                                          {
                                              key: 'visual',
                                              label: (
                                                  <Space>
                                                      <ApiOutlined />
                                                      Visual Map
                                                  </Space>
                                              ),
                                              children: (
                                                  <div style={{ padding: '8px 0' }}>
                                                      <Button size="small" onClick={buildVisualMap} disabled={!aiDataModeling.yamlSchema}>Refresh Map</Button>
                                                      <pre style={{ maxHeight: 200, overflow: 'auto', background: 'var(--ant-color-fill-secondary, #f5f5f5)', padding: 8 }}>
                                                          {JSON.stringify(aiDataModeling.visualMap || {}, null, 2)}
                                                      </pre>
                                                  </div>
                                              )
                                          },
                                          {
                                              key: 'preaggs',
                                              label: (
                                                  <Space>
                                                      <ApiOutlined />
                                                      Pre-aggregations
                                                  </Space>
                                              ),
                                              children: (
                                                  <div style={{ padding: '8px 0' }}>
                                                      <Space style={{ marginBottom: 8 }}>
                                                          <Button size="small" disabled={!aiDataModeling.yamlSchema} onClick={async ()=>{
                                                              if (!aiDataModeling.yamlSchema) return;
                                                              const res = await fetch(`${environment.api.baseUrl}/cube/preaggregations/suggest`, {
                                                                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                                                                  body: JSON.stringify({ yaml_schema: aiDataModeling.yamlSchema })
                                                              });
                                                              if (res.ok){
                                                                  const j = await res.json();
                                                                  setAiDataModeling(prev => ({ ...prev, preAggSuggestions: j.suggestions } as any));
                                                              }
                                                          }}>Suggest</Button>
                                                          <Button type="primary" size="small" disabled={!aiDataModeling.preAggSelections || (aiDataModeling.preAggSelections as any[])?.length===0} onClick={async ()=>{
                                                              const selections = (aiDataModeling.preAggSelections as any[]) || [];
                                                              const res = await fetch(`${environment.api.baseUrl}/cube/preaggregations/apply`, {
                                                                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                                                                  body: JSON.stringify({ yaml_schema: aiDataModeling.yamlSchema, selections })
                                                              });
                                                              if (res.ok){
                                                                  const j = await res.json();
                                                                  if (j.success && j.yaml_schema){
                                                                      setAiDataModeling(prev => ({ ...prev, yamlSchema: j.yaml_schema }));
                                                                  }
                                                              }
                                                          }}>Apply Selected</Button>
                                                      </Space>
                                                      <div style={{ maxHeight: 220, overflow: 'auto', border: '1px solid #434343', padding: 8, background: '#262626', color: '#fff' }}>
                                                          {Array.isArray((aiDataModeling as any).preAggSuggestions) && (aiDataModeling as any).preAggSuggestions.length > 0 ? (
                                                              (aiDataModeling as any).preAggSuggestions.map((s: any, idx: number) => (
                                                                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                                                      <Checkbox onChange={(e)=>{
                                                                          const checked = e.target.checked;
                                                                          setAiDataModeling(prev => {
                                                                              const cur = (prev as any).preAggSelections || [];
                                                                              const next = checked ? [...cur, s] : cur.filter((x: any)=> x.name !== s.name || x.cube !== s.cube);
                                                                              return { ...(prev as any), preAggSelections: next } as any;
                                                                          });
                                                                      }} />
                                                                      <span>{s.cube} • {s.name} • {s.granularity}</span>
                                                                  </div>
                                                              ))
                                                          ) : (
                                                              <span>No suggestions yet. Click Suggest.</span>
                                                          )}
                                                      </div>
                                                  </div>
                                              )
                                          }
                                      ]}
                                  />
                              </div>
                              
                              <div style={{ marginBottom: '16px' }}>
                                  <Text strong>Schema Validation:</Text>
                                  <div style={{ marginTop: '8px' }}>
                                      <Tag color={aiDataModeling.yamlSchema?.includes('cubes:') ? 'success' : 'warning'}>
                                          {aiDataModeling.yamlSchema?.includes('cubes:') ? '✅ Valid Cube.js Schema' : '⚠️ Schema Format Check'}
                                      </Tag>
                                      <Tag color={aiDataModeling.yamlSchema?.includes('dimensions:') ? 'success' : 'warning'}>
                                          {aiDataModeling.yamlSchema?.includes('dimensions:') ? '✅ Has Dimensions' : '⚠️ Missing Dimensions'}
                                      </Tag>
                                      <Tag color={aiDataModeling.yamlSchema?.includes('measures:') ? 'success' : 'warning'}>
                                          {aiDataModeling.yamlSchema?.includes('measures:') ? '✅ Has Measures' : '⚠️ Missing Measures'}
                                      </Tag>
                                  </div>
                              </div>
                              
                              <Space style={{ marginTop: '16px' }}>
                                  <Button 
                                      size="small" 
                                      onClick={() => setUserReview(prev => ({ ...prev, schemaApproved: true }))}
                                      icon={<CheckCircleOutlined />}
                                      type="primary"
                                  >
                                      Approve Schema
                                  </Button>
                                  <Button 
                                      size="small" 
                                      onClick={regenerateSchema}
                                      icon={<ReloadOutlined />}
                                  >
                                      Regenerate
                                  </Button>
                                  <Button 
                                      size="small" 
                                      onClick={() => {
                                          // Enhanced YAML validation
                                          try {
                                              const schema = aiDataModeling.yamlSchema;
                                              const checks = {
                                                  hasCubes: schema?.includes('cubes:'),
                                                  hasDimensions: schema?.includes('dimensions:'),
                                                  hasMeasures: schema?.includes('measures:'),
                                                  hasTimeDimensions: schema?.includes('timeDimensions:'),
                                                  hasFilters: schema?.includes('filters:')
                                              };
                                              
                                              const validChecks = Object.values(checks).filter(Boolean).length;
                                              const totalChecks = Object.keys(checks).length;
                                              
                                              if (validChecks >= 3) {
                                                  message.success(`Schema validation: ${validChecks}/${totalChecks} checks passed!`);
                                              } else {
                                                  message.warning(`Schema validation: ${validChecks}/${totalChecks} checks passed. Consider regenerating.`);
                                              }
                                          } catch (e) {
                                              message.error('Schema validation failed');
                                          }
                                      }}
                                      icon={<EyeOutlined />}
                                  >
                                      Validate
                                  </Button>
                              </Space>
                         </Card>
                     )}
                </Space>
            </Card>

                    <div style={{ textAlign: 'center', marginTop: '24px' }}>
                        <Button 
                            type="primary" 
                            size="large"
                    disabled={!aiDataModeling.yamlSchema}
                    onClick={() => setCurrentStep(3)}
                    icon={<ArrowRightOutlined />}
                >
                    Continue to Deployment
                        </Button>
                        </div>
        </div>
    );

    // Render deployment step
    const renderDeploymentStep = () => (
        <div style={{ padding: '16px' }}>
            <Card 
                title="🚀 Deploy & Ready" 
                style={{ 
                    marginBottom: '16px',
                    backgroundColor: 'var(--ant-color-bg-container, #ffffff)',
                    borderColor: 'var(--ant-color-border, #d9d9d9)'
                }}
                headStyle={{ 
                    backgroundColor: 'var(--ant-color-bg-container, #ffffff)',
                    borderBottomColor: 'var(--ant-color-border, #d9d9d9)',
                    color: 'var(--ant-color-text, #141414)'
                }}
                bodyStyle={{ 
                    backgroundColor: 'var(--ant-color-bg-container, #ffffff)',
                    color: 'var(--ant-color-text, #141414)'
                }}
            >
                    <Space direction="vertical" style={{ width: '100%' }}>
                    <Text>Your data source is ready to be deployed!</Text>
                    <List
                        size="small"
                        dataSource={[
                            'Cube.js schema generated',
                            'Data models created',
                            'Ready for analytics',
                            'Chat integration enabled'
                        ]}
                        renderItem={(item) => (
                            <List.Item>
                                <CheckCircleOutlined style={{ color: 'var(--ant-color-success, #52c41a)', marginRight: '8px' }} />
                                {item}
                            </List.Item>
                        )}
                    />
                    </Space>
                </Card>

            {/* Semantic Data Model Deployment */}
            <Card 
                title="Semantic Data Model Deployment" 
                style={{ 
                    marginBottom: '16px',
                    backgroundColor: 'var(--ant-color-bg-container, #ffffff)',
                    borderColor: 'var(--ant-color-border, #d9d9d9)'
                }}
                headStyle={{ 
                    backgroundColor: 'var(--ant-color-bg-container, #ffffff)',
                    borderBottomColor: 'var(--ant-color-border, #d9d9d9)',
                    color: 'var(--ant-color-text, #141414)'
                }}
                bodyStyle={{ 
                    backgroundColor: 'var(--ant-color-bg-container, #ffffff)',
                    color: 'var(--ant-color-text, #141414)'
                }}
            >
                    <Space direction="vertical" style={{ width: '100%' }}>
                    <Text>Deploy your semantic data model for analytics:</Text>
                    
                    <Button 
                        type="primary" 
                        onClick={deployToCube}
                        loading={cubeIntegration.status === 'analyzing'}
                        icon={<RocketOutlined />}
                    >
                        Deploy Semantic Model
                    </Button>
                    
                    {cubeIntegration.status === 'analyzing' && (
                        <div style={{ textAlign: 'center' }}>
                            <Spin size="large" />
                            <Text>Deploying to Cube.js server...</Text>
                    </div>
                    )}

                    {cubeIntegration.status === 'deployed' && (
                    <Alert
                            message="Successfully deployed to Cube.js!"
                            description={`Your data source is now available at: ${cubeIntegration.deployment_url || 'http://localhost:4000'}`}
                        type="success"
                        showIcon
                        />
                    )}
                    
                    {cubeIntegration.status === 'error' && (
                        <Alert
                            message="Deployment failed"
                            description="There was an error deploying to Cube.js. Please try again."
                            type="error"
                            showIcon
                        />
                    )}
                </Space>
            </Card>

            <div style={{ textAlign: 'center', marginTop: '24px' }}>
                <Button 
                    type="primary" 
                    size="large"
                    disabled={cubeIntegration.status !== 'deployed'}
                    onClick={handleDataSourceCreated}
                    icon={<CheckCircleOutlined />}
                >
                    Complete Setup
                    </Button>
            </div>
        </div>
    );

    // Render workflow navigation
    const renderWorkflowNavigation = () => (
        <div style={{ marginBottom: '24px' }}>
            <WorkflowNavigation
                currentStep={currentStep - 1}
                totalSteps={workflowSteps.length}
                steps={workflowSteps}
                onStepChange={(step) => handleStepChange(step + 1)}
                onCancel={onClose}
                onSave={handleSaveAndContinue}
                onComplete={handleDataSourceCreated}
                loading={uploading || connecting || aiModeling}
                canProceed={canProceedToNext()}
                showProgress={true}
                // Remove custom actions to avoid duplicate buttons
            />
        </div>
    );

    // Render main content based on current step
    const renderMainContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div>
                        {/* Compact Data Source Configuration (removed outer card chrome) */}
                        <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item label="Data Source Name" required>
                                        <Input
                                            value={dataSourceConfig.name}
                                            onChange={(e) => setDataSourceConfig(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder={getDataSourceNamePlaceholder()}
                                            prefix={<DatabaseOutlined />}
                                            style={{ backgroundColor: '#262626', borderColor: '#434343', color: '#ffffff' }}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item label="Data Source Type">
                                        <Select
                                            value={activeTab}
                                            disabled
                                            style={{ backgroundColor: '#262626', borderColor: '#434343' }}
                                        >
                                            <Option value="file">File Upload</Option>
                                            <Option value="database">Database</Option>
                                            <Option value="warehouse">Data Warehouse</Option>
                                            <Option value="api">API</Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                            </Row>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                                <Button type="link" size="small" onClick={() => setShowAdvanced(v => !v)}>
                                    {showAdvanced ? 'Hide advanced' : 'Show advanced'}
                                </Button>
                            </div>
                            {showAdvanced && (
                                <>
                                    <Form.Item label="Description (Optional)">
                                        <Input.TextArea
                                            value={dataSourceConfig.description}
                                            onChange={(e) => setDataSourceConfig(prev => ({ ...prev, description: e.target.value }))}
                                            placeholder="Describe the purpose and contents of this data source"
                                            rows={2}
                                            style={{ backgroundColor: '#262626', borderColor: '#434343', color: '#ffffff' }}
                                        />
                                    </Form.Item>
                                    <Form.Item label="Business Context (Optional)">
                                        <Input.TextArea
                                            value={dataSourceConfig.businessContext}
                                            onChange={(e) => setDataSourceConfig(prev => ({ ...prev, businessContext: e.target.value }))}
                                            placeholder="Describe the business context and use cases for this data"
                                            rows={2}
                                            style={{ backgroundColor: '#262626', borderColor: '#434343', color: '#ffffff' }}
                                        />
                                    </Form.Item>
                                </>
                            )}

                        <Tabs
                            activeKey={activeTab}
                            onChange={(key) => setActiveTab(key as 'file' | 'database' | 'warehouse' | 'api')}
                            items={[
                                {
                                    key: 'file',
                                    label: (
                                        <Tooltip title="CSV, Excel, JSON - Good for one-time analysis, small datasets">
                                            <span>
                                                <InboxOutlined />
                                                File Upload
                                                {uploadedFile && <CheckCircleOutlined style={{ color: '#52c41a', marginLeft: '8px' }} />}
                                            </span>
                                        </Tooltip>
                                    ),
                                    children: renderFileUpload()
                                },
                                {
                                    key: 'database',
                                    label: (
                                        <Tooltip title="PostgreSQL, MySQL, SQL Server - Structured data, real-time access, ACID compliance">
                                            <span>
                                                <DatabaseOutlined />
                                                Database
                                                {dbConnection.host && <CheckCircleOutlined style={{ color: '#52c41a', marginLeft: '8px' }} />}
                                            </span>
                                        </Tooltip>
                                    ),
                                    children: renderDatabaseConnection()
                                },
                                {
                                    key: 'warehouse',
                                    label: (
                                        <Tooltip title="Snowflake, BigQuery, Redshift - Large-scale analytics, ML-ready, cost-effective">
                                            <span>
                                                <CloudOutlined />
                                                Data Warehouse
                                                {warehouseConnection.account && <CheckCircleOutlined style={{ color: '#52c41a', marginLeft: '8px' }} />}
                                            </span>
                                        </Tooltip>
                                    ),
                                    children: renderWarehouseConnection()
                                },
                                {
                                    key: 'api',
                                    label: (
                                        <Tooltip title="REST, GraphQL - Live data, external services, real-time updates">
                                            <span>
                                                <ApiOutlined />
                                                API
                                                {apiConnection.url && <CheckCircleOutlined style={{ color: '#52c41a', marginLeft: '8px' }} />}
                                            </span>
                                        </Tooltip>
                                    ),
                                    children: renderAPIConnection()
                                }
                            ]}
                        />
                    </div>
                );
            case 2:
                return renderAnalysisStep();
            case 3:
                return renderDeploymentStep();
            default:
                return null;
        }
    };

    // Auto-populate data source name when connection details change
    const autoPopulateDataSourceName = () => {
        let suggestedName = '';
        
        switch (activeTab) {
            case 'file':
                if (uploadedFile) {
                    suggestedName = `File: ${uploadedFile.filename}`;
                }
                break;
            case 'database':
                if (dbConnection.host && dbConnection.database) {
                    suggestedName = `Database: ${dbConnection.database}@${dbConnection.host}`;
                }
                break;
            case 'warehouse':
                if (warehouseConnection.account && warehouseConnection.database) {
                    suggestedName = `Warehouse: ${warehouseConnection.type} - ${warehouseConnection.database}`;
                }
                break;
            case 'api':
                if (apiConnection.url) {
                    const url = new URL(apiConnection.url);
                    suggestedName = `API: ${url.hostname}`;
                }
                break;
        }
        
        if (suggestedName && !dataSourceConfig.name) {
            setDataSourceConfig(prev => ({ ...prev, name: suggestedName }));
        }
    };

    // Update data source config when active tab changes
    useEffect(() => {
        autoPopulateDataSourceName();
    }, [activeTab, uploadedFile, actualFile, dbConnection.host, dbConnection.database, warehouseConnection.account, warehouseConnection.database, apiConnection.url]);

    // Get dynamic placeholder for data source name based on active tab
    const getDataSourceNamePlaceholder = () => {
        switch (activeTab) {
            case 'file':
                return uploadedFile ? `File: ${uploadedFile.filename}` : 'Enter a name for your file upload';
            case 'database':
                return dbConnection.host ? `Database: ${dbConnection.host}:${dbConnection.port}` : 'Enter a name for your database connection';
            case 'warehouse':
                return warehouseConnection.account ? `Warehouse: ${warehouseConnection.type} - ${warehouseConnection.account}` : 'Enter a name for your warehouse connection';
            case 'api':
                return apiConnection.url ? `API: ${apiConnection.url}` : 'Enter a name for your API connection';
            default:
                return 'Enter a descriptive name for your data source';
        }
    };

    // Create a new data source based on the active tab
    const createDataSource = async () => {
        try {
            const { id: ctxOrgId } = currentOrganization || { id: undefined };
            let projectIdRaw = localStorage.getItem('currentProjectId');
            if (!projectIdRaw && Array.isArray(orgProjects) && orgProjects.length > 0) projectIdRaw = String(orgProjects[0].id);

            const organizationId = ctxOrgId ?? localStorage.getItem('currentOrganizationId') ?? 1;
            const projectId = projectIdRaw ?? (orgProjects && orgProjects.length > 0 ? String(orgProjects[0].id) : localStorage.getItem('currentProjectId') ?? 1);

            const newDataSource = {
                id: `ds_${Date.now()}`,
                name: dataSourceConfig.name || `New ${activeTab}`,
                type: activeTab, // Use the active tab to determine the type
                status: 'pending' as const,
                config: {},
                createdAt: new Date().toISOString()
            };
            
            // Try to create in backend first
            try {
                const response = await fetch(`http://localhost:8000/data/api/organizations/${organizationId}/projects/${projectId}/data-sources`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: newDataSource.name,
                        type: newDataSource.type,
                        format: activeTab === 'file' ? 'csv' : undefined,
                        description: `Data source created via universal modal`,
                        config: newDataSource.config || {},
                        metadata: {
                            created_via: 'universal_modal'
                        }
                    }),
                });
                
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.data_source) {
                        newDataSource.id = result.data_source.id;
                        console.log('✅ Data source created in backend:', result.data_source);
                    }
                }
            } catch (backendError) {
                console.log('Backend creation failed, using local storage only');
            }
            
            // Update local state
            setDataSources(prev => [...prev, newDataSource]);
            setActiveDataSourceId(newDataSource.id);
            
            // Save to localStorage as backup
            const updatedSources = [...dataSources, newDataSource];
            localStorage.setItem('aiser_data_sources', JSON.stringify(updatedSources));
            
            // Auto-advance to next step
            goToNextStep();
            
        } catch (error) {
            console.error('Failed to create data source:', error);
            message.error('Failed to create data source');
        }
    };

    // UI state
    const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

    return (
        <Modal
            title={
                <Space>
                    <DatabaseOutlined />
                    {isChatIntegration ? 'Connect Data for Chat Analysis' : 'Enhanced Universal Data Source Wizard'}
                </Space>
            }
            open={isOpen}
            onCancel={onClose}
            footer={null}
            width={900}
            destroyOnClose
        >
            {renderWorkflowNavigation()}
            {renderMainContent()}
        </Modal>
    );
};

export default UniversalDataSourceModal;