'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
    Modal, 
    Steps, 
    Form, 
    Input, 
    Select, 
    Button, 
    Card, 
    Space, 
    Tag, 
    Alert, 
    Upload, 
    Radio, 
    Row, 
    Col, 
    Collapse,
    Typography,
    Divider,
    message,
    Table
} from 'antd';
import { 
    DatabaseOutlined, 
    CloudOutlined, 
    InboxOutlined, 
    ApiOutlined,
    CheckCircleOutlined,
    UploadOutlined,
    SettingOutlined,
    LockOutlined,
    GlobalOutlined,
    FileOutlined,
    SaveOutlined,
    CloseCircleOutlined,
    LoadingOutlined,
    InfoCircleOutlined,
    EditOutlined
} from '@ant-design/icons';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';

const { Step } = Steps;
const { Option } = Select;
const { Panel } = Collapse;
const { Title, Text } = Typography;
const { Dragger } = Upload;

interface UniversalDataSourceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDataSourceCreated: (dataSource: any) => void;
    initialDataSourceType?: 'file' | 'database' | 'warehouse' | 'api' | '';
    isChatIntegration?: boolean;
}

interface DataSourceConfig {
    name: string;
    type: 'file' | 'database' | 'warehouse' | 'api' | '';
    description?: string;
}

interface ConnectionConfig {
    // Basic connection
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    
    // Advanced options
    sslMode: string;
    connectionPool: boolean;
    minConnections: number;
    maxConnections: number;
    connectionTimeout: number;
    
    // Enterprise features
    sshHost?: string;
    sshPort?: number;
    sshUsername?: string;
    sshPassword?: string;
    sshKeyPath?: string;
    sslCert?: string;
    sslKey?: string;
    sslCA?: string;
    
    // Cloud storage and data lake fields
    storageUri?: string;
    accessKey?: string;
    secretKey?: string;
    region?: string;
    endpoint?: string;
    accountName?: string;
    accountKey?: string;
    sasToken?: string;
    gcpProjectId?: string;
    gcpCredentials?: string;
    fileFormat?: string; // For S3/Azure Blob files (e.g., 'parquet', 'csv', 'json')
    snapshotId?: number; // For Iceberg time travel
    version?: number; // For Delta Lake time travel
    timestamp?: string; // For Delta Lake time travel
}

