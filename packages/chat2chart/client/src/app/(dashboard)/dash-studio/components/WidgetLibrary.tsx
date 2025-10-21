'use client';

import React, { useState } from 'react';
import { Card, Input, Tabs, Button, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { widgetConfigManager } from '../config/WidgetConfigManager';

interface WidgetLibraryProps {
  onAddWidget: (type: string) => void;
  onClose?: () => void;
}

// SINGLE SOURCE OF TRUTH: Widget Library
export const WidgetLibrary: React.FC<WidgetLibraryProps> = ({
  onAddWidget,
  onClose
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('chart');
  
  // Get all widget types
  const allWidgetTypes = widgetConfigManager.getAllWidgetTypes();
  
  // Filter widgets based on search query
  const filteredWidgets = allWidgetTypes.filter(widget => {
    const matchesSearch = widget.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         widget.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = widget.category === activeCategory;
    return matchesSearch && matchesCategory;
  });
  
  // Get categories
  const categories = Array.from(new Set(allWidgetTypes.map(widget => widget.category)));
  
  const handleWidgetClick = (widgetType: string) => {
    onAddWidget(widgetType);
  };
  
  return (
    <div style={{
      width: '300px',
      height: '100%',
      backgroundColor: '#fff',
      borderLeft: '1px solid #d9d9d9',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #d9d9d9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
          Widget Library
        </div>
        {onClose && (
          <Button
            type="text"
            onClick={onClose}
            style={{ padding: '4px' }}
          >
            ×
          </Button>
        )}
      </div>
      
      {/* Search */}
      <div style={{ padding: '16px', borderBottom: '1px solid #d9d9d9' }}>
        <Input
          placeholder="Search widgets..."
          prefix={<SearchOutlined />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%' }}
        />
      </div>
      
      {/* Categories */}
      <div style={{ padding: '16px', borderBottom: '1px solid #d9d9d9' }}>
        <Tabs
          activeKey={activeCategory}
          onChange={setActiveCategory}
          items={categories.map(category => ({
            key: category,
            label: category.charAt(0).toUpperCase() + category.slice(1),
            children: null
          }))}
          size="small"
        />
      </div>
      
      {/* Widget Grid */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '16px'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px'
        }}>
          {filteredWidgets.map(widget => (
            <Card
              key={widget.id}
              hoverable
              size="small"
              onClick={() => handleWidgetClick(widget.id)}
              style={{
                cursor: 'pointer',
                textAlign: 'center',
                minHeight: '80px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              bodyStyle={{
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%'
              }}
            >
              <div style={{
                fontSize: '24px',
                marginBottom: '8px',
                color: '#1890ff'
              }}>
                {/* Icon placeholder - you can replace with actual icons */}
                {widget.category === 'chart' ? '📊' : 
                 widget.category === 'metric' ? '📈' :
                 widget.category === 'table' ? '📋' :
                 widget.category === 'text' ? '📝' :
                 widget.category === 'image' ? '🖼️' :
                 widget.category === 'filter' ? '🔍' : '📦'}
              </div>
              <div style={{
                fontSize: '12px',
                fontWeight: 'bold',
                marginBottom: '4px',
                textAlign: 'center'
              }}>
                {widget.name}
              </div>
              <div style={{
                fontSize: '10px',
                color: '#666',
                textAlign: 'center',
                lineHeight: '1.2'
              }}>
                {widget.description}
              </div>
            </Card>
          ))}
        </div>
        
        {filteredWidgets.length === 0 && (
          <div style={{
            textAlign: 'center',
            color: '#666',
            padding: '32px 16px'
          }}>
            <div style={{ fontSize: '16px', marginBottom: '8px' }}>
              No widgets found
            </div>
            <div style={{ fontSize: '12px' }}>
              Try adjusting your search or category filter
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid #d9d9d9',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{
          fontSize: '12px',
          color: '#666',
          textAlign: 'center'
        }}>
          Drag widgets to the canvas to add them
        </div>
      </div>
    </div>
  );
};

export default WidgetLibrary;
