import React from 'react';
import { ExtendedTable } from '../../types';
import FileSection from './FileSection';
import './styles.css';
import { IFileUpload } from '@/app/components/FileUpload/types';
import { Button, Checkbox, Tag, Alert, Space, Typography, Divider } from 'antd';
import { DatabaseOutlined, ReloadOutlined, InfoCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

interface DataSource {
    id: string;
    name: string;
    type: 'file' | 'database' | 'cube' | 'warehouse';
    description?: string;
    row_count?: number;
    schema?: any;
    metadata?: any;
    created_at?: string;
    updated_at?: string;
}

interface Props {
    db?: unknown;
    schema?: string;
    tables?: Array<unknown>;
    file?: IFileUpload;
    getDbList?: (arg0: unknown) => void;
    onDbChange?: (db: unknown) => void;
    onSchemaChange?: (schema?: string) => void;
    onTableSelectChange?: (tables: Array<ExtendedTable>) => void;
    onCustomAIModelChange?: (model: string) => void;
    onFileChange?: (file: IFileUpload) => void;
    onDataSourcesChange?: (sources: DataSource[]) => void;
}

const DataPanel: React.FC<Props> = (props) => {
    const [dataSources, setDataSources] = React.useState<DataSource[]>([]);
    const [selectedDataSources, setSelectedDataSources] = React.useState<string[]>([]);
    const [loading, setLoading] = React.useState(false);

    // Smart selection rules
    const canSelectSource = (sourceType: string, sourceId: string): boolean => {
        const currentSelection = selectedDataSources.map(id => 
            dataSources.find(ds => ds.id === id)
        ).filter(Boolean) as DataSource[];

        // Rule 1: Only one source type at a time
        const hasDifferentType = currentSelection.some(ds => ds.type !== sourceType);
        if (hasDifferentType) return false;

        // Rule 2: Specific rules per type
        switch (sourceType) {
            case 'file':
                // Can select multiple files for analysis
                return true;
            case 'database':
                // Only one database at a time
                return currentSelection.length === 0 || currentSelection[0].type === 'database';
            case 'cube':
                // Only one cube at a time
                return currentSelection.length === 0 || currentSelection[0].type === 'cube';
            case 'warehouse':
                // Only one warehouse at a time
                return currentSelection.length === 0 || currentSelection[0].type === 'warehouse';
            default:
                return false;
        }
    };

    // Handle data source selection with smart rules
    const handleDataSourceSelection = (sourceId: string, selected: boolean) => {
        const source = dataSources.find(ds => ds.id === sourceId);
        if (!source) return;

        if (selected) {
            if (canSelectSource(source.type, sourceId)) {
                setSelectedDataSources(prev => [...prev, sourceId]);
            }
        } else {
            setSelectedDataSources(prev => prev.filter(id => id !== sourceId));
        }
    };

    // Get source type color and icon
    const getSourceTypeInfo = (type: string) => {
        switch (type) {
            case 'file': return { color: 'blue', icon: '📁' };
            case 'database': return { color: 'green', icon: '🗄️' };
            case 'cube': return { color: 'purple', icon: '🧊' };
            case 'warehouse': return { color: 'orange', icon: '🏭' };
            default: return { color: 'default', icon: '❓' };
        }
    };

    // Refresh data sources from backend
    const refreshDataSources = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://127.0.0.1:8000/data/sources');
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data_sources) {
                    const sources = result.data_sources.map((ds: any) => ({
                        id: ds.id,
                        name: ds.name,
                        type: ds.type,
                        description: ds.description,
                        row_count: ds.row_count,
                        schema: ds.schema,
                        metadata: ds.metadata,
                        created_at: ds.created_at,
                        updated_at: ds.updated_at
                    }));
                    setDataSources(sources);
                    
                    // Auto-select first available source if none selected
                    if (selectedDataSources.length === 0 && sources.length > 0) {
                        setSelectedDataSources([sources[0].id]);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch data sources:', error);
        } finally {
            setLoading(false);
        }
    };

    // Load data sources on component mount
    React.useEffect(() => {
        refreshDataSources();
    }, []);

    // Notify parent component when selection changes
    React.useEffect(() => {
        if (props.onDataSourcesChange) {
            const selectedSources = dataSources.filter(ds => selectedDataSources.includes(ds.id));
            props.onDataSourcesChange(selectedSources);
        }
    }, [selectedDataSources, dataSources, props.onDataSourcesChange]);

    return (
        <div className="DataPanel">
            <div className="DataHeader">
                <div className="DataTitle">Data Panel</div>
            </div>
            
            <div className="DataContent">
                {/* Smart Data Source Selection */}
                <div className="data-source-selection">
                    <div className="selection-header">
                        <Title level={5}>
                            <DatabaseOutlined /> Data Sources for AI Analysis
                        </Title>
                        <Button 
                            size="small" 
                            type="text" 
                            icon={<ReloadOutlined />} 
                            onClick={refreshDataSources}
                            loading={loading}
                            title="Refresh data sources"
                        />
                    </div>

                    {/* Selection Rules Info */}
                    <Alert
                        message="Smart Selection Rules"
                        description={
                            <div>
                                <Text strong>• One source type at a time</Text><br/>
                                <Text>• Files: Multiple files allowed</Text><br/>
                                <Text>• Database/Cube/Warehouse: One at a time</Text><br/>
                                <Text>• Selection automatically enforces rules</Text>
                            </div>
                        }
                        type="info"
                        showIcon
                        icon={<InfoCircleOutlined />}
                        style={{ marginBottom: 16 }}
                    />

                    {/* Data Sources List */}
                    {dataSources.length > 0 ? (
                        <div className="data-sources-list">
                            {dataSources.map((source) => {
                                const typeInfo = getSourceTypeInfo(source.type);
                                const isSelected = selectedDataSources.includes(source.id);
                                const canSelect = canSelectSource(source.type, source.id);
                                
                                return (
                                    <div 
                                        key={source.id} 
                                        className={`data-source-item ${isSelected ? 'selected' : ''} ${!canSelect && !isSelected ? 'disabled' : ''}`}
                                    >
                                        <Checkbox
                                            checked={isSelected}
                                            disabled={!canSelect && !isSelected}
                                            onChange={(e) => handleDataSourceSelection(source.id, e.target.checked)}
                                        >
                                            <div className="source-info">
                                                <div className="source-header">
                                                    <span className="source-icon">{typeInfo.icon}</span>
                                                    <span className="source-name">{source.name}</span>
                                                    {isSelected && <CheckCircleOutlined className="selected-icon" />}
                                                </div>
                                                <div className="source-meta">
                                                    <Tag color={typeInfo.color}>{source.type}</Tag>
                                                    {source.row_count && (
                                                        <span className="source-rows">{source.row_count.toLocaleString()} rows</span>
                                                    )}
                                                    {source.description && (
                                                        <span className="source-description">{source.description}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </Checkbox>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="no-data-sources">
                            <Text type="secondary">No data sources available</Text>
                            <Button 
                                type="primary" 
                                size="small" 
                                onClick={refreshDataSources}
                                loading={loading}
                                style={{ marginTop: 8 }}
                            >
                                Refresh
                            </Button>
                        </div>
                    )}

                    {/* Selected Sources Summary */}
                    {selectedDataSources.length > 0 && (
                        <div className="selection-summary">
                            <Divider />
                            <Text strong>Selected for Analysis:</Text>
                            <div className="selected-sources">
                                {selectedDataSources.map(id => {
                                    const source = dataSources.find(ds => ds.id === id);
                                    if (!source) return null;
                                    const typeInfo = getSourceTypeInfo(source.type);
                                    return (
                                        <Tag 
                                            key={id} 
                                            color={typeInfo.color}
                                            closable
                                            onClose={() => handleDataSourceSelection(id, false)}
                                        >
                                            {typeInfo.icon} {source.name}
                                        </Tag>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <Divider />

                {/* Existing File Section */}
                <FileSection
                    value={props.file}
                    onChange={(file) => props.onFileChange?.(file!)}
                />
            </div>
        </div>
    );
};

export default DataPanel;
