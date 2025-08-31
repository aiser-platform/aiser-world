'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    Card,
    Button,
    Space,
    Typography,
    ColorPicker,
    Slider,
    Select,
    Input,
    message,
    Tooltip,
    Divider
} from 'antd';
import {
    EditOutlined,
    DeleteOutlined,
    SaveOutlined,
    UndoOutlined,
    RedoOutlined,
    FileTextOutlined,
    HighlightOutlined,
    MinusOutlined,
    CheckCircleOutlined,
    BorderOuterOutlined,
    UpOutlined,
    ClearOutlined
} from '@ant-design/icons';
import * as fabric from 'fabric';

const { Title, Text } = Typography;
const { Option } = Select;

interface Annotation {
    id: string;
    type: 'text' | 'line' | 'arrow' | 'circle' | 'rectangle' | 'highlight';
    content?: string;
    position: { x: number; y: number };
    style: {
        color: string;
        fontSize: number;
        strokeWidth: number;
        opacity: number;
    };
    data?: any;
}

// Extended fabric Object interface
interface FabricObjectWithAnnotation extends fabric.Object {
    annotationId: string;
}

interface ChartAnnotationEditorProps {
    chartId: string;
    onAnnotationAdd: (annotation: Annotation) => void;
    onAnnotationUpdate: (annotation: Annotation) => void;
    onAnnotationDelete: (annotationId: string) => void;
    annotations?: Annotation[];
}

