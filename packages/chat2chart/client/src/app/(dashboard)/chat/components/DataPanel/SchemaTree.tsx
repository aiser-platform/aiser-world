'use client';

import React, { useState } from 'react';
import { Tree, Typography, Tag, Space, Tooltip } from 'antd';
import { TableOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { DataSource as ContextDataSource, SchemaInfo as ContextSchemaInfo } from '@/context/DataSourceContext';

const { Text } = Typography;

interface SchemaTreeProps {
    dataSource: ContextDataSource;
    schema: ContextSchemaInfo;
    onTableClick?: (tableName: string, schemaName: string, dataSource: ContextDataSource) => void;
    onColumnClick?: (tableName: string, columnName: string, schemaName: string, dataSource: ContextDataSource) => void;
}

const SchemaTree: React.FC<SchemaTreeProps> = ({
    dataSource,
    schema,
    onTableClick,
    onColumnClick
}) => {
    // Internal state for expanded keys - uncontrolled by parent
    const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

    if (!schema) return null;

    const treeData: any[] = [];

    // Skip Cube.js schema (handled elsewhere)
    if (dataSource.type === 'cube' && schema.cubes) {
        return null;
    }

    if (dataSource.type === 'database' && schema.schemas) {
        // Enhanced database schema display with proper hierarchy
        // Group tables by schema
        const schemaGroups: Record<string, ContextSchemaInfo['tables']> = {};
        schema.tables?.forEach((table) => {
            const schemaName = table.schema || 'public';
            if (!schemaGroups[schemaName]) {
                schemaGroups[schemaName] = [];
            }
            schemaGroups[schemaName]!.push(table);
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

export default SchemaTree;

