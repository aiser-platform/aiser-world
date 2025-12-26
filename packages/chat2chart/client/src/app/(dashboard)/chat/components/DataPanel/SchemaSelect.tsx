'use client';

import React from 'react';
import { Select } from 'antd';

interface SchemaSelectProps {
    value: string;
    onChange: (value: string) => void;
    schemas: string[];
}

const SchemaSelect: React.FC<SchemaSelectProps> = ({ value, onChange, schemas }) => {
    return (
        <Select
            value={value}
            onChange={onChange}
            style={{ width: '100%', marginTop: 8, height: 40, fontSize: 14 }}
            placeholder="Select schema"
            size="middle"
        >
            {schemas.map((sn: string, idx: number) => (
                <Select.Option key={`${idx}-${sn}`} value={sn}>{sn}</Select.Option>
            ))}
        </Select>
    );
};

// Custom comparison: compare array contents, not references
const areEqual = (prevProps: SchemaSelectProps, nextProps: SchemaSelectProps) => {
    // Compare primitive props
    if (prevProps.value !== nextProps.value) return false;
    if (prevProps.onChange !== nextProps.onChange) return false;
    
    // Compare array contents (deep comparison for arrays)
    if (prevProps.schemas.length !== nextProps.schemas.length) return false;
    return prevProps.schemas.every((schema, index) => schema === nextProps.schemas[index]);
};

export default React.memo(SchemaSelect, areEqual);