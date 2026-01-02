'use client';

import React, { useState } from 'react';
import { Tree, Typography, Tag, Space, Tooltip } from 'antd';
import { TableOutlined } from '@ant-design/icons';
import { DataSource as ContextDataSource, SchemaInfo as ContextSchemaInfo } from '@/context/DataSourceContext';

const { Text } = Typography;

interface FileSchemaTreeProps {
    dataSource: ContextDataSource;
    schema: ContextSchemaInfo;
    onTableClick?: (tableName: string, schemaName: string, dataSource: ContextDataSource) => void;
    onColumnClick?: (tableName: string, columnName: string, schemaName: string, dataSource: ContextDataSource) => void;
}

const FileSchemaTree: React.FC<FileSchemaTreeProps> = ({
    dataSource,
    schema,
    onTableClick,
    onColumnClick
}) => {
    // Internal state for expanded keys - uncontrolled by parent
    const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

    if (!schema || dataSource.type !== 'file') return null;

    const treeData: any[] = [];

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
                            <Text>Size: {dataSource.size?.toString() || 'Unknown'}</Text>
                        </Space>
                    )
                },
                {
                    key: `${dataSource.id}_file_rows`,
                    title: (
                        <Space>
                            <Text>Total Rows: {dataSource.row_count || 'Unknown'}</Text>
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

export default FileSchemaTree;

