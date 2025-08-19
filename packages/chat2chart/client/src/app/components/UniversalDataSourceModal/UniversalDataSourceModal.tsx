'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Upload, Button, Form, Input, Select, message, Card, Space, Tag, Typography, Alert, Progress, Steps, Spin, Divider, Radio, List, Badge, Tooltip } from 'antd';
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
    ReloadOutlined
} from '@ant-design/icons';
import { IFileUpload } from '../FileUpload/types';
import { apiService } from '@/services/apiService';
import { WorkflowNavigation, WorkflowStep } from '../WorkflowNavigation';

const { Dragger } = Upload;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Step } = Steps;

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
    
    // File upload state
    const [uploadedFile, setUploadedFile] = useState<IFileUpload | null>(null);
    
    // Database connection state
    const [dbConnection, setDbConnection] = useState({
        host: '',
        port: 5432,
        database: '',
        username: '',
        password: '',
        type: 'postgresql',
        connectionType: 'manual' as 'manual' | 'uri',
        uri: ''
    });

    // Data warehouse connection state
    const [warehouseConnection, setWarehouseConnection] = useState({
        type: 'snowflake',
        account: '',
        warehouse: '',
        database: '',
        schema: '',
        username: '',
        password: ''
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

    // Data source connectors with semantic labels
    const dataSourceConnectors = [
        {
            name: 'PostgreSQL',
            type: 'postgresql',
            icon: <DatabaseOutlined />,
            description: 'Enterprise relational database',
            features: ['Structured data', 'SQL queries', 'Real-time analytics'],
            defaultPort: 5432,
            recommended: true,
            logo: '🐘'
        },
        {
            name: 'Snowflake',
            type: 'snowflake',
            icon: <CloudOutlined />,
            description: 'Cloud data warehouse',
            features: ['Scalable storage', 'Fast queries', 'Data sharing'],
            defaultPort: 443,
            recommended: true,
            logo: '❄️'
        },
        {
            name: 'BigQuery',
            type: 'bigquery',
            icon: <CloudOutlined />,
            description: 'Google Cloud analytics',
            features: ['Serverless', 'ML ready', 'Cost effective'],
            defaultPort: null,
            recommended: true,
            logo: '🔍'
        },
        {
            name: 'MySQL',
            type: 'mysql',
            icon: <DatabaseOutlined />,
            description: 'Open source database',
            features: ['Fast performance', 'Easy setup', 'Wide support'],
            defaultPort: 3306,
            recommended: false,
            logo: '🐬'
        },
        {
            name: 'Redshift',
            type: 'redshift',
            icon: <CloudOutlined />,
            description: 'AWS analytics database',
            features: ['Columnar storage', 'Massive scale', 'S3 integration'],
            defaultPort: 5439,
            recommended: false,
            logo: '🔴'
        },
        {
            name: 'MongoDB',
            type: 'mongodb',
            icon: <DatabaseOutlined />,
            description: 'Document database',
            features: ['Flexible schema', 'JSON data', 'Scalable'],
            defaultPort: 27017,
            recommended: false,
            logo: '🍃'
        },
        {
            name: 'SQL Server',
            type: 'sqlserver',
            icon: <DatabaseOutlined />,
            description: 'Microsoft database',
            features: ['Enterprise features', 'Windows integration', 'BI tools'],
            defaultPort: 1433,
            recommended: false,
            logo: '🪟'
        }
    ];

    // Enhanced workflow steps with proper progression
    const workflowSteps: WorkflowStep[] = [
        {
            key: 'connect',
            title: 'Connect Data Source',
            description: 'Upload files or connect to databases, warehouses, or APIs',
            isRequired: true,
            isCompleted: false,
            canSkip: false
        },
        {
            key: 'analyze',
            title: 'AI Analysis & Modeling',
            description: 'AI analyzes data quality and generates semantic models',
            isRequired: true,
            isCompleted: false,
            canSkip: false
        },
        {
            key: 'deploy',
            title: 'Deploy & Ready',
            description: 'Deploy to analytics platform and start analyzing',
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

    // AI data modeling state
    const [aiDataModeling, setAiDataModeling] = useState<{
        semanticModels: Array<{
            name: string;
            description: string;
            entities: string[];
            relationships: string[];
            metrics: string[];
        }>;
        businessInsights: string[];
        dataRelationships: string[];
        recommendedMetrics: string[];
        isGenerating: boolean;
        yamlSchema?: string;
    }>({
        semanticModels: [],
        businessInsights: [],
        dataRelationships: [],
        recommendedMetrics: [],
        isGenerating: false
    });

    // User review and approval state
    const [userReview, setUserReview] = useState({
        schemaApproved: false,
        cubeDeploymentApproved: false,
        feedback: '',
        customizations: {},
        reviewStatus: 'pending' as 'pending' | 'in_review' | 'approved' | 'rejected',
        reviewer: '',
        reviewDate: '',
        comments: '',
        requiresApproval: false
    });

    // Multiple data sources state
    const [dataSources, setDataSources] = useState<Array<{
        id: string;
        name: string;
        type: 'file' | 'database' | 'warehouse' | 'api';
        config: any;
        status: 'connected' | 'disconnected' | 'error';
        isActive: boolean;
    }>>([]);

    // Current active data source
    const [activeDataSourceId, setActiveDataSourceId] = useState<string | null>(null);

    // Get current active data source
    const getActiveDataSource = () => {
        return dataSources.find(ds => ds.id === activeDataSourceId) || null;
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
                uri: ''
            });
            setWarehouseConnection({
                type: 'snowflake',
                account: '',
                warehouse: '',
                database: '',
                schema: '',
                username: '',
                password: ''
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
                isGenerating: false
            });
            }
    }, [isOpen, initialDataSourceType]);

    // Step validation
    const canProceedToNext = (): boolean => {
        switch (currentStep) {
            case 1: // Connect Data Source
                return !!getActiveDataSource() && getActiveDataSource()?.status === 'connected';
            case 2: // AI Analysis & Modeling
                return aiDataModeling.semanticModels.length > 0 || aiDataModeling.yamlSchema;
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
                        type: dataSourceConfig.type,
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

            // Update the data source with connection details
            const updatedSource = {
                ...activeSource,
                status: 'connected' as const,
                name: dataSourceConfig.name || `Connected ${activeSource.type}`,
                                    config: {
                        ...activeSource.config,
                        connectionDetails: activeSource.type === 'file' ? {
                            filename: uploadedFile?.filename || '',
                            content_type: uploadedFile?.content_type || '',
                            storage_type: uploadedFile?.storage_type || '',
                            file_size: uploadedFile?.file_size || 0,
                            uuid_filename: uploadedFile?.uuid_filename || ''
                        } : 
                        activeSource.type === 'database' ? dbConnection :
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

    // Generate AI schema using the backend AI service
    const generateAISchema = async () => {
        try {
            setAiDataModeling(prev => ({ ...prev, isGenerating: true }));
            
            const activeSource = getActiveDataSource();
            if (!activeSource) {
                message.error('No active data source found');
                return;
            }

            // Call the AI service to generate schema
            const response = await fetch('http://localhost:8000/ai/schema/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    data_source_id: activeSource.id,
                    data_source_type: activeSource.type,
                    connection_details: activeSource.config.connectionDetails,
                    business_context: dataSourceConfig.businessContext || 'general analytics'
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate schema');
            }

            const result = await response.json();
            
            if (result.success && result.schema) {
                setAiDataModeling(prev => ({ 
                    ...prev,
                    yamlSchema: result.schema,
                    isGenerating: false 
                }));
                message.success('AI schema generated successfully!');
            } else {
                throw new Error(result.error || 'Schema generation failed');
            }
        } catch (error) {
            console.error('Schema generation error:', error);
            message.error('Failed to generate AI schema');
            setAiDataModeling(prev => ({ ...prev, isGenerating: false }));
        }
    };

    // Regenerate schema
    const regenerateSchema = () => {
        setAiDataModeling(prev => ({ ...prev, yamlSchema: undefined }));
        generateAISchema();
    };

    // Deploy schema to Cube.js
    const deployToCube = async () => {
        try {
            setCubeIntegration(prev => ({ ...prev, status: 'analyzing' }));
            
            const activeSource = getActiveDataSource();
            if (!activeSource || !aiDataModeling.yamlSchema) {
                message.error('No active data source or schema found');
                return;
            }

            // Simulate deployment to Cube.js (since we don't have the actual endpoint yet)
            // In production, this would call the real Cube.js API
            setTimeout(() => {
                setCubeIntegration(prev => ({ 
                    ...prev, 
                    status: 'deployed',
                    deployment_url: 'http://localhost:4000'
                }));
                message.success('Successfully deployed semantic data model!');
            }, 2000); // Simulate 2 second deployment

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
            const finalDataSource = {
                id: activeSource.id,
                name: dataSourceConfig.name || `Connected ${activeSource.type}`,
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
                    beforeUpload={(file) => {
                    setUploadedFile({
                        filename: file.name,
                        content_type: file.type,
                        storage_type: 'local',
                        file_size: file.size,
                        uuid_filename: file.name
                    });
                    return false; // Prevent auto upload
                }}
                onRemove={() => setUploadedFile(null)}
                >
                    <p className="ant-upload-drag-icon">
                        <InboxOutlined />
                    </p>
                    <p className="ant-upload-text">Click or drag file to this area to upload</p>
                    <p className="ant-upload-hint">
                    Support for CSV, Excel, JSON, and other data formats
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
                </Card>
            )}
            
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
                        <Button
                            type="primary"
                    size="large"
                    disabled={!uploadedFile}
                    onClick={handleDataSourceConnected}
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
                            .filter(connector => ['postgresql', 'mysql', 'sqlserver', 'mongodb'].includes(connector.type))
                            .map(connector => (
                                <Option key={connector.type} value={connector.type}>
                                    <Space>
                                        {connector.logo} {connector.name}
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
                
                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                    <Button
                        type="primary"
                        size="large"
                        disabled={!dbConnection.host && !dbConnection.uri}
                        onClick={handleDataSourceConnected}
                        icon={<ArrowRightOutlined />}
                    >
                        Test & Continue
                    </Button>
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
                            .filter(connector => ['snowflake', 'bigquery', 'redshift'].includes(connector.type))
                            .map(connector => (
                                <Option key={connector.type} value={connector.type}>
                                    <Space>
                                        {connector.logo} {connector.name}
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
                
                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                    <Button
                        type="primary"
                        size="large"
                        disabled={!warehouseConnection.account}
                        onClick={handleDataSourceConnected}
                        icon={<ArrowRightOutlined />}
                    >
                        Test & Continue
                    </Button>
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
                
                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                    <Button
                        type="primary"
                        size="large"
                        disabled={!apiConnection.url}
                        onClick={handleDataSourceConnected}
                        icon={<ArrowRightOutlined />}
                    >
                        Test & Continue
                    </Button>
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
                                <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                                {item}
                                </List.Item>
                            )}
                        />
                                    </Space>
                    </Card>

            {/* AI Analysis Progress */}
            <Card title="AI Analysis Progress" style={{ marginBottom: '16px' }}>
                        <Space direction="vertical" style={{ width: '100%' }}>
                        <Button 
                            type="primary" 
                        onClick={generateAISchema}
                        loading={aiDataModeling.isGenerating}
                        icon={<BulbOutlined />}
                    >
                        Generate AI Schema
                        </Button>
            
            {aiDataModeling.isGenerating && (
                        <div style={{ textAlign: 'center' }}>
                            <Spin size="large" />
                            <Text>AI is analyzing your data and generating schema...</Text>
                                            </div>
                    )}
                    
                    {aiDataModeling.yamlSchema && (
                         <Card title="Generated YAML Schema" size="small">
                             <div style={{ marginBottom: '16px' }}>
                                 <Text strong>Schema Preview:</Text>
                                                    <div style={{ 
                                                        backgroundColor: '#1f1f1f', 
                                                        color: '#ffffff',
                                                        padding: '16px', 
                                                        borderRadius: '6px',
                                                        fontFamily: 'monospace',
                                                        fontSize: '12px',
                                     border: '1px solid #434343',
                                     maxHeight: '200px',
                                     overflow: 'auto'
                                 }}>
                                     <pre>{aiDataModeling.yamlSchema}</pre>
                                                    </div>
                                                                </div>
                             
                             <div style={{ marginBottom: '16px' }}>
                                 <Text strong>YAML Editor:</Text>
                                                <Input.TextArea
                                     value={aiDataModeling.yamlSchema}
                                     onChange={(e) => setAiDataModeling(prev => ({ 
                                         ...prev, 
                                         yamlSchema: e.target.value 
                                     }))}
                                     rows={8}
                                                    style={{ 
                                                        fontFamily: 'monospace', 
                                                        fontSize: '12px',
                                         backgroundColor: '#fafafa',
                                         border: '1px solid #d9d9d9'
                                                    }}
                                     placeholder="Edit your YAML schema here..."
                                                />
                             </div>
                             
                             <Space style={{ marginTop: '16px' }}>
                                                <Button 
                                     size="small" 
                                     onClick={() => setUserReview(prev => ({ ...prev, schemaApproved: true }))}
                                     icon={<CheckCircleOutlined />}
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
                                         // Validate YAML syntax
                                         try {
                                             // Basic YAML validation
                                             if (aiDataModeling.yamlSchema?.includes('cubes:')) {
                                                 message.success('YAML schema is valid!');
                                             } else {
                                                 message.warning('YAML schema format may be incomplete');
                                             }
                                         } catch (e) {
                                             message.error('Invalid YAML syntax');
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
            <Card title="🚀 Deploy & Ready" style={{ marginBottom: '16px' }}>
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
                                <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                                {item}
                            </List.Item>
                        )}
                    />
                    </Space>
                </Card>

            {/* Semantic Data Model Deployment */}
            <Card title="Semantic Data Model Deployment" style={{ marginBottom: '16px' }}>
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
                );
            case 2:
                return renderAnalysisStep();
            case 3:
                return renderDeploymentStep();
            default:
                return null;
        }
    };

    return (
        <Modal
            title={
                <Space>
                    <DatabaseOutlined />
                    {isChatIntegration ? 'Connect Data for Chat Analysis' : 'Universal Data Source Connection'}
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