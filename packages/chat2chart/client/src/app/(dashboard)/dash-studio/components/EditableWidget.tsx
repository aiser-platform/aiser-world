'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Input, Typography } from 'antd';
import { EditOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

interface EditableWidgetProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  isDarkMode?: boolean;
  style?: React.CSSProperties;
}

const EditableWidget: React.FC<EditableWidgetProps> = ({
  value,
  onChange,
  placeholder = 'Click to edit',
  multiline = false,
  fontSize = 14,
  fontWeight = 'normal',
  color,
  isDarkMode = false,
  style = {}
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<any>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (multiline && inputRef.current.select) {
        inputRef.current.select();
      }
    }
  }, [isEditing, multiline]);

  const handleStartEdit = () => {
    setEditValue(value);
    setIsEditing(true);
  };

  const handleSave = () => {
    onChange(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Enter' && e.ctrlKey && multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const textStyle: React.CSSProperties = {
    fontSize,
    fontWeight,
    color: color || 'var(--color-text-primary)',
    cursor: 'pointer',
    minHeight: multiline ? '60px' : 'auto',
    padding: '4px 8px',
    borderRadius: '4px',
    border: '1px solid transparent',
    transition: 'all 0.2s ease',
    ...style
  };

  const editingStyle: React.CSSProperties = {
    ...textStyle,
    border: `1px solid var(--color-brand-primary)`,
    backgroundColor: 'var(--color-brand-primary-light)',
    cursor: 'text'
  };

  if (isEditing) {
    return (
      <div style={{ position: 'relative' }}>
        {multiline ? (
          <Input.TextArea
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            placeholder={placeholder}
            autoSize={{ minRows: 2, maxRows: 6 }}
            style={{
              ...editingStyle,
              resize: 'none',
              fontFamily: 'inherit'
            }}
          />
        ) : (
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            placeholder={placeholder}
            style={{
              ...editingStyle,
              fontFamily: 'inherit'
            }}
          />
        )}
        <div style={{
          position: 'absolute',
          top: '-30px',
          right: '0',
          display: 'flex',
          gap: '4px',
          background: 'var(--color-surface-base)',
          padding: '2px 4px',
          borderRadius: '4px',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--color-border-primary)'
        }}>
          <CheckOutlined 
            style={{ 
              color: 'var(--color-functional-success)', 
              cursor: 'pointer',
              fontSize: 'var(--font-size-sm)'
            }}
            onClick={handleSave}
          />
          <CloseOutlined 
            style={{ 
              color: 'var(--color-functional-danger)', 
              cursor: 'pointer',
              fontSize: 'var(--font-size-sm)'
            }}
            onClick={handleCancel}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      style={textStyle}
      onClick={handleStartEdit}
      title="Click to edit"
    >
      {value || placeholder}
      <EditOutlined 
        style={{ 
          marginLeft: '8px', 
          opacity: 0.5,
          fontSize: 'var(--font-size-sm)'
        }} 
      />
    </div>
  );
};

export default EditableWidget;
