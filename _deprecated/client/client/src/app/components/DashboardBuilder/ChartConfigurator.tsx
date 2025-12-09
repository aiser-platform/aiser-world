'use client';

import React from 'react';
import { Form, Select, Input, Switch, Space, Typography } from 'antd';
import { IChart } from './DashboardBuilder';

const { Option } = Select;
const { Text } = Typography;

export interface ChartConfiguratorProps {
    chart: IChart;
    onConfigChange: (config: any) => void;
}

const ChartConfigurator: React.FC<ChartConfiguratorProps> = ({
    chart,
    onConfigChange
}) => {
    const [form] = Form.useForm();

    const handleConfigChange = (changedValues: any) => {
        const newConfig = { ...chart.config, ...changedValues };
        onConfigChange(newConfig);
    };

    return (
        <Form
            form={form}
            layout="vertical"
            onValuesChange={handleConfigChange}
            initialValues={chart.config}
        >
            <Form.Item label="Chart Type" name="type">
                <Select>
                    <Option value="bar">Bar Chart</Option>
                    <Option value="line">Line Chart</Option>
                    <Option value="pie">Pie Chart</Option>
                    <Option value="scatter">Scatter Plot</Option>
                    <Option value="area">Area Chart</Option>
                    <Option value="table">Data Table</Option>
                </Select>
            </Form.Item>

            <Form.Item label="X-Axis Field" name="xAxis">
                <Input placeholder="Enter X-axis field name" />
            </Form.Item>

            <Form.Item label="Y-Axis Field" name="yAxis">
                <Input placeholder="Enter Y-axis field name" />
            </Form.Item>

            <Form.Item label="Aggregation" name="aggregation">
                <Select placeholder="Select aggregation method">
                    <Option value="sum">Sum</Option>
                    <Option value="avg">Average</Option>
                    <Option value="count">Count</Option>
                    <Option value="min">Minimum</Option>
                    <Option value="max">Maximum</Option>
                </Select>
            </Form.Item>

            <Form.Item label="Enable Smooth Lines" name="smooth" valuePropName="checked">
                <Switch />
            </Form.Item>

            <Form.Item label="Show Grid" name="showGrid" valuePropName="checked">
                <Switch defaultChecked />
            </Form.Item>

            <Form.Item label="Enable Zoom" name="enableZoom" valuePropName="checked">
                <Switch />
            </Form.Item>
        </Form>
    );
};

export default ChartConfigurator;
