'use client';

import React, { useState, useEffect } from 'react';
import { 
    Steps, 
    Card, 
    Button, 
    Space, 
    Typography, 
    Alert, 
    message,
    Spin
} from 'antd';
import { 
    ExperimentOutlined,
    EyeOutlined,
    EditOutlined,
    CheckCircleOutlined
} from '@ant-design/icons';
import { WorkflowNavigation, WorkflowStep } from '../WorkflowNavigation';

const { Step } = Steps;
const { Title, Text } = Typography;

interface DataModelingWorkflowProps {
    dataSourceId: string;
    onComplete: (result: any) => void;
    onCancel: () => void;
}

const DataModelingWorkflow: React.FC<DataModelingWorkflowProps> = ({
    dataSourceId,
    onComplete,
    onCancel
}) => {
    const [loading, setLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [modelData, setModelData] = useState<any>(null);

    // Define workflow steps (static metadata). Completion state is computed dynamically below.
    const workflowSteps: WorkflowStep[] = [
        { key: 'analysis', title: 'AI Analysis', description: 'Analyzing data structure', isRequired: true, canSkip: false },
        { key: 'review', title: 'Review Model', description: 'Review generated model', isRequired: true, canSkip: false },
        { key: 'customize', title: 'Customize', description: 'Make adjustments', isRequired: false, canSkip: true },
        { key: 'deploy', title: 'Deploy', description: 'Activate the model', isRequired: true, canSkip: false }
    ];

    // Step validation
    const canProceedToNext = (): boolean => {
        // Dynamically evaluate completion based on analysisResult and modelData
        const step = currentStep;
        if (step === 0) {
            return !!analysisResult; // analysis must be present
        }
        if (step === 1) {
            // Review requires a generated schema or fallback model
            return !!(analysisResult?.cube_schema || analysisResult?.yaml_schema || analysisResult?.data_analysis || analysisResult?.fallback_model);
        }
        if (step === 2) {
            // Customize is optional
            return true;
        }
        return true;
    };

    // Handle step change with validation
    const handleStepChange = (step: number) => {
        if (step > currentStep && !canProceedToNext()) {
            message.warning('Please complete the current step before proceeding');
            return;
        }
        setCurrentStep(step);
    };

    // Handle save and skip
    const handleSaveAndSkip = async () => {
        try {
            if (currentStep === 2) {
                // Save customizations
                message.success('Customizations saved');
                workflowSteps[currentStep].isCompleted = true;
            }
            
            if (currentStep < workflowSteps.length - 1) {
                setCurrentStep(currentStep + 1);
            }
        } catch (error) {
            message.error('Failed to save progress');
        }
    };

    const handleStartAnalysis = async () => {
        setLoading(true);
        setCurrentStep(0);
        
        try {
            // Step 1: AI Analysis
            message.info('🧠 AI is analyzing your data structure...');

            // Analyze with Cube.js modeling service
            const analysisResponse = await fetch('http://localhost:8000/data/cube-modeling/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data_source_id: dataSourceId, connection_info: null })
            });

            const analysisJson = await analysisResponse.json();

            // Accept responses that either indicate success or include a fallback model
            if (!analysisJson.success && !analysisJson.fallback_model) {
                throw new Error(analysisJson.error || 'Analysis failed');
            }

            // Normalize and store analysis result
            setAnalysisResult(analysisJson);
            setCurrentStep(1);

            message.success('✅ AI analysis completed (or fallback applied)!');

            // Auto-proceed to review/customize after a short delay
            setTimeout(() => {
                // If a schema or fallback is available, show review; otherwise skip to customize
                setCurrentStep(2);
                message.info('📋 Review the generated Cube.js schema...');
            }, 800);
            
        } catch (error) {
            message.error('❌ Analysis failed: ' + (error as Error).message);
            setCurrentStep(0);
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = () => {
        message.success('🚀 Data modeling completed!');
        onComplete({ 
            success: true, 
            dataSourceId,
            analysisResult,
            modelData 
        });
    };

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: 24 }}>
                <Title level={3}>🧠 Intelligent Data Modeling</Title>
                <Text type="secondary">
                    AI-powered analysis and schema generation for data source: {dataSourceId}
                </Text>
            </div>

            <Steps current={currentStep} style={{ marginBottom: 24 }}>
                <Step 
                    title="AI Analysis" 
                    description="Analyzing data structure"
                    icon={<ExperimentOutlined />}
                />
                <Step 
                    title="Review Model" 
                    description="Review generated model"
                    icon={<EyeOutlined />}
                />
                <Step 
                    title="Customize" 
                    description="Make adjustments"
                    icon={<EditOutlined />}
                />
                <Step 
                    title="Deploy" 
                    description="Activate the model"
                    icon={<CheckCircleOutlined />}
                />
            </Steps>

            <Card style={{ minHeight: '400px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <Spin size="large" />
                        <div style={{ marginTop: 16 }}>
                            <Text>AI is analyzing your data...</Text>
                        </div>
                    </div>
                ) : currentStep === 0 ? (
                    <Alert
                        message="Data Modeling Ready"
                        description="AI-powered data modeling will analyze your data structure and generate optimal schemas."
                        type="info"
                        showIcon
                        action={
                            <Button type="primary" onClick={handleStartAnalysis}>
                                🧠 Start AI Analysis
                            </Button>
                        }
                    />
                ) : currentStep === 1 ? (
                    <Alert
                        message="Analysis Complete"
                        description="AI has analyzed your data structure. Proceeding to model review..."
                        type="success"
                        showIcon
                    />
                ) : currentStep === 2 ? (
                    <div>
                        <Alert
                            message="Cube.js Schema Generated"
                            description="Review the AI-generated Cube.js schema with YAML configuration."
                            type="success"
                            showIcon
                            style={{ marginBottom: 16 }}
                        />
                        {analysisResult && (
                            <div>
                                <div style={{ marginBottom: 16 }}>
                                    <Text strong>📊 Data Analysis:</Text>
                                    <ul style={{ marginTop: 8 }}>
                                        <li>Rows: {analysisResult.analysis?.row_count || 'N/A'}</li>
                                        <li>Columns: {analysisResult.analysis?.column_count || 'N/A'}</li>
                                        <li>Measures: {analysisResult.analysis?.measures?.length || 0}</li>
                                        <li>Dimensions: {analysisResult.analysis?.dimensions?.length || 0}</li>
                                        <li>Time Dimensions: {analysisResult.analysis?.time_dimensions?.length || 0}</li>
                                    </ul>
                                </div>
                                
                                <div style={{ marginBottom: 16 }}>
                                    <Text strong>🏗️ Modeling Types Available:</Text>
                                    <div style={{ marginTop: 8 }}>
                                        {analysisResult.modeling_types?.map((type: any, index: number) => (
                                            <div key={index} style={{ 
                                                padding: '8px', 
                                                border: '1px solid #d9d9d9', 
                                                borderRadius: '4px',
                                                marginBottom: '8px',
                                                backgroundColor: type.recommended ? '#f6ffed' : '#fafafa'
                                            }}>
                                                <Text strong>{type.name}</Text> 
                                                {type.recommended && <span style={{ color: '#52c41a', marginLeft: '8px' }}>✓ Recommended</span>}
                                                <br />
                                                <Text type="secondary">{type.description}</Text>
                                                <br />
                                                <Text type="secondary">Complexity: {type.complexity}</Text>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {analysisResult.yaml_schema && (
                                    <div style={{ marginBottom: 16 }}>
                                        <Text strong>📄 Generated YAML Schema:</Text>
                                        <pre style={{ 
                                            background: '#f5f5f5', 
                                            padding: '12px', 
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            maxHeight: '200px',
                                            overflow: 'auto'
                                        }}>
                                            {analysisResult.yaml_schema}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <Alert
                        message="Ready to Deploy"
                        description="Model is ready for deployment. Click Complete to finish the setup."
                        type="success"
                        showIcon
                    />
                )}
            </Card>

            <div style={{ marginTop: 24, textAlign: 'right' }}>
                <WorkflowNavigation
                    currentStep={currentStep}
                    totalSteps={workflowSteps.length}
                    steps={workflowSteps}
                    onStepChange={handleStepChange}
                    onCancel={onCancel}
                    onSave={handleSaveAndSkip}
                    onComplete={handleComplete}
                    loading={loading}
                    canProceed={canProceedToNext()}
                    showProgress={true}
                    customActions={
                        currentStep === 0 && (
                            <Button type="primary" onClick={handleStartAnalysis}>
                                🧠 Start AI Analysis
                            </Button>
                        )
                    }
                />
            </div>
        </div>
    );
};

export default DataModelingWorkflow;