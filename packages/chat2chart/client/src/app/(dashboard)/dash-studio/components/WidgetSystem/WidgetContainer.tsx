'use client';

import React, { useRef } from 'react';

interface WidgetContainerProps {
  id: string;
  widget?: any;
  isSelected?: boolean;
  className?: string;
  style?: React.CSSProperties;
  tabIndex?: number;
  role?: string;
  onSelect?: (id: string, opts?: { toggle?: boolean }) => void;
  onWidgetClick?: (widget: any) => void;
  children?: React.ReactNode;
}

const WidgetContainer: React.FC<WidgetContainerProps> = ({
  id,
  widget,
  isSelected = false,
  className,
  style,
  tabIndex = 0,
  role,
  onSelect,
  onWidgetClick,
  children
}) => {
  const dragStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  
  const handleClick = (e: React.MouseEvent) => {
    try {
      // ignore double-clicks (handled by children) and inline-edit pending mousedown
      if ((e as any).detail === 2) return;
      const pending = (window as any).__widgetInlineEditingPending;
      if (pending && pending.id === id) return;
      
      // Check if this was a drag operation (mouse moved more than 5px)
      if (dragStartRef.current) {
        const deltaX = Math.abs(e.clientX - dragStartRef.current.x);
        const deltaY = Math.abs(e.clientY - dragStartRef.current.y);
        const deltaTime = Date.now() - dragStartRef.current.time;
        
        if (deltaX > 5 || deltaY > 5 || deltaTime > 200) {
          // This was a drag, not a click
          dragStartRef.current = null;
          return;
        }
      }
    } catch (err) {}

    onSelect?.(id);
    if (onWidgetClick) onWidgetClick(widget);
  };

const handleMouseDown = (e: React.MouseEvent) => {
  try {
    // Track drag start position and time
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now()
    };
    
    // Only prevent drag if we're actually in an inline editing context
    // Don't interfere with normal drag operations
    const pending = (window as any).__widgetInlineEditingPending;
    const active = (window as any).__widgetInlineEditing;
    
    // Check if the target is an input, textarea, or contenteditable element
    const target = e.target as HTMLElement;
    const isEditableElement = target.tagName === 'INPUT' || 
                             target.tagName === 'TEXTAREA' || 
                             target.contentEditable === 'true' ||
                             target.closest('[contenteditable="true"]');
    
    if (isEditableElement && ((pending && pending.id === id) || (active && active.id === id))) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    
    // Allow normal drag operations to proceed
  } catch (err) {}
};

  return (
    <div
      className={["dashboard-widget", isSelected ? 'dashboard-widget--selected' : '', className || ''].filter(Boolean).join(' ')}
      data-grid-id={id}
      role={role || 'region'}
      tabIndex={tabIndex}
      aria-label={widget?.name || `widget-${id}`}
      style={{ position: 'relative', overflow: 'visible', ...(style || {}) }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
    >
      {children}
    </div>
  );
};

export default WidgetContainer;


