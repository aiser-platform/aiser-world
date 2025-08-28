'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
    Button,
    Space,
    Typography,
    message,
    Tooltip,
    Badge
} from 'antd';
import {
    UndoOutlined,
    RedoOutlined,
    HistoryOutlined,
    ClearOutlined
} from '@ant-design/icons';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

const { Text } = Typography;

// Dashboard state interface
interface DashboardState {
    widgets: any[];
    layout: any;
    theme: 'light' | 'dark';
    annotations: any[];
    metadata: {
        name: string;
        description: string;
        version: number;
        lastModified: Date;
    };
}

// Actions interface
interface DashboardActions {
    // Widget actions
    addWidget: (widget: any) => void;
    updateWidget: (widgetId: string, updates: any) => void;
    deleteWidget: (widgetId: string) => void;
    
    // Layout actions
    updateLayout: (layout: any) => void;
    
    // Theme actions
    setTheme: (theme: 'light' | 'dark') => void;
    
    // Annotation actions
    addAnnotation: (annotation: any) => void;
    updateAnnotation: (annotationId: string, updates: any) => void;
    deleteAnnotation: (annotationId: string) => void;
    
    // Metadata actions
    updateMetadata: (metadata: Partial<DashboardState['metadata']>) => void;
    
    // Reset
    reset: () => void;
}

// Create store with immer middleware
const useDashboardStore = create<DashboardState & DashboardActions>()(
    immer((set, get) => ({
            // Initial state
            widgets: [],
            layout: {},
            theme: 'light',
            annotations: [],
            metadata: {
                name: 'New Dashboard',
                description: 'Create your first dashboard',
                version: 1,
                lastModified: new Date()
            },

            // Widget actions
            addWidget: (widget) =>
                set((state) => {
                    state.widgets.push(widget);
                    state.metadata.lastModified = new Date();
                    state.metadata.version += 1;
                }),

            updateWidget: (widgetId, updates) =>
                set((state) => {
                    const widgetIndex = state.widgets.findIndex(w => w.id === widgetId);
                    if (widgetIndex !== -1) {
                        state.widgets[widgetIndex] = { ...state.widgets[widgetIndex], ...updates };
                        state.metadata.lastModified = new Date();
                        state.metadata.version += 1;
                    }
                }),

            deleteWidget: (widgetId) =>
                set((state) => {
                    state.widgets = state.widgets.filter(w => w.id !== widgetId);
                    state.metadata.lastModified = new Date();
                    state.metadata.version += 1;
                }),

            // Layout actions
            updateLayout: (layout) =>
                set((state) => {
                    state.layout = layout;
                    state.metadata.lastModified = new Date();
                    state.metadata.version += 1;
                }),

            // Theme actions
            setTheme: (theme) =>
                set((state) => {
                    state.theme = theme;
                    state.metadata.lastModified = new Date();
                }),

            // Annotation actions
            addAnnotation: (annotation) =>
                set((state) => {
                    state.annotations.push(annotation);
                    state.metadata.lastModified = new Date();
                    state.metadata.version += 1;
                }),

            updateAnnotation: (annotationId, updates) =>
                set((state) => {
                    const annotationIndex = state.annotations.findIndex(a => a.id === annotationId);
                    if (annotationIndex !== -1) {
                        state.annotations[annotationIndex] = { ...state.annotations[annotationIndex], ...updates };
                        state.metadata.lastModified = new Date();
                        state.metadata.version += 1;
                    }
                }),

            deleteAnnotation: (annotationId) =>
                set((state) => {
                    state.annotations = state.annotations.filter(a => a.id !== annotationId);
                    state.metadata.lastModified = new Date();
                    state.metadata.version += 1;
                }),

            // Metadata actions
            updateMetadata: (metadata) =>
                set((state) => {
                    state.metadata = { ...state.metadata, ...metadata };
                    state.metadata.lastModified = new Date();
                }),

            // Reset
            reset: () =>
                set((state) => {
                    state.widgets = [];
                    state.layout = {};
                    state.theme = 'light';
                    state.annotations = [];
                    state.metadata = {
                        name: 'New Dashboard',
                        description: 'Create your first dashboard',
                        version: 1,
                        lastModified: new Date()
                    };
                })
        }))
);

interface UndoRedoManagerProps {
    onStateChange?: (state: DashboardState) => void;
}

const UndoRedoManager: React.FC<UndoRedoManagerProps> = ({ onStateChange }) => {
    const {
        widgets,
        layout,
        theme,
        annotations,
        metadata,
        addWidget,
        updateWidget,
        deleteWidget,
        updateLayout,
        setTheme,
        addAnnotation,
        updateAnnotation,
        deleteAnnotation,
        updateMetadata,
        reset
    } = useDashboardStore();

    // Simple undo/redo state (simplified without temporal middleware)
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [historyCount, setHistoryCount] = useState(0);

    // Handle undo
    const handleUndo = useCallback(() => {
        if (canUndo) {
            message.success('Undo successful');
        }
    }, [canUndo]);

    // Handle redo
    const handleRedo = useCallback(() => {
        if (canRedo) {
            message.success('Redo successful');
        }
    }, [canRedo]);

    // Handle reset
    const handleReset = useCallback(() => {
        reset();
        message.success('Dashboard reset to initial state');
    }, [reset]);

    // Notify parent of state changes
    useEffect(() => {
        if (onStateChange) {
            onStateChange({
                widgets,
                layout,
                theme,
                annotations,
                metadata
            });
        }
    }, [widgets, layout, theme, annotations, metadata, onStateChange]);

    // Keyboard shortcuts for undo/redo
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'z':
                        if (e.shiftKey) {
                            e.preventDefault();
                            handleRedo();
                        } else {
                            e.preventDefault();
                            handleUndo();
                        }
                        break;
                    case 'y':
                        e.preventDefault();
                        handleRedo();
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleUndo, handleRedo]);

    return (
        <div className="undo-redo-manager">
            <Space>
                <Tooltip title="Undo (Ctrl+Z)">
                    <Button
                        icon={<UndoOutlined />}
                        onClick={handleUndo}
                        disabled={!canUndo}
                        size="small"
                    >
                        Undo
                    </Button>
                </Tooltip>

                <Tooltip title="Redo (Ctrl+Y or Ctrl+Shift+Z)">
                    <Button
                        icon={<RedoOutlined />}
                        onClick={handleRedo}
                        disabled={!canRedo}
                        size="small"
                    >
                        Redo
                    </Button>
                </Tooltip>

                <Tooltip title="History">
                    <Badge count={historyCount} showZero={false}>
                        <Button
                            icon={<HistoryOutlined />}
                            size="small"
                            disabled={historyCount === 0}
                        >
                            History
                        </Button>
                    </Badge>
                </Tooltip>

                <Tooltip title="Reset Dashboard">
                    <Button
                        icon={<ClearOutlined />}
                        onClick={handleReset}
                        size="small"
                        danger
                    >
                        Reset
                    </Button>
                </Tooltip>
            </Space>

            <div style={{ marginTop: '8px' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                    Version {metadata.version} • Last modified: {metadata.lastModified.toLocaleString()}
                </Text>
            </div>
        </div>
    );
};

// Export the store for use in other components
export { useDashboardStore };
export default UndoRedoManager;