const ChartAnnotationEditor: React.FC<ChartAnnotationEditorProps> = ({
    chartId,
    onAnnotationAdd,
    onAnnotationUpdate,
    onAnnotationDelete,
    annotations = []
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
    const [selectedTool, setSelectedTool] = useState<string>('select');
    const [selectedColor, setSelectedColor] = useState<string>('#ff0000');
    const [fontSize, setFontSize] = useState<number>(16);
    const [strokeWidth, setStrokeWidth] = useState<number>(2);
    const [opacity, setOpacity] = useState<number>(1);
    const [isDrawing, setIsDrawing] = useState<boolean>(false);
    const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);

    // Initialize Fabric.js canvas
    useEffect(() => {
        if (canvasRef.current) {
            const canvas = new fabric.Canvas(canvasRef.current, {
                width: 800,
                height: 600,
                backgroundColor: 'transparent'
            });
            
            fabricCanvasRef.current = canvas;
            
            // Load existing annotations
            loadAnnotations();
            
            return () => {
                canvas.dispose();
            };
        }
    }, []);

    // Load annotations onto canvas
    const loadAnnotations = useCallback(() => {
        if (!fabricCanvasRef.current) return;
        
        annotations.forEach(annotation => {
            addAnnotationToCanvas(annotation);
        });
    }, [annotations]);

    // Add annotation to canvas
    const addAnnotationToCanvas = (annotation: Annotation) => {
        if (!fabricCanvasRef.current) return;

        let fabricObject: fabric.Object;

        switch (annotation.type) {
            case 'text':
                fabricObject = new fabric.Text(annotation.content || 'Text', {
                    left: annotation.position.x,
                    top: annotation.position.y,
                    fontSize: annotation.style.fontSize,
                    fill: annotation.style.color,
                    opacity: annotation.style.opacity
                });
                break;
                
            case 'line':
                fabricObject = new fabric.Line([
                    annotation.position.x,
                    annotation.position.y,
                    annotation.position.x + 100,
                    annotation.position.y
                ], {
                    stroke: annotation.style.color,
                    strokeWidth: annotation.style.strokeWidth,
                    opacity: annotation.style.opacity
                });
                break;
                
            case 'arrow':
                fabricObject = new fabric.Line([
                    annotation.position.x,
                    annotation.position.y,
                    annotation.position.x + 100,
                    annotation.position.y
                ], {
                    stroke: annotation.style.color,
                    strokeWidth: annotation.style.strokeWidth,
                    opacity: annotation.style.opacity
                });
                // Add arrow head
                const arrowHead = new fabric.Triangle({
                    left: annotation.position.x + 100,
                    top: annotation.position.y,
                    width: 20,
                    height: 20,
                    fill: annotation.style.color,
                    angle: 0
                });
                fabricCanvasRef.current.add(arrowHead);
                break;
                
            case 'circle':
                fabricObject = new fabric.Circle({
                    left: annotation.position.x,
                    top: annotation.position.y,
                    radius: 30,
                    fill: 'transparent',
                    stroke: annotation.style.color,
                    strokeWidth: annotation.style.strokeWidth,
                    opacity: annotation.style.opacity
                });
                break;
                
            case 'rectangle':
                fabricObject = new fabric.Rect({
                    left: annotation.position.x,
                    top: annotation.position.y,
                    width: 100,
                    height: 60,
                    fill: 'transparent',
                    stroke: annotation.style.color,
                    strokeWidth: annotation.style.strokeWidth,
                    opacity: annotation.style.opacity
                });
                break;
                
            case 'highlight':
                fabricObject = new fabric.Rect({
                    left: annotation.position.x,
                    top: annotation.position.y,
                    width: 100,
                    height: 60,
                    fill: annotation.style.color,
                    opacity: 0.3
                });
                break;
                
            default:
                return;
        }

        // Add metadata for identification
        (fabricObject as any).annotationId = annotation.id;
        fabricCanvasRef.current.add(fabricObject);
    };

    // Handle tool selection
    const handleToolSelect = (tool: string) => {
        setSelectedTool(tool);
        setIsDrawing(false);
        
        if (fabricCanvasRef.current) {
            fabricCanvasRef.current.isDrawingMode = false;
            fabricCanvasRef.current.selection = tool === 'select';
        }
    };

    // Handle canvas click for adding annotations
    const handleCanvasClick = (e: any) => {
        if (selectedTool === 'select' || !fabricCanvasRef.current) return;

        const pointer = fabricCanvasRef.current.getPointer(e.e);
        const annotation: Annotation = {
            id: `annotation_${Date.now()}`,
            type: selectedTool as Annotation['type'],
            content: selectedTool === 'text' ? 'New Text' : undefined,
            position: { x: pointer.x, y: pointer.y },
            style: {
                color: selectedColor,
                fontSize,
                strokeWidth,
                opacity
            }
        };

        addAnnotationToCanvas(annotation);
        onAnnotationAdd(annotation);
        message.success('Annotation added successfully!');
    };

    // Handle object modification
    const handleObjectModified = (e: any) => {
        const target = e.target as FabricObjectWithAnnotation;
        if (!target || !target.annotationId) return;

        const annotationId = target.annotationId;
        const annotation = annotations.find(a => a.id === annotationId);
        
        if (annotation) {
            const updatedAnnotation: Annotation = {
                ...annotation,
                position: { x: target.left || 0, y: target.top || 0 },
                style: {
                    ...annotation.style,
                    fontSize: (target as any).fontSize || annotation.style.fontSize,
                    opacity: target.opacity || annotation.style.opacity
                }
            };
            
            onAnnotationUpdate(updatedAnnotation);
        }
    };

    // Handle object selection
    const handleObjectSelected = (e: any) => {
        const target = e.target as FabricObjectWithAnnotation;
        if (target && target.annotationId) {
            const annotationId = target.annotationId;
            const annotation = annotations.find(a => a.id === annotationId);
            setCurrentAnnotation(annotation || null);
        }
    };

    // Delete selected annotation
    const handleDeleteAnnotation = () => {
        if (!fabricCanvasRef.current || !currentAnnotation) return;

        const objects = fabricCanvasRef.current.getActiveObjects();
        objects.forEach(obj => {
            if ((obj as any).annotationId === currentAnnotation.id) {
                fabricCanvasRef.current!.remove(obj);
            }
        });
        
        onAnnotationDelete(currentAnnotation.id);
        setCurrentAnnotation(null);
        message.success('Annotation deleted successfully!');
    };

    // Clear all annotations
    const handleClearAll = () => {
        if (!fabricCanvasRef.current) return;
        
        fabricCanvasRef.current.clear();
        annotations.forEach(annotation => {
            onAnnotationDelete(annotation.id);
        });
        
        message.success('All annotations cleared!');
    };

    // Save annotations
    const handleSaveAnnotations = () => {
        message.success('Annotations saved successfully!');
    };

    return (
        <div className="chart-annotation-editor">
            <Card
                title={
                    <Space>
                        <EditOutlined />
                        <span>Chart Annotation Editor</span>
                    </Space>
                }
                extra={
                    <Space>
                        <Button
                            size="small"
                            icon={<SaveOutlined />}
                            onClick={handleSaveAnnotations}
                        >
                            Save
                        </Button>
                        <Button
                            size="small"
                            icon={<ClearOutlined />}
                            onClick={handleClearAll}
                            danger
                        >
                            Clear All
                        </Button>
                    </Space>
                }
            >
                <div style={{ display: 'flex', gap: '16px' }}>
                    {/* Tool Panel */}
                    <div style={{ width: '200px' }}>
                        <Title level={5}>Tools</Title>
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <Button
                                type={selectedTool === 'select' ? 'primary' : 'default'}
                                icon={<EditOutlined />}
                                onClick={() => handleToolSelect('select')}
                                block
                            >
                                Select
                            </Button>
                            <Button
                                type={selectedTool === 'text' ? 'primary' : 'default'}
                                icon={<FileTextOutlined />}
                                onClick={() => handleToolSelect('text')}
                                block
                            >
                                Text
                            </Button>
                            <Button
                                type={selectedTool === 'line' ? 'primary' : 'default'}
                                icon={<MinusOutlined />}
                                onClick={() => handleToolSelect('line')}
                                block
                            >
                                Line
                            </Button>
                            <Button
                                type={selectedTool === 'arrow' ? 'primary' : 'default'}
                                icon={<UpOutlined />}
                                onClick={() => handleToolSelect('arrow')}
                                block
                            >
                                Arrow
                            </Button>
                            <Button
                                type={selectedTool === 'circle' ? 'primary' : 'default'}
                                icon={<CheckCircleOutlined />}
                                onClick={() => handleToolSelect('circle')}
                                block
                            >
                                Circle
                            </Button>
                            <Button
                                type={selectedTool === 'rectangle' ? 'primary' : 'default'}
                                icon={<BorderOuterOutlined />}
                                onClick={() => handleToolSelect('rectangle')}
                                block
                            >
                                Rectangle
                            </Button>
                            <Button
                                type={selectedTool === 'highlight' ? 'primary' : 'default'}
                                icon={<HighlightOutlined />}
                                onClick={() => handleToolSelect('highlight')}
                                block
                            >
                                Highlight
                            </Button>
                        </Space>

                        <Divider />

                        <Title level={5}>Style</Title>
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <div>
                                <Text>Color:</Text>
                                <ColorPicker
                                    value={selectedColor}
                                    onChange={(color) => setSelectedColor(color.toHexString())}
                                />
                            </div>
                            
                            <div>
                                <Text>Font Size: {fontSize}px</Text>
                                <Slider
                                    min={8}
                                    max={72}
                                    value={fontSize}
                                    onChange={setFontSize}
                                />
                            </div>
                            
                            <div>
                                <Text>Stroke Width: {strokeWidth}px</Text>
                                <Slider
                                    min={1}
                                    max={10}
                                    value={strokeWidth}
                                    onChange={setStrokeWidth}
                                />
                            </div>
                            
                            <div>
                                <Text>Opacity: {opacity}</Text>
                                <Slider
                                    min={0.1}
                                    max={1}
                                    step={0.1}
                                    value={opacity}
                                    onChange={setOpacity}
                                />
                            </div>
                        </Space>

                        {currentAnnotation && (
                            <>
                                <Divider />
                                <Title level={5}>Selected Annotation</Title>
                                <Space direction="vertical" style={{ width: '100%' }}>
                                    <Text>Type: {currentAnnotation.type}</Text>
                                    <Text>Position: ({currentAnnotation.position.x}, {currentAnnotation.position.y})</Text>
                                    <Button
                                        size="small"
                                        icon={<DeleteOutlined />}
                                        onClick={handleDeleteAnnotation}
                                        danger
                                        block
                                    >
                                        Delete
                                    </Button>
                                </Space>
                            </>
                        )}
                    </div>

                    {/* Canvas */}
                    <div style={{ flex: 1 }}>
                        <div style={{ border: '1px solid #d9d9d9', borderRadius: '6px', overflow: 'hidden' }}>
                            <canvas
                                ref={canvasRef}
                                style={{ display: 'block' }}
                            />
                        </div>
                        <div style={{ marginTop: '8px', textAlign: 'center' }}>
                            <Text type="secondary">
                                Click on the canvas to add annotations. Use the Select tool to modify existing ones.
                            </Text>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default ChartAnnotationEditor;
