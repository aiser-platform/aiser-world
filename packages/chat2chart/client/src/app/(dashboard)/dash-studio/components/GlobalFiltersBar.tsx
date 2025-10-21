'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Select,
  DatePicker,
  Input,
  Button,
  Space,
  Tag,
  Tooltip,
  Dropdown,
  Menu,
  message,
  Typography,
  Row,
  Col,
  Divider
} from 'antd';
import {
  FilterOutlined,
  PlusOutlined,
  CloseOutlined,
  SearchOutlined,
  CalendarOutlined,
  DownOutlined,
  ClearOutlined
} from '@ant-design/icons';
import { RangePickerProps } from 'antd/es/date-picker';
import dayjs, { Dayjs } from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Text } = Typography;

export interface GlobalFilter {
  id: string;
  type: 'dropdown' | 'dateRange' | 'search' | 'numberRange';
  field: string;
  label: string;
  value: any;
  options?: Array<{ label: string; value: any }>;
  placeholder?: string;
  affects: string[]; // Widget IDs this filter affects
}

interface GlobalFiltersBarProps {
  filters: GlobalFilter[];
  onFilterChange: (filters: GlobalFilter[]) => void;
  onFilterAdd: () => void;
  onFilterRemove: (filterId: string) => void;
  availableFields: Array<{ field: string; label: string; type: string }>;
  isDarkMode?: boolean;
}

