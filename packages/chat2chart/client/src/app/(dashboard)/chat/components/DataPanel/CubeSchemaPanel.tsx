'use client';

import React, { useState, useEffect } from 'react';
import { Tree, Space, Typography, Tag, Tooltip, Spin, Alert } from 'antd';
import { CloudOutlined, InfoCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface CubeDimension {
    name: string;
    title: string;
    type: string;
}

interface CubeMeasure {
    name: string;
    title: string;
    shortTitle?: string;
    type: string;
}

interface CubeSegment {
    name: string;
    title: string;
}

interface Cube {
    name: string;
    title: string;
    measures: CubeMeasure[];
    dimensions: CubeDimension[];
    segments: CubeSegment[];
    timeDimensions?: any[];
    filters?: any[];
}

interface CubeSchema {
    cubes: Cube[];
}

interface CubeSchemaPanelProps {
    dataSourceId: string;
    onSchemaSelect?: (schema: any) => void;
}

const CubeSchemaPanel: React.FC<CubeSchemaPanelProps> = ({ dataSourceId, onSchemaSelect }) => {
    const [cubeSchema, setCubeSchema] = useState<CubeSchema | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

    useEffect(() => {
        loadCubeSchema();
    }, [dataSourceId]);

    const loadCubeSchema = async () => {
        setLoading(true);
        setError(null);
        
        try {
            // Fetch real Cube.js schema from the container
            const response = await fetch('http://localhost:4000/cubejs-api/v1/meta');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.cubes && Array.isArray(result.cubes)) {
                setCubeSchema(result);
            } else {
                throw new Error('Invalid Cube.js schema format');
            }
        } catch (error) {
            console.error('Failed to fetch Cube.js schema:', error);
            setError(error instanceof Error ? error.message : 'Failed to load schema');
        } finally {
            setLoading(false);
        }
    };

    const generateTreeData = () => {
        if (!cubeSchema || !cubeSchema.cubes) {
            return [];
        }

        const treeData: any[] = [];

        // Remove the redundant metadata summary section - cubes are shown directly below

        // Add each cube
        cubeSchema.cubes.forEach(cube => {
            const cubeNode: any = {
                key: `cube_${cube.name}`,
                title: (
                    <Space>
                        <CloudOutlined />
                        <Text strong>{cube.title || cube.name}</Text>
                        <Tag color="geekblue">Data Cube</Tag>
                    </Space>
                ),
                children: []
            };

            // Add dimensions
            if (cube.dimensions && cube.dimensions.length > 0) {
                cubeNode.children.push({
                    key: `cube_${cube.name}_dimensions`,
                    title: (
                        <Space>
                            <Text strong>Dimensions</Text>
                            <Tag color="purple">{cube.dimensions.length}</Tag>
                        </Space>
                    ),
                    children: cube.dimensions.map(dim => ({
                        key: `dim_${cube.name}_${dim.name}`,
                        title: (
                            <Space>
                                <Text code>{dim.name}</Text>
                                <Tag color="blue">{dim.type}</Tag>
                                {dim.title !== dim.name && (
                                    <Text type="secondary">({dim.title})</Text>
                                )}
                            </Space>
                        )
                    }))
                });
            }

            // Add measures
            if (cube.measures && cube.measures.length > 0) {
                cubeNode.children.push({
                    key: `cube_${cube.name}_measures`,
                    title: (
                        <Space>
                            <Text strong>Metrics</Text>
                            <Tag color="green">{cube.measures.length}</Tag>
                        </Space>
                    ),
                    children: cube.measures.map(measure => ({
                        key: `measure_${cube.name}_${measure.name}`,
                        title: (
                            <Space>
                                <Text code>{measure.name}</Text>
                                <Tag color="green">{measure.type}</Tag>
                                {measure.shortTitle && (
                                    <Tag color="orange">{measure.shortTitle}</Tag>
                                )}
                                {measure.title !== measure.name && (
                                    <Text type="secondary">({measure.title})</Text>
                                )}
                            </Space>
                        )
                    }))
                });
            }

            // Add segments
            if (cube.segments && cube.segments.length > 0) {
                cubeNode.children.push({
                    key: `cube_${cube.name}_segments`,
                    title: (
                        <Space>
                            <Text strong>Segments</Text>
                            <Tag color="orange">{cube.segments.length}</Tag>
                        </Space>
                    ),
                    children: cube.segments.map(segment => ({
                        key: `segment_${cube.name}_${segment.name}`,
                        title: (
                            <Space>
                                <Text code>{segment.name}</Text>
                                <Text type="secondary">({segment.title})</Text>
                            </Space>
                        )
                    }))
                });
            }

            // Add time dimensions if available
            if (cube.timeDimensions && cube.timeDimensions.length > 0) {
                cubeNode.children.push({
                    key: `cube_${cube.name}_time_dimensions`,
                    title: (
                        <Space>
                            <Text strong>Time Dimensions</Text>
                            <Tag color="cyan">{cube.timeDimensions.length}</Tag>
                        </Space>
                    ),
                    children: cube.timeDimensions.map((timeDim: any) => ({
                        key: `time_dim_${cube.name}_${timeDim.name || timeDim}`,
                        title: (
                            <Space>
                                <Text code>{timeDim.name || timeDim}</Text>
                                <Tag color="cyan">Time</Tag>
                            </Space>
                        )
                    }))
                });
            }

            // Add filters if available
            if (cube.filters && cube.filters.length > 0) {
                cubeNode.children.push({
                    key: `cube_${cube.name}_filters`,
                    title: (
                        <Space>
                            <Text strong>Filters</Text>
                            <Tag color="magenta">{cube.filters.length}</Tag>
                        </Space>
                    ),
                    children: cube.filters.map((filter: any) => ({
                        key: `filter_${cube.name}_${filter.name || filter}`,
                        title: (
                            <Space>
                                <Text code>{filter.name || filter}</Text>
                                <Tag color="magenta">Filter</Tag>
                            </Space>
                        )
                    }))
                });
            }

            treeData.push(cubeNode);
        });

        return treeData;
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '20px' }}>
                <Spin />
                <div style={{ marginTop: '8px' }}>Loading Cube.js schema...</div>
            </div>
        );
    }

    if (error) {
        return (
            <Alert
                message="Failed to load Cube.js schema"
                description={error}
                type="error"
                showIcon
                action={
                    <button onClick={loadCubeSchema} style={{ background: 'none', border: 'none', color: '#1890ff', cursor: 'pointer' }}>
                        Retry
                    </button>
                }
            />
        );
    }

    if (!cubeSchema || !cubeSchema.cubes || cubeSchema.cubes.length === 0) {
        return (
            <Alert
                message="No Cube.js schema available"
                description="No cubes found in the schema. Please check your Cube.js configuration."
                type="warning"
                showIcon
            />
        );
    }

    const treeData = generateTreeData();

    return (
        <div className="CubeSchemaPanel" style={{ padding: '16px', background: '#1f1f1f', borderRadius: '8px' }}>
            <Tree
                treeData={treeData}
                expandedKeys={expandedKeys}
                onExpand={(expandedKeys) => setExpandedKeys(expandedKeys as string[])}
                showLine
                showIcon
                className="schema-tree-compact"
                style={{ background: 'transparent', color: '#ffffff' }}
            />
        </div>
    );
};

export default CubeSchemaPanel;
