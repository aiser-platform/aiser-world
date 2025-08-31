'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    Card,
    Button,
    Space,
    Typography,
    Select,
    DatePicker,
    Slider,
    Input,
    Switch,
    Tag,
    Divider,
    Row,
    Col,
    message,
    Tooltip
} from 'antd';
import {
    FilterOutlined,
    SyncOutlined,
    ClearOutlined,
    SettingOutlined,
    EyeOutlined,
    EyeInvisibleOutlined,
    LinkOutlined,
    DisconnectOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

// Filter Context for cross-widget communication
interface FilterValue {
    id: string;
    value: any;
    type: 'string' | 'number' | 'date' | 'boolean' | 'array';
    widgetIds: string[];
}

interface FilterContextType {
    filters: FilterValue[];
    addFilter: (filter: FilterValue) => void;
    updateFilter: (filterId: string, value: any) => void;
    removeFilter: (filterId: string) => void;
    clearAllFilters: () => void;
    getFilterValue: (filterId: string) => any;
    subscribeToFilter: (filterId: string, widgetId: string) => void;
    unsubscribeFromFilter: (filterId: string, widgetId: string) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const useFilterContext = () => {
    const context = useContext(FilterContext);
    if (!context) {
        throw new Error('useFilterContext must be used within a FilterProvider');
    }
    return context;
};

// Filter Provider Component
export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [filters, setFilters] = useState<FilterValue[]>([]);

    const addFilter = useCallback((filter: FilterValue) => {
        setFilters(prev => [...prev, filter]);
        message.success(`Filter '${filter.id}' added`);
    }, []);

    const updateFilter = useCallback((filterId: string, value: any) => {
        setFilters(prev => prev.map(f => 
            f.id === filterId ? { ...f, value } : f
        ));
    }, []);

    const removeFilter = useCallback((filterId: string) => {
        setFilters(prev => prev.filter(f => f.id !== filterId));
        message.success('Filter removed');
    }, []);

    const clearAllFilters = useCallback(() => {
        setFilters([]);
        message.success('All filters cleared');
    }, []);

    const getFilterValue = useCallback((filterId: string) => {
        const filter = filters.find(f => f.id === filterId);
        return filter?.value;
    }, [filters]);

    const subscribeToFilter = useCallback((filterId: string, widgetId: string) => {
        setFilters(prev => prev.map(f => 
            f.id === filterId 
                ? { ...f, widgetIds: f.widgetIds.includes(widgetId) ? f.widgetIds : [...f.widgetIds, widgetId] }
                : f
        ));
    }, []);

    const unsubscribeFromFilter = useCallback((filterId: string, widgetId: string) => {
        setFilters(prev => prev.map(f => 
            f.id === filterId 
                ? { ...f, widgetIds: f.widgetIds.filter(id => id !== widgetId) }
                : f
        ));
    }, []);

    const contextValue: FilterContextType = {
        filters,
        addFilter,
        updateFilter,
        removeFilter,
        clearAllFilters,
        getFilterValue,
        subscribeToFilter,
        unsubscribeFromFilter
    };

    return (
        <FilterContext.Provider value={contextValue}>
            {children}
        </FilterContext.Provider>
    );
};

// Cross-Widget Filter Component
interface CrossWidgetFiltersProps {
    onFilterChange: (filters: FilterValue[]) => void;
}

const CrossWidgetFilters: React.FC<CrossWidgetFiltersProps> = ({ onFilterChange }) => {
    const filterContext = useFilterContext();
    const [newFilterType, setNewFilterType] = useState<string>('string');
    const [newFilterId, setNewFilterId] = useState<string>('');
    const [newFilterValue, setNewFilterValue] = useState<any>('');
    const [showAddFilter, setShowAddFilter] = useState(false);

    // Notify parent of filter changes
    useEffect(() => {
        onFilterChange(filterContext.filters);
    }, [filterContext.filters, onFilterChange]);

    // Add new filter
    const handleAddFilter = () => {
        if (!newFilterId.trim()) {
            message.error('Please enter a filter ID');
            return;
        }

        const filter: FilterValue = {
            id: newFilterId.trim(),
            value: newFilterValue,
            type: newFilterType as any,
            widgetIds: []
        };

        filterContext.addFilter(filter);
        setNewFilterId('');
        setNewFilterValue('');
        setShowAddFilter(false);
    };

    // Get filter input component based on type
    const getFilterInput = (filter: FilterValue) => {
        switch (filter.type) {
            case 'string':
                return (
                    <Input
                        value={filter.value}
                        onChange={(e) => filterContext.updateFilter(filter.id, e.target.value)}
                        placeholder="Enter filter value"
                    />
                );
                
            case 'number':
                return (
                    <Slider
                        min={0}
                        max={100}
                        value={filter.value}
                        onChange={(value) => filterContext.updateFilter(filter.id, value)}
                        style={{ width: '100%' }}
                    />
                );
                
            case 'date':
                return (
                    <DatePicker
                        value={filter.value}
                        onChange={(date) => filterContext.updateFilter(filter.id, date)}
                        style={{ width: '100%' }}
                    />
                );
                
            case 'boolean':
                return (
                    <Switch
                        checked={filter.value}
                        onChange={(checked) => filterContext.updateFilter(filter.id, checked)}
                    />
                );
                
            case 'array':
                return (
                    <Select
                        mode="multiple"
                        value={filter.value}
                        onChange={(values) => filterContext.updateFilter(filter.id, values)}
                        placeholder="Select options"
                        style={{ width: '100%' }}
                    >
                        <Option value="option1">Option 1</Option>
                        <Option value="option2">Option 2</Option>
                        <Option value="option3">Option 3</Option>
                    </Select>
                );
                
            default:
                return <Input value={filter.value} disabled />;
        }
    };

    return (
        <div className="cross-widget-filters">
            <Card
                title={
                    <Space>
                        <FilterOutlined />
                        <span>Cross-Widget Filters</span>
                        <Tag color="blue">{filterContext.filters.length} active</Tag>
                    </Space>
                }
                extra={
                    <Space>
                        <Button
                            size="small"
                            icon={<SyncOutlined />}
                            onClick={() => filterContext.clearAllFilters()}
                        >
                            Clear All
                        </Button>
                        <Button
                            size="small"
                            type="primary"
                            icon={<FilterOutlined />}
                            onClick={() => setShowAddFilter(true)}
                        >
                            Add Filter
                        </Button>
                    </Space>
                }
            >
                {/* Active Filters */}
                <Row gutter={[16, 16]}>
                    {filterContext.filters.map(filter => (
                        <Col xs={24} sm={12} md={8} lg={6} key={filter.id}>
                            <Card
                                size="small"
                                title={
                                    <Space>
                                        <Text strong>{filter.id}</Text>
                                        <Tag color="green">{filter.type}</Tag>
                                    </Space>
                                }
                                extra={
                                    <Button
                                        size="small"
                                        type="text"
                                        danger
                                        icon={<ClearOutlined />}
                                        onClick={() => filterContext.removeFilter(filter.id)}
                                    />
                                }
                            >
                                <Space direction="vertical" style={{ width: '100%' }}>
                                    {getFilterInput(filter)}
                                    <div style={{ fontSize: '12px', color: '#666' }}>
                                        Connected to {filter.widgetIds.length} widgets
                                    </div>
                                </Space>
                            </Card>
                        </Col>
                    ))}
                </Row>

                {filterContext.filters.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <FilterOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
                        <Title level={4} style={{ color: '#666' }}>
                            No Active Filters
                        </Title>
                        <Text type="secondary">
                            Add filters to enable cross-widget data filtering
                        </Text>
                    </div>
                )}

                {/* Add Filter Modal */}
                {showAddFilter && (
                    <Card
                        size="small"
                        title="Add New Filter"
                        style={{ marginTop: 16 }}
                        extra={
                            <Button
                                size="small"
                                onClick={() => setShowAddFilter(false)}
                            >
                                Cancel
                            </Button>
                        }
                    >
                        <Row gutter={[16, 16]}>
                            <Col span={12}>
                                <div>
                                    <Text>Filter ID:</Text>
                                    <Input
                                        value={newFilterId}
                                        onChange={(e) => setNewFilterId(e.target.value)}
                                        placeholder="e.g., date_range, category, status"
                                    />
                                </div>
                            </Col>
                            <Col span={12}>
                                <div>
                                    <Text>Filter Type:</Text>
                                    <Select
                                        value={newFilterType}
                                        onChange={setNewFilterType}
                                        style={{ width: '100%' }}
                                    >
                                        <Option value="string">Text</Option>
                                        <Option value="number">Number</Option>
                                        <Option value="date">Date</Option>
                                        <Option value="boolean">Boolean</Option>
                                        <Option value="array">Multiple Choice</Option>
                                    </Select>
                                </div>
                            </Col>
                        </Row>
                        
                        <div style={{ marginTop: 16 }}>
                            <Button
                                type="primary"
                                onClick={handleAddFilter}
                                disabled={!newFilterId.trim()}
                            >
                                Add Filter
                            </Button>
                        </div>
                    </Card>
                )}
            </Card>
        </div>
    );
};

export default CrossWidgetFilters;