const GlobalFiltersBar: React.FC<GlobalFiltersBarProps> = ({
  filters,
  onFilterChange,
  onFilterAdd,
  onFilterRemove,
  availableFields,
  isDarkMode = false
}) => {
  const [isAddingFilter, setIsAddingFilter] = useState(false);
  const [newFilterType, setNewFilterType] = useState<string>('dropdown');
  const [newFilterField, setNewFilterField] = useState<string>('');

  // Update filter value
  const handleFilterValueChange = (filterId: string, value: any) => {
    const updatedFilters = filters.map(filter => 
      filter.id === filterId ? { ...filter, value } : filter
    );
    onFilterChange(updatedFilters);
  };

  // Add new filter
  const handleAddFilter = () => {
    if (!newFilterField) {
      message.warning('Please select a field');
      return;
    }

    const field = availableFields.find(f => f.field === newFilterField);
    if (!field) return;

    const newFilter: GlobalFilter = {
      id: `filter-${Date.now()}`,
      type: newFilterType as any,
      field: newFilterField,
      label: field.label,
      value: getDefaultValue(newFilterType),
      affects: [], // Will be populated based on widgets
      options: newFilterType === 'dropdown' ? getFieldOptions(newFilterField) : undefined,
      placeholder: getPlaceholder(newFilterType, field.label)
    };

    onFilterChange([...filters, newFilter]);
    setIsAddingFilter(false);
    setNewFilterField('');
    setNewFilterType('dropdown');
    message.success(`Filter added for ${field.label}`);
  };

  // Get default value based on filter type
  const getDefaultValue = (type: string) => {
    switch (type) {
      case 'dropdown': return undefined;
      case 'dateRange': return null;
      case 'search': return '';
      case 'numberRange': return { min: undefined, max: undefined };
      default: return undefined;
    }
  };

  // Get placeholder text
  const getPlaceholder = (type: string, label: string) => {
    switch (type) {
      case 'dropdown': return `Select ${label}`;
      case 'dateRange': return `Select ${label} range`;
      case 'search': return `Search ${label}`;
      case 'numberRange': return `${label} range`;
      default: return '';
    }
  };

  // Get field options (mock data - replace with real data)
  const getFieldOptions = (field: string) => {
    const mockOptions: Record<string, Array<{ label: string; value: any }>> = {
      category: [
        { label: 'Electronics', value: 'electronics' },
        { label: 'Clothing', value: 'clothing' },
        { label: 'Books', value: 'books' },
        { label: 'Home & Garden', value: 'home' }
      ],
      region: [
        { label: 'North America', value: 'na' },
        { label: 'Europe', value: 'eu' },
        { label: 'Asia', value: 'asia' },
        { label: 'South America', value: 'sa' }
      ],
      status: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Pending', value: 'pending' }
      ]
    };
    return mockOptions[field] || [];
  };

  // Clear all filters
  const handleClearAll = () => {
    const clearedFilters = filters.map(filter => ({ ...filter, value: getDefaultValue(filter.type) }));
    onFilterChange(clearedFilters);
    message.info('All filters cleared');
  };

  // Render filter based on type
  const renderFilter = (filter: GlobalFilter) => {
    const commonProps = {
      size: 'small' as const,
      style: { minWidth: 150 }
    };

    switch (filter.type) {
      case 'dropdown':
        return (
          <Select
            {...commonProps}
            placeholder={filter.placeholder}
            value={filter.value}
            onChange={(value) => handleFilterValueChange(filter.id, value)}
            allowClear
          >
            {filter.options?.map(option => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        );

      case 'dateRange':
        return (
          <RangePicker
            {...commonProps}
            placeholder={['Start date', 'End date']}
            value={filter.value ? [dayjs(filter.value[0]), dayjs(filter.value[1])] : null}
            onChange={(dates) => {
              const value = dates ? [dates[0]?.toISOString(), dates[1]?.toISOString()] : null;
              handleFilterValueChange(filter.id, value);
            }}
          />
        );

      case 'search':
        return (
          <Input
            {...commonProps}
            placeholder={filter.placeholder}
            value={filter.value}
            onChange={(e) => handleFilterValueChange(filter.id, e.target.value)}
            prefix={<SearchOutlined />}
            allowClear
          />
        );

      case 'numberRange':
        return (
          <Input.Group compact style={{ minWidth: 200 }}>
            <Input
              size="small"
              placeholder="Min"
              value={filter.value?.min}
              onChange={(e) => handleFilterValueChange(filter.id, {
                ...filter.value,
                min: e.target.value ? Number(e.target.value) : undefined
              })}
              style={{ width: '50%' }}
            />
            <Input
              size="small"
              placeholder="Max"
              value={filter.value?.max}
              onChange={(e) => handleFilterValueChange(filter.id, {
                ...filter.value,
                max: e.target.value ? Number(e.target.value) : undefined
              })}
              style={{ width: '50%' }}
            />
          </Input.Group>
        );

      default:
        return null;
    }
  };

  // Check if filter has active value
  const hasActiveValue = (filter: GlobalFilter) => {
    switch (filter.type) {
      case 'dropdown': return filter.value !== undefined;
      case 'dateRange': return filter.value !== null;
      case 'search': return filter.value !== '';
      case 'numberRange': return filter.value?.min !== undefined || filter.value?.max !== undefined;
      default: return false;
    }
  };

  return (
    <Card
      size="small"
      style={{
        marginBottom: 16,
        background: isDarkMode ? '#1f1f1f' : '#ffffff',
        border: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`
      }}
      bodyStyle={{ padding: '12px 16px' }}
    >
      <Row align="middle" justify="space-between">
        <Col>
          <Space size="small" wrap>
            <Text strong style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
              <FilterOutlined /> Global Filters
            </Text>
            
            {filters.length > 0 && (
              <Button
                size="small"
                type="text"
                icon={<ClearOutlined />}
                onClick={handleClearAll}
                style={{ color: isDarkMode ? '#ffffff' : '#000000' }}
              >
                Clear All
              </Button>
            )}
          </Space>
        </Col>
        
        <Col>
          <Space size="small" wrap>
            {filters.map(filter => (
              <Card
                key={filter.id}
                size="small"
                style={{
                  background: hasActiveValue(filter) 
                    ? (isDarkMode ? '#2f2f2f' : '#f0f8ff')
                    : (isDarkMode ? '#1a1a1a' : '#fafafa'),
                  border: `1px solid ${hasActiveValue(filter) 
                    ? (isDarkMode ? '#404040' : '#1890ff')
                    : (isDarkMode ? '#303030' : '#d9d9d9')}`,
                  borderRadius: 6
                }}
                bodyStyle={{ padding: '8px 12px' }}
              >
                <Space size="small">
                  <Text style={{ fontSize: 12, color: isDarkMode ? '#ffffff' : '#000000' }}>
                    {filter.label}:
                  </Text>
                  {renderFilter(filter)}
                  <Button
                    size="small"
                    type="text"
                    icon={<CloseOutlined />}
                    onClick={() => onFilterRemove(filter.id)}
                    style={{ color: isDarkMode ? '#ffffff' : '#000000' }}
                  />
                </Space>
              </Card>
            ))}
            
            {isAddingFilter ? (
              <Card
                size="small"
                style={{
                  background: isDarkMode ? '#2f2f2f' : '#f0f8ff',
                  border: `1px solid ${isDarkMode ? '#404040' : '#1890ff'}`,
                  borderRadius: 6
                }}
                bodyStyle={{ padding: '8px 12px' }}
              >
                <Space size="small">
                  <Select
                    size="small"
                    placeholder="Field"
                    value={newFilterField}
                    onChange={setNewFilterField}
                    style={{ minWidth: 120 }}
                  >
                    {availableFields.map(field => (
                      <Option key={field.field} value={field.field}>
                        {field.label}
                      </Option>
                    ))}
                  </Select>
                  
                  <Select
                    size="small"
                    value={newFilterType}
                    onChange={setNewFilterType}
                    style={{ minWidth: 100 }}
                  >
                    <Option value="dropdown">Dropdown</Option>
                    <Option value="dateRange">Date Range</Option>
                    <Option value="search">Search</Option>
                    <Option value="numberRange">Number Range</Option>
                  </Select>
                  
                  <Button
                    size="small"
                    type="primary"
                    onClick={handleAddFilter}
                  >
                    Add
                  </Button>
                  
                  <Button
                    size="small"
                    onClick={() => setIsAddingFilter(false)}
                  >
                    Cancel
                  </Button>
                </Space>
              </Card>
            ) : (
              <Button
                size="small"
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => setIsAddingFilter(true)}
                style={{
                  borderColor: isDarkMode ? '#404040' : '#d9d9d9',
                  color: isDarkMode ? '#ffffff' : '#000000'
                }}
              >
                Add Filter
              </Button>
            )}
          </Space>
        </Col>
      </Row>
    </Card>
  );
};

export { GlobalFiltersBar };
export default GlobalFiltersBar;
