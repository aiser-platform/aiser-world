'use client';

import React from 'react';
import { Select, Typography } from 'antd';

const { Text } = Typography;

interface TableViewSelectProps {
    value: string | undefined;
    onChange: (value: string) => void;
    tables: Array<{ name: string; schema?: string }>;
    views: Array<{ name: string; schema?: string }>;
    dataSourceId: string;
    selectedSchemaName: string;
}

const TableViewSelect: React.FC<TableViewSelectProps> = ({
    value,
    onChange,
    tables,
    views,
    dataSourceId,
    selectedSchemaName
}) => {
    const filteredTables = tables.filter(t => (t.schema || 'public') === selectedSchemaName);
    const filteredViews = views.filter(v => (v.schema || 'public') === selectedSchemaName);

    return (
        <Select
            value={value}
            onChange={onChange}
            style={{ width: '100%', marginTop: 8, height: 40, fontSize: 14 }}
            placeholder="Select table or view"
            size="middle"
            showSearch
            optionFilterProp="children"
        >
            {filteredTables.map(t => (
                <Select.Option key={`${dataSourceId}_${selectedSchemaName}_${t.name}`} value={`${dataSourceId}_${selectedSchemaName}_${t.name}`}>
                    🗄️ {t.name}
                </Select.Option>
            ))}
            {filteredViews.map(v => (
                <Select.Option key={`${dataSourceId}_${selectedSchemaName}_view_${v.name}`} value={`${dataSourceId}_${selectedSchemaName}_view_${v.name}`}>
                    👁️ {v.name} (view)
                </Select.Option>
            ))}
        </Select>
    );
};

export default React.memo(TableViewSelect);