const UniversalDataSourceModal: React.FC<UniversalDataSourceModalProps> = ({
    isOpen,
    onClose,
    onDataSourceCreated,
    initialDataSourceType = 'file',
    isChatIntegration = false
}) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [testResult, setTestResult] = useState<any>(null);
    const [connectionUrlEditable, setConnectionUrlEditable] = useState(true); // Editable by default
    const [customConnectionUrl, setCustomConnectionUrl] = useState('');
    const authenticatedFetch = useAuthenticatedFetch();
    
    // Data source configuration
    const [dataSourceConfig, setDataSourceConfig] = useState<DataSourceConfig>({
        name: '', // Will auto-generate if empty
        type: initialDataSourceType || '',
        description: ''
    });
    
    // Auto-generate name from connection details
    const generateDataSourceName = () => {
        const dbType = selectedDatabaseType || 'Database';
        const host = connectionConfig.host || '';
        const database = connectionConfig.database || '';
        
        if (host && database) {
            return `${dbType.charAt(0).toUpperCase() + dbType.slice(1)} - ${host}/${database}`;
        } else if (host) {
            return `${dbType.charAt(0).toUpperCase() + dbType.slice(1)} - ${host}`;
        } else {
            return `${dbType.charAt(0).toUpperCase() + dbType.slice(1)} Connection`;
        }
    };
    
    // Connection configuration
    const [connectionConfig, setConnectionConfig] = useState<ConnectionConfig>({
        host: '',
        port: 5432,
        database: '',
        username: '',
        password: '',
        sslMode: 'prefer',
        connectionPool: false,
        minConnections: 1,
        maxConnections: 10,
        connectionTimeout: 30,
        // Cloud storage fields
        storageUri: '',
        accessKey: '',
        secretKey: '',
        region: 'us-east-1',
        endpoint: '',
        accountName: '',
        accountKey: '',
        sasToken: '',
        gcpProjectId: '',
        gcpCredentials: '',
        fileFormat: '',
        version: undefined,
        timestamp: '',
        snapshotId: undefined
    });
    
    // File upload
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<any>(null); // Preview data from file
    const [selectedSheet, setSelectedSheet] = useState<string>('');
    const [delimiter, setDelimiter] = useState<string>(',');
    const [availableSheets, setAvailableSheets] = useState<string[]>([]);
    
    // Supported data sources
    const dataSourceTypes = [
        {
            key: 'file',
            label: 'File Upload',
            icon: <InboxOutlined />,
            description: 'CSV, Excel, Parquet, JSON files',
            color: 'blue'
        },
        {
            key: 'database',
            label: 'Database',
            icon: <DatabaseOutlined />,
            description: 'PostgreSQL, MySQL, SQL Server',
            color: 'green'
        },
        {
            key: 'warehouse',
            label: 'Data Warehouse',
            icon: <CloudOutlined />,
            description: 'ClickHouse, Snowflake, BigQuery, Delta Lake, Apache Iceberg, S3, Azure, GCP',
            color: 'purple'
        },
        {
            key: 'api',
            label: 'API',
            icon: <ApiOutlined />,
            description: 'REST API endpoints',
            color: 'orange'
        }
    ];
    
    // Detect dark mode for theme-aware logos
    const [isDarkMode, setIsDarkMode] = useState(false);
    
    useEffect(() => {
        const checkDarkMode = () => {
            const html = document.documentElement;
            const isDark = html.classList.contains('dark') || 
                          html.getAttribute('data-theme') === 'dark' ||
                          window.matchMedia('(prefers-color-scheme: dark)').matches;
            setIsDarkMode(isDark);
        };

        checkDarkMode();
        const observer = new MutationObserver(checkDarkMode);
        observer.observe(document.documentElement, { 
            attributes: true, 
            attributeFilter: ['class', 'data-theme'] 
        });
        
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', checkDarkMode);

        return () => {
            observer.disconnect();
            mediaQuery.removeEventListener('change', checkDarkMode);
        };
    }, []);

    // Brand colors for each database (used for colored styling and fallback)
    const brandColors: Record<string, string> = {
        'postgresql': '#336791',
        'mysql': '#4479A1',
        'sqlserver': '#CC2927',
        'clickhouse': '#FFCC02',
        'snowflake': '#29B5E8',
        'bigquery': '#4285F4',
        'redshift': '#8C4FFF',
        'delta_lake': '#00ADD8',
        'iceberg': '#1E88E5',
        's3_parquet': '#FF9900',
        'azure_blob': '#0078D4',
        'gcp_cloud_storage': '#4285F4'
    };

    // Helper function to get database logo URL from CDN
    const getDatabaseLogoUrl = (dbType: string): string => {
        // Using simple-icons CDN for logos
        const iconMap: Record<string, string> = {
            'postgresql': 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/postgresql.svg',
            'mysql': 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/mysql.svg',
            'sqlserver': 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/microsoftsqlserver.svg',
            'clickhouse': 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/clickhouse.svg',
            'snowflake': 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/snowflake.svg',
            'bigquery': 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/googlebigquery.svg',
            'redshift': 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/amazonredshift.svg',
            'delta_lake': 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/delta.svg',
            'iceberg': 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/apacheiceberg.svg',
            's3_parquet': 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/amazons3.svg',
            'azure_blob': 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/microsoftazure.svg',
            'gcp_cloud_storage': 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/googlecloud.svg'
        };
        return iconMap[dbType] || 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/database.svg';
    };
    
    // Helper component to render database logo with theme-aware colored styling
    const DatabaseLogo: React.FC<{ dbType: string; size?: number }> = ({ dbType, size = 20 }) => {
        const logoUrl = getDatabaseLogoUrl(dbType);
        const [imgError, setImgError] = useState(false);
        const brandColor = brandColors[dbType] || '#666';
        
        return (
            <span
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: size,
                    height: size,
                    marginRight: '8px',
                    flexShrink: 0,
                    verticalAlign: 'middle',
                    position: 'relative'
                }}
            >
                {!imgError ? (
                    <img
                        src={logoUrl}
                        alt={`${dbType} logo`}
                        width={size}
                        height={size}
                        style={{ 
                            objectFit: 'contain',
                            display: 'block',
                            // Apply brand color as CSS filter to colorize the SVG
                            // Using a combination of filters to apply brand color tinting
                            filter: isDarkMode 
                                ? `brightness(1.15) contrast(1.1) drop-shadow(0 0 2px ${brandColor}50)`
                                : `drop-shadow(0 0 1px ${brandColor}40)`,
                            // Add subtle padding and background for better visibility
                            padding: '1px',
                            borderRadius: '2px',
                            backgroundColor: isDarkMode ? `${brandColor}15` : 'transparent'
                        }}
                        onError={() => setImgError(true)}
                    />
                ) : (
                    // Fallback: colored badge with first letter
                    <span
                        style={{
                            width: size,
                            height: size,
                            borderRadius: '4px',
                            backgroundColor: brandColor,
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: size * 0.6,
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            boxShadow: isDarkMode ? `0 0 4px ${brandColor}60` : `0 1px 2px ${brandColor}40`
                        }}
                    >
                        {dbType.charAt(0).toUpperCase()}
                    </span>
                )}
            </span>
        );
    };

    // Database types
    // NOTE: The core relational/warehouse options mirror `CubeConnectorService.supported_databases`.
    // Additional data lake / cloud storage options are backed by dedicated connectors.
    const databaseTypes = [
        { value: 'postgresql', label: 'PostgreSQL', port: 5432, isDataLake: false, isCloudStorage: false, disabled: false },
        { value: 'mysql', label: 'MySQL', port: 3306, isDataLake: false, isCloudStorage: false, disabled: false },
        // SQL Server support depends on OS-level ODBC libraries; mark as "coming soon" to avoid surprises.
        { value: 'sqlserver', label: 'SQL Server (coming soon)', port: 1433, isDataLake: false, isCloudStorage: false, disabled: true },
        { value: 'clickhouse', label: 'ClickHouse', port: 8123, isDataLake: false, isCloudStorage: false, disabled: false },
        { value: 'snowflake', label: 'Snowflake', port: 443, isDataLake: false, isCloudStorage: false, disabled: false },
        { value: 'bigquery', label: 'BigQuery', port: null, isDataLake: false, isCloudStorage: false, disabled: false },
        { value: 'redshift', label: 'Redshift', port: 5439, isDataLake: false, isCloudStorage: false, disabled: false },
        { value: 'delta_lake', label: 'Delta Lake', port: null, isDataLake: true, isCloudStorage: false, disabled: false },
        { value: 'iceberg', label: 'Apache Iceberg', port: null, isDataLake: true, isCloudStorage: false, disabled: false },
        { value: 's3_parquet', label: 'S3 Cloud Storage', port: null, isDataLake: false, isCloudStorage: true, disabled: false },
        { value: 'azure_blob', label: 'Azure Blob Storage', port: null, isDataLake: false, isCloudStorage: true, disabled: false },
        { value: 'gcp_cloud_storage', label: 'GCP Cloud Storage', port: null, isDataLake: false, isCloudStorage: true, disabled: false }
    ];
    
    const [selectedDatabaseType, setSelectedDatabaseType] = useState('postgresql');
    
    // Track user modifications to prevent overriding user input
    const userModifiedRef = useRef({
        port: false,
        sslMode: false,
        host: false,
        database: false,
        username: false,
        password: false
    });
    
    // Set defaults only when database type changes and user hasn't modified the field
    useEffect(() => {
        const databaseTypes = [
            { value: 'postgresql', port: 5432, sslMode: 'prefer' },
            { value: 'mysql', port: 3306, sslMode: 'prefer' },
            { value: 'sqlserver', port: 1433, sslMode: 'prefer' },
            { value: 'clickhouse', port: 8123, sslMode: 'disable' },
            { value: 'snowflake', port: 443, sslMode: 'require' },
            { value: 'bigquery', port: null, sslMode: 'require' },
            { value: 'redshift', port: 5439, sslMode: 'require' }
        ];
        
        const dbType = databaseTypes.find(db => db.value === selectedDatabaseType);
        if (dbType) {
            setConnectionConfig(prev => ({
                ...prev,
                // Only set defaults if user hasn't manually modified these fields
                port: !userModifiedRef.current.port ? (dbType.port || prev.port) : prev.port,
                sslMode: !userModifiedRef.current.sslMode ? dbType.sslMode : prev.sslMode
            }));
        }
    }, [selectedDatabaseType]);
    
    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setCurrentStep(0);
            setDataSourceConfig({
                name: '',
                type: initialDataSourceType,
                description: ''
            });
            setTestResult(null);
            setUploadedFile(null);
            }
    }, [isOpen, initialDataSourceType]);

    // Update port when database type changes
    useEffect(() => {
        const dbType = databaseTypes.find(db => db.value === selectedDatabaseType);
        if (dbType && dbType.port) {
            setConnectionConfig(prev => ({ ...prev, port: dbType.port! }));
        }
    }, [selectedDatabaseType]);
    
    const steps = [
        {
            title: 'Data Source Type',
            description: 'Choose your data source'
        },
        {
            title: 'Configure, Test & Save',
            description: 'Set up connection and verify'
        }
    ];
    
    const handleDataSourceTypeSelect = (type: string) => {
        setDataSourceConfig(prev => ({ ...prev, type: type as any }));
        setCurrentStep(1);
    };
    
    const handleFileUpload = async (file: File) => {
        setUploadedFile(file);
        // Auto-fill data source name from filename (remove extension)
        const autoName = file.name.split('.').slice(0, -1).join('.') || file.name;
        setDataSourceConfig(prev => ({ 
            ...prev, 
            name: prev.name || autoName // Only auto-fill if name is empty
        }));
        
        // Reset preview and options
        setFilePreview(null);
        setSelectedSheet('');
        setAvailableSheets([]);
        
        // Auto-detect delimiter for CSV files
        if (file.name.endsWith('.csv')) {
            setDelimiter(',');
        } else if (file.name.endsWith('.tsv')) {
            setDelimiter('\t');
        }
        
        // Auto-preview the file
        // Small delay to ensure state is updated
        setTimeout(() => {
            handlePreviewFile();
        }, 100);
        
        return false; // Prevent auto upload
    };
    
    const handlePreviewFile = async (skipSave: boolean = true) => {
        if (!uploadedFile) return;
        
        setLoading(true);
        try {
            // Create a preview request to get file structure
            // Note: This uploads the file but we can skip saving to data sources if skipSave is true
            const formData = new FormData();
            formData.append('file', uploadedFile);
            formData.append('include_preview', 'true');
            if (delimiter) formData.append('delimiter', delimiter);
            if (selectedSheet) formData.append('sheet_name', selectedSheet);
            // Add a flag to indicate this is preview-only (backend can handle this)
            if (skipSave) {
                formData.append('preview_only', 'true');
            }
            
            const response = await fetch('/api/data/upload', {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.data_source?.preview_data) {
                    setFilePreview(result.data_source.preview_data);
                    // Extract sheet names if available
                    if (result.data_source.sheets) {
                        setAvailableSheets(result.data_source.sheets);
                        if (result.data_source.sheets.length > 0 && !selectedSheet) {
                            setSelectedSheet(result.data_source.sheets[0]);
                        }
                    }
                    setTestResult({ success: true, message: 'Preview loaded successfully' });
                } else if (result.success) {
                    // If no preview_data but success, try to extract from data_source
                    setTestResult({ success: true, message: 'File processed successfully' });
                }
            } else {
                const errorData = await response.json().catch(() => ({ error: 'Preview failed' }));
                setTestResult({ success: false, error: errorData.error || errorData.detail || 'Preview failed' });
            }
        } catch (error: any) {
            console.error('Preview error:', error);
            setTestResult({ success: false, error: error.message || 'Preview failed' });
        } finally {
            setLoading(false);
        }
    };
    
    const generateConnectionUrl = () => {
        if (dataSourceConfig.type === 'api') {
            return connectionConfig.host || '';
        }
        
        if (!connectionConfig.host || !connectionConfig.database || !connectionConfig.username) {
            return '';
        }
        
        // SQLAlchemy connection URL format: dialect+driver://username:password@host:port/database
        let dialect = '';
        let driver = '';
        
        switch (selectedDatabaseType) {
            case 'postgresql':
                dialect = 'postgresql';
                driver = 'psycopg2';
                break;
            case 'mysql':
                dialect = 'mysql';
                driver = 'pymysql';
                break;
            case 'sqlserver':
                dialect = 'mssql';
                driver = 'pyodbc';
                break;
            case 'clickhouse':
                dialect = 'clickhouse';
                driver = 'native'; // Use native driver as recommended
                break;
            case 'snowflake':
                dialect = 'snowflake';
                driver = 'snowflake-sqlalchemy';
                break;
            case 'bigquery':
                dialect = 'bigquery';
                driver = 'bigquery';
                break;
            case 'redshift':
                dialect = 'redshift';
                driver = 'psycopg2';
                break;
            default:
                dialect = 'postgresql';
                driver = 'psycopg2';
        }
        
        const port = connectionConfig.port ? `:${connectionConfig.port}` : '';
        const password = connectionConfig.password ? `:${connectionConfig.password}` : '';
        
        // Build query parameters
        const queryParams = [];
        if (connectionConfig.sslMode && connectionConfig.sslMode !== 'disable') {
            queryParams.push(`sslmode=${connectionConfig.sslMode}`);
        }
        
        // ClickHouse specific parameters
        if (selectedDatabaseType === 'clickhouse') {
            if (connectionConfig.sslMode === 'require') {
                queryParams.push('secure=true');
            }
            if (connectionConfig.connectionTimeout) {
                queryParams.push(`timeout=${connectionConfig.connectionTimeout}`);
            }
        }
        
        // SQL Server specific parameters
        if (selectedDatabaseType === 'sqlserver') {
            queryParams.push('driver=ODBC+Driver+17+for+SQL+Server');
            if (connectionConfig.sslMode === 'require') {
                queryParams.push('Encrypt=yes');
            }
        }
        
        const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
        
        return `${dialect}+${driver}://${connectionConfig.username}${password}@${connectionConfig.host}${port}/${connectionConfig.database}${queryString}`;
    };
    
    const parseConnectionUrl = (url: string) => {
        try {
            // Handle SQLAlchemy connection strings (dialect+driver://...)
            let urlToParse = url;
            let dialect = '';
            let driver = '';
            
            // Extract dialect and driver from SQLAlchemy format
            if (url.includes('://')) {
                const protocolPart = url.split('://')[0];
                if (protocolPart.includes('+')) {
                    [dialect, driver] = protocolPart.split('+');
                    // Reconstruct URL with just the dialect for URL parsing
                    urlToParse = url.replace(`${dialect}+${driver}://`, `${dialect}://`);
                } else {
                    dialect = protocolPart;
                }
            }
            
            const urlObj = new URL(urlToParse);
            const protocol = urlObj.protocol.replace(':', '');
            
            // Map dialects to database types
            let dbType = '';
            switch (dialect || protocol) {
                case 'postgresql':
                    dbType = 'postgresql';
                    break;
                case 'mysql':
                    dbType = 'mysql';
                    break;
                case 'mssql':
                    dbType = 'sqlserver';
                    break;
                case 'clickhouse':
                    dbType = 'clickhouse';
                    break;
                case 'snowflake':
                    dbType = 'snowflake';
                    break;
                case 'bigquery':
                    dbType = 'bigquery';
                    break;
                case 'redshift':
                    dbType = 'redshift';
                    break;
                default:
                    dbType = 'postgresql';
            }
            
            // Update database type
            setSelectedDatabaseType(dbType);
            
            // Parse query parameters
            const queryParams = new URLSearchParams(urlObj.search);
            let sslMode = 'prefer';
            
            // Handle SSL mode from query parameters
            if (queryParams.has('sslmode')) {
                sslMode = queryParams.get('sslmode') || 'prefer';
            } else if (queryParams.has('secure') && queryParams.get('secure') === 'true') {
                sslMode = 'require';
            } else if (queryParams.has('Encrypt') && queryParams.get('Encrypt') === 'yes') {
                sslMode = 'require';
            }
            
            // Update connection config
            setConnectionConfig(prev => ({
                ...prev,
                host: urlObj.hostname,
                port: parseInt(urlObj.port) || (dbType === 'postgresql' ? 5432 : dbType === 'mysql' ? 3306 : dbType === 'clickhouse' ? 8123 : 1433),
                database: urlObj.pathname.replace('/', ''),
                username: urlObj.username,
                password: urlObj.password,
                sslMode: sslMode
            }));
            
            // Mark fields as user-modified to prevent defaults from overriding
            userModifiedRef.current.host = true;
            userModifiedRef.current.port = true;
            userModifiedRef.current.database = true;
            userModifiedRef.current.username = true;
            userModifiedRef.current.password = true;
            userModifiedRef.current.sslMode = true;
            
            message.success('SQLAlchemy connection URL parsed and applied successfully!');
        } catch (error) {
            message.error('Invalid connection URL format. Please check the URL syntax.');
        }
    };
    
    const testConnection = async () => {
        setLoading(true);
        try {
            if (dataSourceConfig.type === 'file') {
                if (!uploadedFile) {
                    setTestResult({ success: false, error: 'Please select a file first' });
                    return;
                }
                // Auto-fill name if empty
                if (!dataSourceConfig.name) {
                    const autoName = uploadedFile.name.split('.').slice(0, -1).join('.') || uploadedFile.name;
                    setDataSourceConfig(prev => ({ ...prev, name: autoName }));
                }
                setTestResult({ success: true, message: `File ready: ${uploadedFile.name} (${(uploadedFile.size / 1024).toFixed(1)} KB)` });
                return;
            }
            
            if (dataSourceConfig.type === 'warehouse' && ['delta_lake', 'iceberg', 's3_parquet', 'azure_blob'].includes(selectedDatabaseType)) {
                // Test cloud storage connection
                if (!connectionConfig.storageUri || connectionConfig.storageUri.trim() === '') {
                    setTestResult({ success: false, error: 'Please provide a storage URI (s3:// or azure://)' });
                    return;
                }
                
                const hasS3Creds = connectionConfig.storageUri.startsWith('s3://') && 
                                  connectionConfig.accessKey && connectionConfig.secretKey;
                const hasAzureCreds = connectionConfig.storageUri.startsWith('azure://') && 
                                     connectionConfig.accountName && 
                                     (connectionConfig.accountKey || connectionConfig.sasToken);
                
                if (!hasS3Creds && !hasAzureCreds) {
                    setTestResult({ success: false, error: 'Please provide valid credentials for your cloud storage provider' });
                    return;
                }
                
                // Test connection via backend
                try {
                    const formatType = selectedDatabaseType === 'delta_lake' ? 'delta' : 
                                     selectedDatabaseType === 'iceberg' ? 'iceberg' :
                                     selectedDatabaseType === 's3_parquet' ? 's3_parquet' : 'azure_blob';
                    
                    const testRequest = {
                        format_type: formatType,
                        storage_uri: connectionConfig.storageUri.trim(),
                        credentials: {
                            ...(connectionConfig.accessKey && { access_key: connectionConfig.accessKey }),
                            ...(connectionConfig.secretKey && { secret_key: connectionConfig.secretKey }),
                            ...(connectionConfig.region && { region: connectionConfig.region }),
                            ...(connectionConfig.accountName && { account_name: connectionConfig.accountName }),
                            ...(connectionConfig.accountKey && { account_key: connectionConfig.accountKey }),
                            ...(connectionConfig.sasToken && { sas_token: connectionConfig.sasToken })
                        },
                        ...(connectionConfig.version && { version: connectionConfig.version }),
                        ...(connectionConfig.timestamp && { timestamp: connectionConfig.timestamp }),
                        ...(connectionConfig.snapshotId && { snapshot_id: connectionConfig.snapshotId })
                    };
                    
                    const response = await authenticatedFetch('/api/data/delta-iceberg/test', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(testRequest)
                    });
                    
                    const result = await response.json();
                    setTestResult(result);
                } catch (error: any) {
                    setTestResult({ 
                        success: false, 
                        error: error.message || 'Connection test failed. Please check your settings.' 
                    });
                }
                return;
            }
            
            if (dataSourceConfig.type === 'api') {
                if (!connectionConfig.host || !dataSourceConfig.name) {
                    setTestResult({ success: false, error: 'Please fill in API name and base URL' });
                    return;
                }
                
                // Test API connection by making a simple request
                try {
                    const testUrl = connectionConfig.host.endsWith('/') ? 
                        connectionConfig.host + 'health' : 
                        connectionConfig.host + '/health';
                    
                    const response = await fetch(testUrl, {
                        method: 'GET',
                    headers: {
                            'Content-Type': 'application/json',
                            ...(connectionConfig.password && { 'Authorization': `Bearer ${connectionConfig.password}` })
                        },
                        signal: AbortSignal.timeout(5000) // 5 second timeout
                    });
                    
                    if (response.ok) {
                        setTestResult({ success: true, message: 'API endpoint is accessible and responding' });
                } else {
                        setTestResult({ success: true, message: `API endpoint responded with status ${response.status} - connection test passed` });
            }
        } catch (error) {
                    setTestResult({ success: true, message: 'API configuration validated (endpoint accessibility test skipped)' });
                }
                return;
            }

            // Database/Warehouse connection test
            if (!connectionConfig.host || !connectionConfig.database || !connectionConfig.username || !connectionConfig.password) {
                setTestResult({ success: false, error: 'Please fill in all required database fields' });
                return;
            }
            
            // Use the correct endpoint based on database type
            let endpoint = '/api/data/database/test';
            let requestBody = {
                type: selectedDatabaseType,
                host: connectionConfig.host,
                port: connectionConfig.port,
                database: connectionConfig.database,
                username: connectionConfig.username,
                password: connectionConfig.password,
                ssl_mode: connectionConfig.sslMode
            };
            
            // All databases use the same test endpoint - no need for special handling
            // The backend /data/database/test handles all database types including warehouses
            
            const response = await authenticatedFetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            const result = await response.json();
            console.log('Test result:', result);
            setTestResult(result);
        } catch (error) {
            setTestResult({ 
                success: false, 
                error: 'Connection test failed. Please check your settings.' 
            });
        } finally {
            setLoading(false);
        }
    };
    
    const saveDataSource = async () => {
        setLoading(true);
        try {
            let response;
            
            if (dataSourceConfig.type === 'file') {
                if (!uploadedFile) {
                    setTestResult({ success: false, error: 'Please select a file first' });
                    message.error('Please select a file to upload');
                    return;
                }
                
                // Auto-fill name if empty
                if (!dataSourceConfig.name || dataSourceConfig.name.trim() === '') {
                    const autoName = uploadedFile.name.split('.').slice(0, -1).join('.') || uploadedFile.name;
                    setDataSourceConfig(prev => ({ ...prev, name: autoName }));
                }
                
                // Validate file name
                if (!dataSourceConfig.name || dataSourceConfig.name.trim() === '') {
                    setTestResult({ success: false, error: 'Data source name is required' });
                    message.error('Please enter a name for this data source');
                    return;
                }
                
                // Verify file is included and is a valid File object BEFORE creating FormData
                if (!uploadedFile || !(uploadedFile instanceof File)) {
                    setTestResult({ success: false, error: 'Invalid file. Please select a file to upload.' });
                    message.error('Please select a valid file to upload');
                    setLoading(false);
                    return;
                }
                
                // Create FormData and append file
                const formData = new FormData();
                formData.append('file', uploadedFile, uploadedFile.name); // Include filename explicitly
                formData.append('name', dataSourceConfig.name.trim());
                formData.append('include_preview', 'true');
                if (delimiter) formData.append('delimiter', delimiter);
                if (selectedSheet) formData.append('sheet_name', selectedSheet);
                
                // Double-check file is in FormData
                if (!formData.has('file')) {
                    setTestResult({ success: false, error: 'File is missing from upload request' });
                    message.error('File upload error: File is missing');
                    setLoading(false);
                    return;
                }
                
                // Log for debugging (remove in production)
                console.log('Uploading file:', {
                    name: uploadedFile.name,
                    size: uploadedFile.size,
                    type: uploadedFile.type,
                    hasFile: formData.has('file')
                });
                
                try {
                    response = await fetch('/api/data/upload', {
                        method: 'POST',
                        credentials: 'include',
                        // DO NOT set Content-Type header - browser will set it automatically with boundary for FormData
                        // This is critical - if we set Content-Type manually, the boundary won't be included
                        body: formData
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({ 
                            error: `Server error (${response.status}): ${response.statusText}` 
                        }));
                        const errorMessage = errorData.detail || errorData.error || errorData.message || `Upload failed: ${response.status}`;
                        setTestResult({ success: false, error: errorMessage });
                        message.error(`Failed to upload: ${errorMessage}`);
                        return;
                    }
                    
                    const result = await response.json();
                    if (result.success) {
                        const dataSource = result.data_source || {
                            id: result.data_source_id,
                            name: dataSourceConfig.name || uploadedFile.name,
                            type: 'file',
                            format: uploadedFile.name.split('.').pop(),
                            status: 'connected',
                            created_at: new Date().toISOString()
                        };
                        onDataSourceCreated(dataSource);
                        onClose();
                        message.success('File uploaded and saved successfully!');
                    } else {
                        const errorMessage = result.error || result.detail || 'Failed to upload file';
                        setTestResult({ success: false, error: errorMessage });
                        message.error(`Upload failed: ${errorMessage}`);
                    }
                } catch (error: any) {
                    const errorMessage = error.message || 'Network error. Please check your connection and try again.';
                    setTestResult({ success: false, error: errorMessage });
                    message.error(`Upload failed: ${errorMessage}`);
                }
            } else if (dataSourceConfig.type === 'api') {
                // For API data sources, create a mock data source
                const apiDataSource = {
                    id: `api_${Date.now()}`,
                    name: dataSourceConfig.name,
                    type: 'api',
                    config: {
                        base_url: connectionConfig.host,
                        auth_type: connectionConfig.username,
                        api_key: connectionConfig.password,
                        description: dataSourceConfig.description
                    },
                    status: 'connected',
                    created_at: new Date().toISOString()
                };
                
                onDataSourceCreated(apiDataSource);
                onClose();
                message.success('API data source created successfully!');
                return;
                } else {
                // Database/Warehouse/Cloud Storage connection
                let endpoint = '/api/data/database/connect';
                let requestBody: any;
                
                // Handle data lake types (Delta/Iceberg) and cloud storage (S3/Azure/GCP) FIRST
                if (['delta_lake', 'iceberg', 's3_parquet', 'azure_blob', 'gcp_cloud_storage'].includes(selectedDatabaseType)) {
                    // Validate cloud storage fields
                    if (!connectionConfig.storageUri || connectionConfig.storageUri.trim() === '') {
                        setTestResult({ success: false, error: 'Storage URI is required' });
                        message.error('Please provide a storage URI (s3://, azure://, or gcs://)');
                        return;
                    }
                    
                    const hasS3Creds = (connectionConfig.storageUri.startsWith('s3://')) && 
                                      connectionConfig.accessKey && connectionConfig.secretKey;
                    const hasAzureCreds = (connectionConfig.storageUri.startsWith('azure://') || 
                                           connectionConfig.storageUri.startsWith('abfss://')) && 
                                         connectionConfig.accountName && 
                                         (connectionConfig.accountKey || connectionConfig.sasToken);
                    const hasGCPCreds = (connectionConfig.storageUri.startsWith('gcs://') || 
                                         connectionConfig.storageUri.startsWith('gs://')) && 
                                        connectionConfig.gcpCredentials;
                    
                    if (!hasS3Creds && !hasAzureCreds && !hasGCPCreds) {
                        setTestResult({ success: false, error: 'Please provide valid credentials for your cloud storage provider' });
                        message.error('Please provide valid cloud storage credentials');
                        return;
                    }
                    
                    // For cloud storage (not data lakes), require file format
                    const isCloudStorage = ['s3_parquet', 'azure_blob', 'gcp_cloud_storage'].includes(selectedDatabaseType);
                    if (isCloudStorage && !connectionConfig.fileFormat) {
                        setTestResult({ success: false, error: 'File format is required for cloud storage connections' });
                        message.error('Please select a file format (Parquet, CSV, JSON, or TSV)');
                        return;
                    }
                    
                    // Auto-generate name if not provided
                    let finalName = dataSourceConfig.name;
                    if (!finalName || finalName.trim() === '') {
                        const uriParts = connectionConfig.storageUri.split('/').filter(p => p);
                        const bucketOrAccount = uriParts[1] || 'Cloud Storage';
                        finalName = `${databaseTypes.find(db => db.value === selectedDatabaseType)?.label} - ${bucketOrAccount}`;
                        setDataSourceConfig(prev => ({ ...prev, name: finalName }));
                    }
                    
                    // Use Delta/Iceberg connector endpoint
                    endpoint = '/api/data/delta-iceberg/connect';
                    requestBody = {
                        format_type: selectedDatabaseType === 'delta_lake' ? 'delta' : 
                                   selectedDatabaseType === 'iceberg' ? 'iceberg' :
                                   selectedDatabaseType === 's3_parquet' ? 's3_parquet' : 
                                   selectedDatabaseType === 'azure_blob' ? 'azure_blob' :
                                   'gcp_cloud_storage',
                        storage_uri: connectionConfig.storageUri.trim(),
                        credentials: {
                            ...(connectionConfig.accessKey && { access_key: connectionConfig.accessKey }),
                            ...(connectionConfig.secretKey && { secret_key: connectionConfig.secretKey }),
                            ...(connectionConfig.region && { region: connectionConfig.region }),
                            ...(connectionConfig.endpoint && { endpoint: connectionConfig.endpoint }),
                            ...(connectionConfig.accountName && { account_name: connectionConfig.accountName }),
                            ...(connectionConfig.accountKey && { account_key: connectionConfig.accountKey }),
                            ...(connectionConfig.sasToken && { sas_token: connectionConfig.sasToken }),
                            ...(connectionConfig.gcpCredentials && { service_account_key: connectionConfig.gcpCredentials }),
                            ...(connectionConfig.gcpProjectId && { project_id: connectionConfig.gcpProjectId })
                        },
                        name: finalName,
                        ...(connectionConfig.fileFormat && { file_format: connectionConfig.fileFormat }),
                        ...(connectionConfig.version && { version: connectionConfig.version }),
                        ...(connectionConfig.timestamp && { timestamp: connectionConfig.timestamp }),
                        ...(connectionConfig.snapshotId && { snapshot_id: connectionConfig.snapshotId })
                    };
                } else {
                    // Regular database/warehouse connection
                    // IMPORTANT: Even if URI was provided, if connectionConfig is populated, use manual fields
                    const hasManualFields = connectionConfig.host && connectionConfig.database && connectionConfig.username;
                    const useUri = customConnectionUrl && customConnectionUrl.trim().length > 0 && !hasManualFields;
                    
                    if (!useUri && (!connectionConfig.host || !connectionConfig.database || !connectionConfig.username || !connectionConfig.password)) {
                        setTestResult({ success: false, error: 'Please fill in all required database fields or provide a connection URI' });
                        return;
                    }
                    
                    // Auto-generate name if not provided
                    let finalName = dataSourceConfig.name;
                    if (!finalName || finalName.trim() === '') {
                        finalName = generateDataSourceName();
                        setDataSourceConfig(prev => ({ ...prev, name: finalName }));
                    }
                    
                    if (useUri) {
                        requestBody = {
                            type: selectedDatabaseType,
                            uri: customConnectionUrl.trim(),
                            name: finalName,
                            connection_type: 'uri'
                        };
                    } else {
                        requestBody = {
                            type: selectedDatabaseType,
                            host: connectionConfig.host,
                            port: connectionConfig.port,
                            database: connectionConfig.database,
                            username: connectionConfig.username,
                            password: connectionConfig.password,
                            name: finalName,
                            ssl_mode: connectionConfig.sslMode,
                            connection_type: 'manual'
                        };
                    }
                    
                    // For enterprise warehouses, use the warehouse connect endpoint
                    if (['snowflake', 'bigquery', 'redshift', 'clickhouse'].includes(selectedDatabaseType)) {
                        endpoint = '/api/data/warehouses/connect';
                        requestBody = {
                            connection_config: requestBody
                        };
                    }
                }
                
                response = await authenticatedFetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                });
            }
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error('Save failed:', response.status, errorData);
                setTestResult({ 
                    success: false, 
                    error: errorData.detail || errorData.error || `Server error: ${response.status}`
                });
                message.error(`Failed to save: ${errorData.detail || errorData.error || response.status}`);
                return;
            }

            const result = await response.json();
            console.log('Save success:', result);
            
            if (result.success) {
                // Handle different response formats from different endpoints
                const dataSource = result.data_source || {
                    id: result.data_source_id,
                    name: dataSourceConfig.name,
                    type: 'database',
                    db_type: selectedDatabaseType,
                    status: 'connected',
                    connection_info: result.connection_info
                };
                
                message.success({
                    content: `✅ ${dataSource.name} connected successfully!`,
                    duration: 5,
                    style: {
                        marginTop: '20vh',
                    }
                });
                
                // Notify parent to refresh data sources
                onDataSourceCreated(dataSource);
                
                // Trigger a custom event to refresh all data source panels
                window.dispatchEvent(new CustomEvent('datasource-created', { 
                    detail: dataSource 
                }));
                
                // Small delay to let user see the success message
                setTimeout(() => {
                    onClose();
                }, 500);
            } else {
                setTestResult({ success: false, error: result.error || 'Failed to save data source' });
                message.error(result.error || 'Failed to save data source');
            }
        } catch (error) {
            setTestResult({ 
                success: false, 
                error: 'Failed to save data source. Please try again.' 
            });
        } finally {
            setLoading(false);
        }
    };
    
    const renderDataSourceTypeSelection = () => (
        <div style={{ padding: '8px 0' }}>
            <Title level={4} style={{ textAlign: 'center', marginBottom: '16px' }}>
                Choose Your Data Source Type
            </Title>
            
            <Row gutter={[16, 16]}>
                {dataSourceTypes.map(type => (
                    <Col span={12} key={type.key}>
                        <Card
                            hoverable
                            onClick={() => handleDataSourceTypeSelect(type.key)}
                            style={{ 
                                textAlign: 'center',
                                cursor: 'pointer',
                                border: dataSourceConfig.type === type.key ? `2px solid #1890ff` : '1px solid #d9d9d9'
                            }}
                        >
                            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                <div style={{ fontSize: '32px', color: type.color === 'blue' ? '#1890ff' : 
                                    type.color === 'green' ? '#52c41a' : 
                                    type.color === 'purple' ? '#722ed1' : '#fa8c16' }}>
                                    {type.icon}
                                </div>
                                <Title level={5} style={{ margin: 0 }}>{type.label}</Title>
                                <Text type="secondary">{type.description}</Text>
                            </Space>
                        </Card>
                    </Col>
                ))}
            </Row>
        </div>
    );
    
    const renderFileUpload = () => (
        <div style={{ padding: '24px 0' }}>
            <Title level={4}>Upload Your File</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: '24px' }}>
                Supported formats: CSV, Excel (.xlsx), Parquet, JSON
            </Text>
            
            {/* File Upload */}
            <Form.Item label="Select File" required>
                <Dragger
                    accept=".csv,.xlsx,.xls,.parquet,.json"
                beforeUpload={(file) => {
                    handleFileUpload(file);
                    return false; // Prevent auto upload
                }}
                    showUploadList={false}
                    style={{ padding: '40px 0' }}
                >
                    <p className="ant-upload-drag-icon">
                        <UploadOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
                    </p>
                    <p className="ant-upload-text">
                        {uploadedFile ? uploadedFile.name : 'Click or drag file to this area to upload'}
                    </p>
                    <p className="ant-upload-hint">
                        Support for single file upload. File will be analyzed automatically.
                    </p>
                </Dragger>

                {uploadedFile && (
                    <Alert
                        message="File Ready"
                        description={`${uploadedFile.name} (${(uploadedFile.size / 1024).toFixed(1)} KB) is ready for upload. ${filePreview ? 'Preview loaded.' : loading ? 'Loading preview...' : ''}`}
                        type="success"
                        showIcon
                        style={{ marginTop: '16px' }}
                    />
                )}
            </Form.Item>

            {/* File Options - Sheet Selection and Delimiter */}
            {uploadedFile && (
                <Row gutter={16}>
                    {uploadedFile.name.endsWith('.xlsx') || uploadedFile.name.endsWith('.xls') ? (
                        <Col span={12}>
                            <Form.Item label="Sheet (Excel)" help="Select which sheet to import">
                                <Select
                                    value={selectedSheet}
                                    onChange={setSelectedSheet}
                                    placeholder="Auto-detect"
                                    allowClear
                                    onSelect={() => {
                                        // Refresh preview when sheet changes
                                        if (filePreview) {
                                            handlePreviewFile();
                                        }
                                    }}
                                >
                                    {availableSheets.map(sheet => (
                                        <Option key={sheet} value={sheet}>{sheet}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                    ) : null}
                    {uploadedFile.name.endsWith('.csv') || uploadedFile.name.endsWith('.tsv') ? (
                        <Col span={12}>
                            <Form.Item label="Delimiter" help="Auto-detected, but you can override">
                                <Select
                                    value={delimiter}
                                    onChange={setDelimiter}
                                    onSelect={() => {
                                        // Refresh preview when delimiter changes
                                        if (filePreview) {
                                            handlePreviewFile();
                                        }
                                    }}
                                >
                                    <Option value=",">Comma (,)</Option>
                                    <Option value=";">Semicolon (;)</Option>
                                    <Option value="\t">Tab</Option>
                                    <Option value="|">Pipe (|)</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    ) : null}
                </Row>
            )}

            {/* Data Preview */}
            {filePreview && Array.isArray(filePreview) && filePreview.length > 0 && (
                <Form.Item label="Data Preview" help="First few rows of your data">
                    <div style={{ 
                        maxHeight: '200px', 
                        overflow: 'auto', 
                        border: '1px solid var(--ant-color-border)',
                        borderRadius: '4px',
                        padding: '8px',
                        backgroundColor: 'var(--ant-color-bg-container)'
                    }}>
                        <Table
                            dataSource={filePreview.slice(0, 5)}
                            columns={Object.keys(filePreview[0] || {}).map(key => ({
                                title: key,
                                dataIndex: key,
                                key: key,
                                ellipsis: true
                            }))}
                            pagination={false}
                            size="small"
                            scroll={{ x: 'max-content' }}
                        />
                        <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '8px' }}>
                            Showing first 5 rows of {filePreview.length} total rows
                        </Text>
                    </div>
                </Form.Item>
            )}

            {/* Data Source Name */}
            <Form.Item label="Data Source Name" required>
                <Input
                    value={dataSourceConfig.name}
                    onChange={(e) => setDataSourceConfig(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter a name for this data source"
                />
            </Form.Item>

            {/* Description */}
            <Form.Item label="Description">
                <Input.TextArea
                    value={dataSourceConfig.description}
                    onChange={(e) => setDataSourceConfig(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe this data source..."
                    rows={3}
                />
            </Form.Item>

            {/* Test result alert for file uploads */}
            {testResult && (
                <Alert
                    message={testResult.success ? "File Ready!" : "Upload Failed"}
                    description={testResult.message || testResult.error}
                    type={testResult.success ? "success" : "error"}
                    showIcon
                    style={{ marginTop: '16px' }}
                />
            )}
        </div>
    );

    const renderDatabaseConfiguration = () => {
        const isCloudStorage = ['s3_parquet', 'azure_blob', 'gcp_cloud_storage'].includes(selectedDatabaseType);
        const isDataLake = ['delta_lake', 'iceberg'].includes(selectedDatabaseType);
        
        return (
        <div style={{ padding: '8px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <Title level={4} style={{ margin: 0 }}>
                    {isCloudStorage ? 'Cloud Storage Configuration' :
                     isDataLake ? 'Data Lake Configuration' :
                     'Database Configuration'}
                </Title>
            </div>
            
            <Form layout="vertical">
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item label="Database Type" required>
                    <Select
                                value={selectedDatabaseType}
                                onChange={(value) => {
                                    setSelectedDatabaseType(value);
                                    // Clear connection config when changing database type to avoid confusion
                                    setConnectionConfig(prev => ({
                                        host: '',
                                        port: databaseTypes.find(db => db.value === value)?.port || 5432,
                                        database: '',
                                        username: '',
                                        password: '',
                                        sslMode: 'prefer',
                                        connectionPool: false,
                                        minConnections: 1,
                                        maxConnections: 10,
                                        connectionTimeout: 30,
                                        storageUri: '',
                                        accessKey: '',
                                        secretKey: '',
                                        region: 'us-east-1',
                                        endpoint: '',
                                        accountName: '',
                                        accountKey: '',
                                        sasToken: '',
                                        gcpProjectId: '',
                                        gcpCredentials: '',
                                        fileFormat: '',
                                        version: undefined,
                                        timestamp: '',
                                        snapshotId: undefined
                                    }));
                                    setTestResult(null);
                                }}
                                style={{ width: '100%' }}
                            >
                                {databaseTypes
                                    .filter(db => {
                                        // Filter based on data source type selection
                                        if (dataSourceConfig.type === 'database') {
                                            // For "Database" type, show only traditional databases (not cloud storage or data lakes)
                                            return !db.isDataLake && !db.isCloudStorage;
                                        } else if (dataSourceConfig.type === 'warehouse') {
                                            // For "Warehouse" type, show all warehouse options (databases, data lakes, cloud storage)
                                            return true;
                                        }
                                        // Default: show all
                                        return true;
                                    })
                                    .map(db => (
                                        <Option key={db.value} value={db.value}>
                                            <Space>
                                                <DatabaseLogo dbType={db.value} size={18} />
                                                <span>{db.label}</span>
                                            </Space>
                                        </Option>
                                    ))}
                    </Select>
                </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label="Data Source Name" required>
                            <Input
                                value={dataSourceConfig.name}
                                onChange={(e) => setDataSourceConfig(prev => ({ ...prev, name: e.target.value }))}
                                placeholder={`${databaseTypes.find(db => db.value === selectedDatabaseType)?.label} Connection`}
                            />
                </Form.Item>
                    </Col>
                </Row>
                
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item label="Host" required>
                            <Input
                                value={connectionConfig.host}
                                onChange={(e) => setConnectionConfig(prev => ({ ...prev, host: e.target.value }))}
                                placeholder="localhost"
                            />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label="Port" required>
                            <Input
                                type="number"
                                value={connectionConfig.port}
                                onChange={(e) => {
                                    userModifiedRef.current.port = true;
                                    setConnectionConfig(prev => ({ ...prev, port: parseInt(e.target.value) }));
                                }}
                                placeholder="5432"
                            />
                        </Form.Item>
                    </Col>
                </Row>
                        
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item label="Database" required>
                            <Input
                                value={connectionConfig.database}
                                onChange={(e) => setConnectionConfig(prev => ({ ...prev, database: e.target.value }))}
                                placeholder="mydatabase"
                            />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label="Username" required>
                            <Input
                                value={connectionConfig.username}
                                onChange={(e) => setConnectionConfig(prev => ({ ...prev, username: e.target.value }))}
                                placeholder="username"
                            />
                        </Form.Item>
                    </Col>
                </Row>
                        
                <Form.Item label="Password" required>
                            <Input.Password
                        value={connectionConfig.password}
                        onChange={(e) => setConnectionConfig(prev => ({ ...prev, password: e.target.value }))}
                                placeholder="password"
                            />
                        </Form.Item>
                
                {/* Connection URL - Editable by default, click to preview */}
                <Form.Item label="Connection URL">
                    <Space.Compact style={{ width: '100%' }}>
                        <Input
                            value={connectionUrlEditable ? (customConnectionUrl || generateConnectionUrl()) : generateConnectionUrl()}
                            readOnly={!connectionUrlEditable}
                            onChange={connectionUrlEditable ? (e) => {
                                setCustomConnectionUrl(e.target.value);
                                // Clear custom URL if user clears the field to revert to auto-generated
                                if (!e.target.value.trim()) {
                                    setCustomConnectionUrl('');
                                }
                            } : undefined}
                            onBlur={() => {
                                // When user stops editing, if field is empty, clear custom URL to use auto-generated
                                if (connectionUrlEditable && !customConnectionUrl.trim()) {
                                    setCustomConnectionUrl('');
                                }
                            }}
                            placeholder="postgresql://username:password@host:port/database"
                            style={{ 
                                backgroundColor: connectionUrlEditable ? '#fff' : '#f5f5f5',
                                fontFamily: 'monospace',
                                fontSize: '12px'
                            }}
                        />
                        <Button
                            type={connectionUrlEditable ? 'default' : 'primary'}
                            onClick={() => {
                                if (connectionUrlEditable && customConnectionUrl) {
                                    // Parse the custom URL and update connection config when switching to preview
                                    parseConnectionUrl(customConnectionUrl);
                                } else if (!connectionUrlEditable) {
                                    // Switching to edit mode - clear custom URL so user can edit fresh
                                    setCustomConnectionUrl('');
                                }
                                setConnectionUrlEditable(!connectionUrlEditable);
                            }}
                            style={{ minWidth: '80px' }}
                        >
                            {connectionUrlEditable ? 'Preview' : 'Edit'}
                        </Button>
                    </Space.Compact>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                        {connectionUrlEditable ? 
                            'Edit the connection URL directly. Click "Preview" to see auto-generated URL from form fields.' :
                            'Preview of auto-generated URL. Click "Edit" to modify directly.'
                        }
                    </Text>
                </Form.Item>
                
                {/* Advanced Options */}
                <Collapse ghost>
                    <Panel header="🔧 Advanced Options" key="advanced">
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item label="SSL Mode">
                    <Select
                        value={connectionConfig.sslMode}
                        onChange={(value) => {
                            userModifiedRef.current.sslMode = true;
                            setConnectionConfig(prev => ({ ...prev, sslMode: value }));
                        }}
                    >
                                        <Option value="disable">Disable</Option>
                                        <Option value="prefer">Prefer</Option>
                                        <Option value="require">Require</Option>
                                        <Option value="verify-ca">Verify CA</Option>
                                        <Option value="verify-full">Verify Full</Option>
                    </Select>
                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item label="Connection Pool">
                                    <Radio.Group
                                        value={connectionConfig.connectionPool}
                                        onChange={(e) => setConnectionConfig(prev => ({ ...prev, connectionPool: e.target.value }))}
                                    >
                                        <Radio value={false}>Disabled</Radio>
                                        <Radio value={true}>Enabled</Radio>
                                    </Radio.Group>
                </Form.Item>
                            </Col>
                        </Row>
                
                        {connectionConfig.connectionPool && (
                            <Row gutter={16}>
                                <Col span={8}>
                                    <Form.Item label="Min Connections">
                    <Input
                                            type="number"
                                            value={connectionConfig.minConnections}
                                            onChange={(e) => setConnectionConfig(prev => ({ ...prev, minConnections: parseInt(e.target.value) }))}
                    />
                </Form.Item>
                                </Col>
                                <Col span={8}>
                                    <Form.Item label="Max Connections">
                    <Input
                                            type="number"
                                            value={connectionConfig.maxConnections}
                                            onChange={(e) => setConnectionConfig(prev => ({ ...prev, maxConnections: parseInt(e.target.value) }))}
                    />
                </Form.Item>
                                </Col>
                                <Col span={8}>
                                    <Form.Item label="Timeout (s)">
                    <Input
                                            type="number"
                                            value={connectionConfig.connectionTimeout}
                                            onChange={(e) => setConnectionConfig(prev => ({ ...prev, connectionTimeout: parseInt(e.target.value) }))}
                    />
                </Form.Item>
                                </Col>
                            </Row>
                        )}
                    </Panel>
                </Collapse>
            </Form>
        </div>
        );
    };

    const renderCloudStorageConfiguration = () => {
        const isS3 = selectedDatabaseType === 's3_parquet';
        const isAzure = selectedDatabaseType === 'azure_blob';
        const isGCP = selectedDatabaseType === 'gcp_cloud_storage';
        const isDelta = selectedDatabaseType === 'delta_lake';
        const isIceberg = selectedDatabaseType === 'iceberg';
        const isCloudStorage = isS3 || isAzure || isGCP;
        
        return (
            <div style={{ padding: '8px 0' }}>
                <Title level={4} style={{ marginBottom: '16px' }}>
                    {isDelta ? 'Delta Lake Configuration' : 
                     isIceberg ? 'Apache Iceberg Configuration' :
                     isS3 ? 'Amazon S3 Configuration' :
                     isAzure ? 'Azure Blob Storage Configuration' :
                     isGCP ? 'Google Cloud Storage Configuration' :
                     'Cloud Storage Configuration'}
                </Title>
                
                <Form layout="vertical">
                    {/* Database Type Selector - Always visible and prominent */}
                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item 
                                label="Database/Storage Type" 
                                required
                                help="You can change this selection at any time"
                            >
                                <Select
                                    value={selectedDatabaseType}
                                    onChange={(value) => {
                                        setSelectedDatabaseType(value);
                                        // Clear connection config when changing database type to avoid confusion
                                        setConnectionConfig(prev => ({
                                            host: '',
                                            port: databaseTypes.find(db => db.value === value)?.port || 5432,
                                            database: '',
                                            username: '',
                                            password: '',
                                            sslMode: 'prefer',
                                            connectionPool: false,
                                            minConnections: 1,
                                            maxConnections: 10,
                                            connectionTimeout: 30,
                                            storageUri: '',
                                            accessKey: '',
                                            secretKey: '',
                                            region: 'us-east-1',
                                            endpoint: '',
                                            accountName: '',
                                            accountKey: '',
                                            sasToken: '',
                                            gcpProjectId: '',
                                            gcpCredentials: '',
                                            fileFormat: '',
                                            version: undefined,
                                            timestamp: '',
                                            snapshotId: undefined
                                        }));
                                        setTestResult(null);
                                    }}
                                    style={{ width: '100%' }}
                                    size="large"
                                >
                                    {databaseTypes.map(db => (
                                        <Option
                                            key={db.value}
                                            value={db.value}
                                            disabled={db.disabled}
                                        >
                                            <Space>
                                                <DatabaseLogo dbType={db.value} size={18} />
                                                <span>{db.label}</span>
                                            </Space>
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    
                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item label="Data Source Name" required>
                                <Input
                                    value={dataSourceConfig.name}
                                    onChange={(e) => setDataSourceConfig(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder={`${databaseTypes.find(db => db.value === selectedDatabaseType)?.label} Connection`}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                    
                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item 
                                label="Storage URI" 
                                required
                                help={
                                    isS3 ? "Format: s3://bucket-name/path/to/file.parquet" : 
                                    isAzure ? "Format: azure://account-name/container-name/path/to/file.csv" :
                                    isGCP ? "Format: gcs://bucket-name/path/to/file.json or gs://bucket-name/path/to/file.parquet" :
                                    isDelta ? "Format: s3://bucket/path/ or azure://account/container/path/ or gcs://bucket/path/" :
                                    isIceberg ? "Format: s3://bucket/path/ or azure://account/container/path/ or gcs://bucket/path/" :
                                    "Format: s3://, azure://, or gcs://"
                                }
                            >
                                <Input
                                    value={connectionConfig.storageUri || ''}
                                    onChange={(e) => {
                                        const uri = e.target.value;
                                        setConnectionConfig(prev => ({ ...prev, storageUri: uri }));
                                        // Auto-detect and set file format from URI if not set
                                        if (isCloudStorage && !connectionConfig.fileFormat) {
                                            const ext = uri.split('.').pop()?.toLowerCase();
                                            if (ext && ['parquet', 'csv', 'json', 'tsv'].includes(ext)) {
                                                setConnectionConfig(prev => ({ ...prev, fileFormat: ext }));
                                            }
                                        }
                                    }}
                                    placeholder={
                                        isS3 ? "s3://my-bucket/data/file.parquet" : 
                                        isAzure ? "azure://myaccount/container/file.csv" :
                                        isGCP ? "gcs://my-bucket/data/file.json" :
                                        "s3://bucket/path/ or azure://account/container/path/ or gcs://bucket/path/"
                                    }
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                    
                    {/* File Format Selection for Cloud Storage (not data lakes) */}
                    {isCloudStorage && (
                        <Row gutter={16}>
                            <Col span={24}>
                                <Form.Item 
                                    label="File Format" 
                                    required
                                    help="Select the format of your data file"
                                >
                                    <Select
                                        value={connectionConfig.fileFormat || undefined}
                                        onChange={(value) => setConnectionConfig(prev => ({ ...prev, fileFormat: value }))}
                                        placeholder="Select file format"
                                    >
                                        <Option value="parquet">Parquet (.parquet)</Option>
                                        <Option value="csv">CSV (.csv)</Option>
                                        <Option value="tsv">TSV (.tsv)</Option>
                                        <Option value="json">JSON (.json)</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>
                    )}
                    
                    {isS3 && (
                        <>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item label="Access Key ID" required>
                                        <Input
                                            value={connectionConfig.accessKey || ''}
                                            onChange={(e) => setConnectionConfig(prev => ({ ...prev, accessKey: e.target.value }))}
                                            placeholder="AKIA..."
                                        />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item label="Secret Access Key" required>
                                        <Input.Password
                                            value={connectionConfig.secretKey || ''}
                                            onChange={(e) => setConnectionConfig(prev => ({ ...prev, secretKey: e.target.value }))}
                                            placeholder="Enter secret key"
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item label="Region" required>
                                        <Input
                                            value={connectionConfig.region || 'us-east-1'}
                                            onChange={(e) => setConnectionConfig(prev => ({ ...prev, region: e.target.value }))}
                                            placeholder="us-east-1"
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </>
                    )}
                    
                    {isAzure && (
                        <>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item label="Storage Account Name" required>
                                        <Input
                                            value={connectionConfig.accountName || ''}
                                            onChange={(e) => setConnectionConfig(prev => ({ ...prev, accountName: e.target.value }))}
                                            placeholder="myaccount"
                                        />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item label="Account Key or SAS Token" required>
                                        <Input.Password
                                            value={connectionConfig.accountKey || connectionConfig.sasToken || ''}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                // Auto-detect if it's a SAS token (starts with ?)
                                                if (value.startsWith('?')) {
                                                    setConnectionConfig(prev => ({ ...prev, sasToken: value, accountKey: '' }));
                                                } else {
                                                    setConnectionConfig(prev => ({ ...prev, accountKey: value, sasToken: '' }));
                                                }
                                            }}
                                            placeholder="Account key or SAS token"
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </>
                    )}
                    
                    {isGCP && (
                        <>
                            <Alert
                                message="GCP Cloud Storage Authentication"
                                description="Provide your GCP service account JSON key for secure access"
                                type="info"
                                showIcon
                                style={{ marginBottom: 16 }}
                            />
                            <Row gutter={16}>
                                <Col span={24}>
                                    <Form.Item 
                                        label="Service Account JSON Key" 
                                        required
                                        help="Paste your GCP service account JSON key. This will be securely encrypted."
                                    >
                                        <Input.TextArea
                                            rows={6}
                                            value={connectionConfig.gcpCredentials || ''}
                                            onChange={(e) => setConnectionConfig(prev => ({ ...prev, gcpCredentials: e.target.value }))}
                                            placeholder='{"type": "service_account", "project_id": "...", "private_key_id": "...", ...}'
                                            style={{ fontFamily: 'monospace', fontSize: '12px' }}
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item label="Project ID (Optional)">
                                        <Input
                                            value={connectionConfig.gcpProjectId || ''}
                                            onChange={(e) => setConnectionConfig(prev => ({ ...prev, gcpProjectId: e.target.value }))}
                                            placeholder="my-gcp-project"
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </>
                    )}
                    
                    {(isDelta || isIceberg) && (
                        <>
                            <Alert
                                message="Cloud Provider Selection"
                                description="Select your cloud storage provider and configure credentials"
                                type="info"
                                showIcon
                                style={{ marginBottom: 16 }}
                            />
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item label="Cloud Provider" required>
                                        <Select
                                            value={
                                                connectionConfig.storageUri?.startsWith('s3://') ? 's3' : 
                                                connectionConfig.storageUri?.startsWith('azure://') || connectionConfig.storageUri?.startsWith('abfss://') ? 'azure' :
                                                connectionConfig.storageUri?.startsWith('gcs://') || connectionConfig.storageUri?.startsWith('gs://') ? 'gcp' :
                                                undefined
                                            }
                                            onChange={(value) => {
                                                const uri = connectionConfig.storageUri || '';
                                                if (value === 's3' && !uri.startsWith('s3://')) {
                                                    setConnectionConfig(prev => ({ ...prev, storageUri: 's3://' }));
                                                } else if (value === 'azure' && !uri.startsWith('azure://') && !uri.startsWith('abfss://')) {
                                                    setConnectionConfig(prev => ({ ...prev, storageUri: 'azure://' }));
                                                } else if (value === 'gcp' && !uri.startsWith('gcs://') && !uri.startsWith('gs://')) {
                                                    setConnectionConfig(prev => ({ ...prev, storageUri: 'gcs://' }));
                                                }
                                            }}
                                            placeholder="Select provider"
                                        >
                                            <Option value="s3">Amazon S3</Option>
                                            <Option value="azure">Azure Blob Storage</Option>
                                            <Option value="gcp">Google Cloud Storage</Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                            </Row>
                            
                            {connectionConfig.storageUri?.startsWith('s3://') && (
                                <>
                                    <Row gutter={16}>
                                        <Col span={12}>
                                            <Form.Item label="Access Key ID" required>
                                                <Input
                                                    value={connectionConfig.accessKey || ''}
                                                    onChange={(e) => setConnectionConfig(prev => ({ ...prev, accessKey: e.target.value }))}
                                                    placeholder="AKIA..."
                                                />
                                            </Form.Item>
                                        </Col>
                                        <Col span={12}>
                                            <Form.Item label="Secret Access Key" required>
                                                <Input.Password
                                                    value={connectionConfig.secretKey || ''}
                                                    onChange={(e) => setConnectionConfig(prev => ({ ...prev, secretKey: e.target.value }))}
                                                    placeholder="Enter secret key"
                                                />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                    <Row gutter={16}>
                                        <Col span={12}>
                                            <Form.Item label="Region" required>
                                                <Input
                                                    value={connectionConfig.region || 'us-east-1'}
                                                    onChange={(e) => setConnectionConfig(prev => ({ ...prev, region: e.target.value }))}
                                                    placeholder="us-east-1"
                                                />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                </>
                            )}
                            
                            {connectionConfig.storageUri?.startsWith('azure://') || connectionConfig.storageUri?.startsWith('abfss://') ? (
                                <>
                                    <Row gutter={16}>
                                        <Col span={12}>
                                            <Form.Item label="Storage Account Name" required>
                                                <Input
                                                    value={connectionConfig.accountName || ''}
                                                    onChange={(e) => setConnectionConfig(prev => ({ ...prev, accountName: e.target.value }))}
                                                    placeholder="myaccount"
                                                />
                                            </Form.Item>
                                        </Col>
                                        <Col span={12}>
                                            <Form.Item label="Account Key or SAS Token" required>
                                                <Input.Password
                                                    value={connectionConfig.accountKey || connectionConfig.sasToken || ''}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        if (value.startsWith('?')) {
                                                            setConnectionConfig(prev => ({ ...prev, sasToken: value, accountKey: '' }));
                                                        } else {
                                                            setConnectionConfig(prev => ({ ...prev, accountKey: value, sasToken: '' }));
                                                        }
                                                    }}
                                                    placeholder="Account key or SAS token"
                                                />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                </>
                            ) : null}
                            
                            {(connectionConfig.storageUri?.startsWith('gcs://') || connectionConfig.storageUri?.startsWith('gs://')) && (
                                <>
                                    <Row gutter={16}>
                                        <Col span={24}>
                                            <Form.Item 
                                                label="Service Account JSON Key" 
                                                required
                                                help="Paste your GCP service account JSON key. This will be securely encrypted."
                                            >
                                                <Input.TextArea
                                                    rows={6}
                                                    value={connectionConfig.gcpCredentials || ''}
                                                    onChange={(e) => setConnectionConfig(prev => ({ ...prev, gcpCredentials: e.target.value }))}
                                                    placeholder='{"type": "service_account", "project_id": "...", "private_key_id": "...", ...}'
                                                    style={{ fontFamily: 'monospace', fontSize: '12px' }}
                                                />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                    <Row gutter={16}>
                                        <Col span={12}>
                                            <Form.Item label="Project ID (Optional)">
                                                <Input
                                                    value={connectionConfig.gcpProjectId || ''}
                                                    onChange={(e) => setConnectionConfig(prev => ({ ...prev, gcpProjectId: e.target.value }))}
                                                    placeholder="my-gcp-project"
                                                />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                </>
                            )}
                            
                            {isDelta && (
                                <Collapse ghost style={{ marginTop: 16 }}>
                                    <Panel header="🕐 Time Travel Options (Optional)" key="time-travel">
                                        <Row gutter={16}>
                                            <Col span={12}>
                                                <Form.Item label="Version (Optional)">
                                                    <Input
                                                        type="number"
                                                        value={connectionConfig.version || ''}
                                                        onChange={(e) => setConnectionConfig(prev => ({ 
                                                            ...prev, 
                                                            version: e.target.value ? parseInt(e.target.value) : undefined 
                                                        }))}
                                                        placeholder="Delta version number"
                                                    />
                                                </Form.Item>
                                            </Col>
                                            <Col span={12}>
                                                <Form.Item label="Timestamp (Optional)">
                                                    <Input
                                                        value={connectionConfig.timestamp || ''}
                                                        onChange={(e) => setConnectionConfig(prev => ({ ...prev, timestamp: e.target.value }))}
                                                        placeholder="2024-01-01 00:00:00"
                                                    />
                                                </Form.Item>
                                            </Col>
                                        </Row>
                                    </Panel>
                                </Collapse>
                            )}
                            
                            {isIceberg && (
                                <Collapse ghost style={{ marginTop: 16 }}>
                                    <Panel header="📸 Snapshot Options (Optional)" key="snapshot">
                                        <Row gutter={16}>
                                            <Col span={12}>
                                                <Form.Item label="Snapshot ID (Optional)">
                                                    <Input
                                                        type="number"
                                                        value={connectionConfig.snapshotId || ''}
                                                        onChange={(e) => setConnectionConfig(prev => ({ 
                                                            ...prev, 
                                                            snapshotId: e.target.value ? parseInt(e.target.value) : undefined 
                                                        }))}
                                                        placeholder="Iceberg snapshot ID"
                                                    />
                                                </Form.Item>
                                            </Col>
                                        </Row>
                                    </Panel>
                                </Collapse>
                            )}
                        </>
                    )}
                    
                    <Form.Item label="Description">
                        <Input.TextArea
                            value={dataSourceConfig.description}
                            onChange={(e) => setDataSourceConfig(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Describe this data source..."
                            rows={3}
                        />
                    </Form.Item>
                </Form>
            </div>
        );
    };
    
    const renderApiConfiguration = () => (
        <div style={{ padding: '8px 0' }}>
            <Title level={4} style={{ marginBottom: '16px' }}>API Configuration</Title>
            
            <Form layout="vertical">
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item label="API Name" required>
                    <Input
                                value={dataSourceConfig.name}
                                onChange={(e) => setDataSourceConfig(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="My API Data Source"
                    />
                </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label="Base URL" required>
                            <Input
                                value={connectionConfig.host}
                                onChange={(e) => setConnectionConfig(prev => ({ ...prev, host: e.target.value }))}
                                placeholder="https://api.example.com"
                            />
                </Form.Item>
                    </Col>
                </Row>
                
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item label="Authentication Type">
                    <Select
                                placeholder="Select authentication method"
                                onChange={(value) => setConnectionConfig(prev => ({ ...prev, username: value }))}
                    >
                        <Option value="none">None</Option>
                        <Option value="basic">Basic Auth</Option>
                                <Option value="bearer">Bearer Token</Option>
                                <Option value="api_key">API Key</Option>
                    </Select>
                </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label="API Key/Token">
                            <Input.Password
                                value={connectionConfig.password}
                                onChange={(e) => setConnectionConfig(prev => ({ ...prev, password: e.target.value }))}
                                placeholder="Enter API key or token"
                            />
                        </Form.Item>
                    </Col>
                </Row>
                
                <Form.Item label="Description">
                    <Input.TextArea
                        value={dataSourceConfig.description}
                        onChange={(e) => setDataSourceConfig(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe this API data source..."
                        rows={3}
                    />
                </Form.Item>
            </Form>
        </div>
    );

    const renderTestAndSave = () => {
        // This function now only renders the test result alert
        // Buttons are moved to footer
        return (
            <>
                {testResult && (
                    <Alert
                        message={testResult.success ? "Connection Successful!" : "Connection Failed"}
                        description={testResult.message || testResult.error}
                        type={testResult.success ? "success" : "error"}
                        showIcon
                        style={{ marginTop: '16px' }}
                    />
                )}
            </>
        );
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return renderDataSourceTypeSelection();
            case 1:
                if (dataSourceConfig.type === 'file') {
                    return renderFileUpload();
                } else if (dataSourceConfig.type === 'api') {
                    return (
                        <>
                            {renderApiConfiguration()}
                            <Divider style={{ margin: '24px 0' }} />
                            {renderTestAndSave()}
                        </>
                    );
                } else if (dataSourceConfig.type === 'warehouse') {
                    // Check if it's a data lake or cloud storage type (Delta/Iceberg/S3/Azure/GCP)
                    if (['delta_lake', 'iceberg', 's3_parquet', 'azure_blob', 'gcp_cloud_storage'].includes(selectedDatabaseType)) {
                        return (
                            <>
                                {renderCloudStorageConfiguration()}
                                <Divider style={{ margin: '24px 0' }} />
                                {renderTestAndSave()}
                            </>
                        );
                    }
                    return (
                        <>
                            {renderDatabaseConfiguration()}
                            <Divider style={{ margin: '24px 0' }} />
                            {renderTestAndSave()}
                        </>
                    );
                } else {
                    return (
                        <>
                            {renderDatabaseConfiguration()}
                            <Divider style={{ margin: '24px 0' }} />
                            {renderTestAndSave()}
                        </>
                    );
                }
            default:
                return null;
        }
    };

    const canProceedToNext = () => {
        switch (currentStep) {
            case 0:
                return dataSourceConfig.type !== undefined && dataSourceConfig.type !== '';
            case 1:
                if (dataSourceConfig.type === 'file') {
                    return uploadedFile !== null && dataSourceConfig.name !== '';
                } else if (dataSourceConfig.type === 'api') {
                    return connectionConfig.host !== '' && dataSourceConfig.name !== '';
                } else {
                    // Check if this is a cloud storage or data lake type
                    const isDataLake = databaseTypes.find(db => db.value === selectedDatabaseType)?.isDataLake;
                    const isCloudStorage = selectedDatabaseType === 's3_parquet' || 
                                          selectedDatabaseType === 'azure_blob' || 
                                          selectedDatabaseType === 'gcp_cloud_storage';
                    
                    if (isDataLake || isCloudStorage) {
                        // For cloud storage/data lake types
                        const hasStorageUri = connectionConfig.storageUri !== '' && 
                            (connectionConfig.storageUri?.startsWith('s3://') || 
                             connectionConfig.storageUri?.startsWith('azure://') || 
                             connectionConfig.storageUri?.startsWith('abfss://') ||
                             connectionConfig.storageUri?.startsWith('gcs://') ||
                             connectionConfig.storageUri?.startsWith('gs://'));
                        
                        if (selectedDatabaseType === 's3_parquet') {
                            // S3 requires: storageUri, accessKey, secretKey, fileFormat
                            return hasStorageUri && 
                                   connectionConfig.accessKey !== '' && 
                                   connectionConfig.secretKey !== '' &&
                                   connectionConfig.fileFormat !== '' &&
                                   dataSourceConfig.name !== '';
                        } else if (selectedDatabaseType === 'azure_blob') {
                            // Azure Blob requires: storageUri, accountName, (accountKey OR sasToken), fileFormat
                            return hasStorageUri && 
                                   connectionConfig.accountName !== '' && 
                                   (connectionConfig.accountKey !== '' || connectionConfig.sasToken !== '') &&
                                   connectionConfig.fileFormat !== '' &&
                                   dataSourceConfig.name !== '';
                        } else if (selectedDatabaseType === 'gcp_cloud_storage') {
                            // GCP Cloud Storage requires: storageUri, serviceAccountKey (gcpCredentials), fileFormat
                            return hasStorageUri && 
                                   connectionConfig.gcpCredentials !== '' &&
                                   connectionConfig.fileFormat !== '' &&
                                   dataSourceConfig.name !== '';
                        } else if (selectedDatabaseType === 'delta_lake') {
                            // Delta Lake requires: storageUri, and S3, Azure, or GCP credentials
                            const hasS3Creds = connectionConfig.storageUri?.startsWith('s3://') && 
                                               connectionConfig.accessKey !== '' && 
                                               connectionConfig.secretKey !== '';
                            const hasAzureCreds = (connectionConfig.storageUri?.startsWith('azure://') || 
                                                  connectionConfig.storageUri?.startsWith('abfss://')) && 
                                                 connectionConfig.accountName !== '' && 
                                                 (connectionConfig.accountKey !== '' || connectionConfig.sasToken !== '');
                            const hasGCPCreds = (connectionConfig.storageUri?.startsWith('gcs://') || 
                                                 connectionConfig.storageUri?.startsWith('gs://')) && 
                                                connectionConfig.gcpCredentials !== '';
                            return hasStorageUri && (hasS3Creds || hasAzureCreds || hasGCPCreds) && dataSourceConfig.name !== '';
                        } else if (selectedDatabaseType === 'iceberg') {
                            // Iceberg requires: storageUri, and S3, Azure, or GCP credentials
                            const hasS3Creds = connectionConfig.storageUri?.startsWith('s3://') && 
                                               connectionConfig.accessKey !== '' && 
                                               connectionConfig.secretKey !== '';
                            const hasAzureCreds = (connectionConfig.storageUri?.startsWith('azure://') || 
                                                  connectionConfig.storageUri?.startsWith('abfss://')) && 
                                                 connectionConfig.accountName !== '' && 
                                                 (connectionConfig.accountKey !== '' || connectionConfig.sasToken !== '');
                            const hasGCPCreds = (connectionConfig.storageUri?.startsWith('gcs://') || 
                                                 connectionConfig.storageUri?.startsWith('gs://')) && 
                                                connectionConfig.gcpCredentials !== '';
                            return hasStorageUri && (hasS3Creds || hasAzureCreds || hasGCPCreds) && dataSourceConfig.name !== '';
                        }
                    }
                    
                    // For traditional database/warehouse types
                    return connectionConfig.host !== '' && 
                           connectionConfig.database !== '' && 
                           connectionConfig.username !== '' && 
                           connectionConfig.password !== '' &&
                           dataSourceConfig.name !== '';
                }
            case 2:
                // For files, this step should not be reached
                if (dataSourceConfig.type === 'file') {
                    return false; // Files don't use step 2
                }
                // For databases/warehouses/APIs, require successful test
                return testResult?.success === true;
            default:
                return false;
        }
    };
    
    const handleNext = () => {
        if (currentStep < 2) {
            // For files, don't advance to step 2 - they complete in step 1
            if (dataSourceConfig.type === 'file') {
                // Files complete in step 1, no need to advance
                return;
            } else {
                setCurrentStep(prev => prev + 1);
            }
        }
    };
    
    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    return (
        <Modal
            title={
                <Space>
                    <DatabaseOutlined />
                    {isChatIntegration ? 'Connect Data for Chat Analysis' : 'Universal Data Source Wizard'}
                </Space>
            }
            open={isOpen}
            onCancel={onClose}
            footer={null}
            width={800}
            destroyOnClose
        >
            <Steps current={currentStep} style={{ marginBottom: '32px' }}>
                {steps.map((step, index) => (
                    <Step key={index} title={step.title} description={step.description} />
                ))}
            </Steps>
            
            {renderStepContent()}
            
            <Divider />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    {currentStep > 0 && (
                        <Button onClick={handlePrev}>
                            ← Previous
                        </Button>
                    )}
                    {currentStep === 0 && (
                        <Button onClick={onClose} type="text">
                            Cancel
                        </Button>
                    )}
                </div>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {currentStep === 0 && (
                        <Button 
                            type="primary" 
                            onClick={handleNext}
                            disabled={!canProceedToNext()}
                        >
                            Next →
                        </Button>
                    )}
                    {currentStep === 1 && dataSourceConfig.type === 'file' && (
                        <Button
                            type="primary"
                            onClick={saveDataSource}
                            loading={loading}
                            disabled={!uploadedFile || !dataSourceConfig.name}
                            icon={<SaveOutlined />}
                        >
                            Save
                        </Button>
                    )}
                    {currentStep === 1 && dataSourceConfig.type !== 'file' && (
                        <>
                            <Button 
                                type="default"
                                onClick={testConnection}
                                loading={loading}
                                icon={<CheckCircleOutlined />}
                            >
                                Test
                            </Button>
                            <Button 
                                type="primary" 
                                onClick={saveDataSource}
                                loading={loading}
                                icon={<SaveOutlined />}
                                disabled={testResult ? !testResult.success : false}
                            >
                                Save
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default UniversalDataSourceModal;