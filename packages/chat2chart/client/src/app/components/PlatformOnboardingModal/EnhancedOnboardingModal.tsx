'use client';

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Steps,
  Button,
  Typography,
  Space,
  Card,
  Row,
  Col,
  message,
  Progress,
  Avatar,
  Divider,
  Tag,
  List,
  Tooltip,
  Form,
  Input,
  Select,
  Radio,
  Alert,
  Collapse,
  Checkbox,
  Switch,
} from 'antd';
import {
  RocketOutlined,
  DatabaseOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
  BulbOutlined,
  DollarOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { useOnboarding } from '@/context/OnboardingContext';
import { useAuth } from '@/context/AuthContext';
import PricingModal from '@/components/PricingModal';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

/**
 * Enhanced Onboarding Modal with Frictionless Features:
 * - Smart pre-filling
 * - Minimal vs full flow
 * - Progress persistence
 * - Contextual help
 * - Plan selection
 */
const EnhancedOnboardingModal: React.FC = () => {
  const { 
    isOnboardingActive, 
    currentStep, 
    totalSteps, 
    onboardingData,
    nextStep, 
    prevStep, 
    completeOnboarding, 
    skipOnboarding,
    updateOnboardingData,
    markStepCompleted
  } = useOnboarding();
  
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [onboardingFlow, setOnboardingFlow] = useState<any>(null);
  const [contextualHelp, setContextualHelp] = useState<any>(null);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('free');
  const [showContextualHelp, setShowContextualHelp] = useState<Record<string, boolean>>({});
  const [enableTeamTrial, setEnableTeamTrial] = useState(true);
  
  // Fetch optimized onboarding flow on mount
  useEffect(() => {
    if (isOnboardingActive && user) {
      fetch('/api/onboarding/flow', {
        credentials: 'include',
      })
        .then(res => res.json())
        .then(data => {
          setOnboardingFlow(data);
          // Pre-fill form if minimal flow
          if (data.minimal && data.prefill) {
            form.setFieldsValue(data.prefill);
            updateOnboardingData(data.prefill);
          }
        })
        .catch(err => console.error('Failed to fetch onboarding flow:', err));
    }
  }, [isOnboardingActive, user]);
  
  // Fetch contextual help for current step
  useEffect(() => {
    if (isOnboardingActive && currentStep >= 0) {
      const stepKey = getSteps()[currentStep]?.key;
      if (stepKey) {
        fetch(`/api/onboarding/help/${stepKey}`, {
          credentials: 'include',
        })
          .then(res => {
            if (!res.ok) {
              // If 404 or other error, use default help content
              console.warn(`Help endpoint returned ${res.status} for step ${stepKey}`);
              return null;
            }
            return res.json();
          })
          .then(data => {
            if (data) {
              setContextualHelp(data);
            }
          })
          .catch(err => {
            // Non-fatal error - just log it
            console.warn('Failed to fetch help (non-fatal):', err);
          });
      }
    }
  }, [isOnboardingActive, currentStep]);
  
  // Save progress on each step
  const handleStepProgress = async (stepKey: string, stepData: any) => {
    try {
      await fetch('/api/onboarding/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          step: stepKey,
          data: stepData,
        }),
      });
      markStepCompleted(stepKey);
    } catch (error) {
      console.error('Failed to save progress:', error);
      // Non-fatal - continue anyway
    }
  };
  
  // Get steps based on flow optimization
  const getSteps = () => {
    const isMinimalFlow = onboardingFlow?.minimal === true;
    const skipSteps = onboardingFlow?.skip_steps || [];
    
    const allSteps = [
      {
        key: 'welcome',
        title: 'Welcome',
        description: 'Tell us about yourself',
        icon: <RocketOutlined />,
        content: (
          <div style={{ padding: '16px', maxHeight: '500px', overflowY: 'auto' }}>
            {contextualHelp && showContextualHelp['welcome'] !== false && (
              <Alert
                message={contextualHelp.title}
                description={contextualHelp.content}
                type="info"
                icon={<BulbOutlined />}
                showIcon
                closable
                onClose={() => setShowContextualHelp({ ...showContextualHelp, 'welcome': false })}
                style={{ marginBottom: '16px' }}
              />
            )}
            
            <Form
              form={form}
              layout="vertical"
              preserve={false}
              initialValues={{
                firstName: user?.email?.split('@')[0] || '',
                organization: onboardingFlow?.prefill?.company || '',
              }}
              onFinish={(values) => {
                // Map organization field to company for backend compatibility
                const personalData = {
                  ...values,
                  company: values.organization || values.company || '',
                };
                updateOnboardingData({ personal: personalData });
                handleStepProgress('welcome', personalData);
                nextStep();
              }}
            >
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Form.Item
                    name="firstName"
                    label="First Name"
                    rules={[{ required: true, message: 'Please enter your first name' }]}
                  >
                    <Input placeholder="First name" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="lastName"
                    label="Last Name"
                  >
                    <Input placeholder="Last name (optional)" />
                  </Form.Item>
                </Col>
                {!isMinimalFlow && (
                  <>
                    <Col span={12}>
                      <Form.Item
                        name="organization"
                        label="Company/Organization"
                      >
                        <Input placeholder="Your company name" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="role"
                        label="Your Role"
                      >
                        <Select placeholder="Select your role">
                          <Select.Option value="data_analyst">Data Analyst</Select.Option>
                          <Select.Option value="business_owner">Business Owner</Select.Option>
                          <Select.Option value="developer">Developer</Select.Option>
                          <Select.Option value="manager">Manager</Select.Option>
                          <Select.Option value="other">Other</Select.Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </>
                )}
              </Row>
              
              {!isMinimalFlow && (
                <>
                  <Form.Item
                    name="industry"
                    label="Industry"
                  >
                    <Select placeholder="Select your industry">
                      <Select.Option value="technology">Technology</Select.Option>
                      <Select.Option value="finance">Finance & Banking</Select.Option>
                      <Select.Option value="healthcare">Healthcare</Select.Option>
                      <Select.Option value="retail">Retail & E-commerce</Select.Option>
                      <Select.Option value="manufacturing">Manufacturing</Select.Option>
                      <Select.Option value="education">Education</Select.Option>
                      <Select.Option value="government">Government</Select.Option>
                      <Select.Option value="nonprofit">Non-profit</Select.Option>
                      <Select.Option value="consulting">Consulting</Select.Option>
                      <Select.Option value="media">Media & Entertainment</Select.Option>
                      <Select.Option value="real_estate">Real Estate</Select.Option>
                      <Select.Option value="logistics">Logistics & Transportation</Select.Option>
                      <Select.Option value="energy">Energy & Utilities</Select.Option>
                      <Select.Option value="other">Other</Select.Option>
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="companySize"
                    label="Company Size"
                  >
                    <Select placeholder="Select company size">
                      <Select.Option value="1-10">1-10 employees</Select.Option>
                      <Select.Option value="11-50">11-50 employees</Select.Option>
                      <Select.Option value="51-200">51-200 employees</Select.Option>
                      <Select.Option value="201-1000">201-1000 employees</Select.Option>
                      <Select.Option value="1000+">1000+ employees</Select.Option>
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="dataExperience"
                    label="Data Analysis Experience Level"
                  >
                    <Select placeholder="Select your experience level">
                      <Select.Option value="beginner">Beginner - New to data analysis</Select.Option>
                      <Select.Option value="intermediate">Intermediate - Some experience with data</Select.Option>
                      <Select.Option value="advanced">Advanced - Experienced with BI tools</Select.Option>
                      <Select.Option value="expert">Expert - Data scientist/analyst</Select.Option>
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="primaryUseCase"
                    label="Primary Use Case for Aicser"
                  >
                    <Select placeholder="Select your primary use case">
                      <Select.Option value="business_intelligence">Business Intelligence & Reporting</Select.Option>
                      <Select.Option value="data_analysis">Data Analysis & Exploration</Select.Option>
                      <Select.Option value="sales_analytics">Sales & Revenue Analytics</Select.Option>
                      <Select.Option value="marketing_analytics">Marketing & Campaign Analytics</Select.Option>
                      <Select.Option value="operational_monitoring">Operational Monitoring</Select.Option>
                      <Select.Option value="financial_reporting">Financial Reporting</Select.Option>
                      <Select.Option value="customer_analytics">Customer Analytics</Select.Option>
                      <Select.Option value="research">Research & Development</Select.Option>
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="dataFrequency"
                    label="How often do you work with data?"
                  >
                    <Select placeholder="Select frequency">
                      <Select.Option value="daily">Daily</Select.Option>
                      <Select.Option value="weekly">Weekly</Select.Option>
                      <Select.Option value="monthly">Monthly</Select.Option>
                      <Select.Option value="occasionally">Occasionally</Select.Option>
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="goals"
                    label="What are your main goals with Aiser?"
                  >
                    <Checkbox.Group>
                      <Row gutter={[16, 16]}>
                        <Col span={12}>
                          <Checkbox value="automate_reporting">Automate reporting</Checkbox>
                        </Col>
                        <Col span={12}>
                          <Checkbox value="improve_decisions">Improve decision making</Checkbox>
                        </Col>
                        <Col span={12}>
                          <Checkbox value="save_time">Save time on analysis</Checkbox>
                        </Col>
                        <Col span={12}>
                          <Checkbox value="team_collaboration">Team collaboration</Checkbox>
                        </Col>
                        <Col span={12}>
                          <Checkbox value="data_visualization">Better data visualization</Checkbox>
                        </Col>
                        <Col span={12}>
                          <Checkbox value="real_time_insights">Real-time insights</Checkbox>
                        </Col>
                      </Row>
                    </Checkbox.Group>
                  </Form.Item>
                </>
              )}
            </Form>
          </div>
        ),
      },
      {
        key: 'plan_selection',
        title: 'Choose Plan',
        description: 'Select your plan',
        icon: <DollarOutlined />,
        content: (
          <div style={{ padding: '16px', maxHeight: '500px', overflowY: 'auto' }}>
            {contextualHelp && showContextualHelp['plan_selection'] !== false && (
              <Alert
                message={contextualHelp.title}
                description={contextualHelp.content}
                type="info"
                icon={<BulbOutlined />}
                showIcon
                closable
                onClose={() => setShowContextualHelp({ ...showContextualHelp, 'plan_selection': false })}
                style={{ marginBottom: '16px' }}
              />
            )}
            
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                plan: 'free',
                enableTeamTrial: true,
              }}
              onFinish={(values) => {
                const selectedPlanValue = enableTeamTrial ? 'team' : (values.plan || 'free');
                updateOnboardingData({ 
                  plan: { 
                    selectedPlan: selectedPlanValue,
                    enableTeamTrial: enableTeamTrial,
                  } 
                });
                setSelectedPlan(selectedPlanValue);
                handleStepProgress('plan_selection', { ...values, enableTeamTrial });
                nextStep();
              }}
            >
              <Form.Item
                name="enableTeamTrial"
                label={
                  <Space>
                    <Text>Start with Team Plan Trial (14 days)</Text>
                    <Tag color="blue">Recommended</Tag>
                  </Space>
                }
                valuePropName="checked"
              >
                <Switch 
                  checked={enableTeamTrial}
                  onChange={setEnableTeamTrial}
                  checkedChildren="Enabled"
                  unCheckedChildren="Disabled"
                />
              </Form.Item>
              
              {!enableTeamTrial && (
                <Form.Item
                  name="plan"
                  label="Select Your Plan"
                  rules={[{ required: true, message: 'Please select a plan' }]}
                >
                <Radio.Group>
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <Radio value="free">
                      <Card size="small" style={{ width: '100%' }}>
                        <Space direction="vertical" size="small">
                          <Text strong>Free</Text>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            10 AI credits/month • 1 project • 2 data sources • 2GB storage
                          </Text>
                        </Space>
                      </Card>
                    </Radio>
                    <Radio value="pro">
                      <Card size="small" style={{ width: '100%', border: '2px solid #1890ff' }}>
                        <Space direction="vertical" size="small">
                          <Space>
                            <Text strong>Pro</Text>
                            <Tag color="blue">Popular</Tag>
                          </Space>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            100 AI credits/month • Unlimited projects • Unlimited data sources • 20GB storage
                          </Text>
                        </Space>
                      </Card>
                    </Radio>
                    <Radio value="team">
                      <Card size="small" style={{ width: '100%' }}>
                        <Space direction="vertical" size="small">
                          <Text strong>Team</Text>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            800 AI credits/month • Team collaboration • 100GB storage
                          </Text>
                        </Space>
                      </Card>
                    </Radio>
                  </Space>
                </Radio.Group>
                </Form.Item>
              )}
              
              {enableTeamTrial && (
                <Alert
                  message="Team Plan Trial"
                  description="You'll start with a 14-day Team plan trial. After 14 days, you'll automatically be moved to the Free plan unless you upgrade."
                  type="info"
                  showIcon
                  style={{ marginBottom: '16px' }}
                />
              )}
              
              <Button 
                type="link" 
                onClick={() => setShowPricingModal(true)}
                icon={<QuestionCircleOutlined />}
              >
                Compare all plans
              </Button>
            </Form>
          </div>
        ),
      },
    ];
    
    // Filter steps based on minimal flow
    if (isMinimalFlow) {
      return allSteps.filter(step => !skipSteps.includes(step.key));
    }
    
    // Add optional steps for full flow
    if (!skipSteps.includes('organization')) {
      allSteps.splice(1, 0, {
        key: 'organization',
        title: 'Set up your workspace',
        description: 'Configure your workspace',
        icon: <DatabaseOutlined />,
        content: (
          <div style={{ padding: '16px', maxHeight: '500px', overflowY: 'auto' }}>
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                workspaceName: 
                  onboardingData.personal?.company || 
                  onboardingData.personal?.organization || 
                  onboardingData.workspace?.name ||
                  (user?.email ? `${user.email.split('@')[0]}'s Workspace` : 'My Workspace'),
              }}
              onFinish={(values) => {
                updateOnboardingData({ workspace: { name: values.workspaceName } });
                handleStepProgress('organization', values);
                nextStep();
              }}
            >
              <Form.Item
                name="workspaceName"
                label="Workspace Name"
                tooltip="You can edit this name or skip this step"
              >
                <Input placeholder="Enter your workspace name" />
              </Form.Item>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                This step can be skipped. Your workspace will be created with a default name if skipped.
              </Text>
            </Form>
          </div>
        ),
      });
    }
    
    return allSteps;
  };
  
  const steps = getSteps();
  
  const handleComplete = async () => {
    setLoading(true);
    try {
      // Structure onboarding data for enhanced backend - include all fields
      const structuredData = {
        personal: {
          firstName: onboardingData.personal?.firstName || form.getFieldValue('firstName') || user?.email?.split('@')[0] || '',
          lastName: onboardingData.personal?.lastName || form.getFieldValue('lastName') || '',
          email: user?.email || '',
          role: onboardingData.personal?.role || form.getFieldValue('role') || '',
          company: onboardingData.personal?.organization || form.getFieldValue('organization') || onboardingData.workspace?.name || '',
          industry: form.getFieldValue('industry') || onboardingData.personal?.industry || '',
          companySize: form.getFieldValue('companySize') || onboardingData.personal?.companySize || '',
        },
        goals: {
          primaryGoal: form.getFieldValue('primaryUseCase') || onboardingData.goals?.primaryGoal || onboardingData.personal?.primaryUseCase || 'data_analysis',
          experienceLevel: form.getFieldValue('dataExperience') || onboardingData.goals?.experienceLevel || 'intermediate',
          dataFrequency: form.getFieldValue('dataFrequency') || onboardingData.goals?.dataFrequency || '',
          goals: Array.isArray(form.getFieldValue('goals') || onboardingData.goals?.goals || [])
            ? (form.getFieldValue('goals') || onboardingData.goals?.goals || []).map((g: any) => typeof g === 'string' ? { value: g } : (typeof g === 'object' && g !== null ? g : { value: String(g) }))
            : [],
        },
        dataSources: {
          hasData: false,
          dataTypes: [], // Empty array - will be converted to empty list of dicts by backend
        },
        workspace: {
          name: form.getFieldValue('workspaceName') || onboardingData.workspace?.name || '',
        },
        plan: {
          selectedPlan: selectedPlan || onboardingData.plan?.selectedPlan || 'free',
          enableTeamTrial: enableTeamTrial,
          trialStarted: enableTeamTrial && selectedPlan === 'team',
        },
        metadata: {
          completedAt: new Date().toISOString(),
          timeSpent: 0,
          skippedSteps: Array.isArray(onboardingFlow?.skip_steps) 
            ? onboardingFlow.skip_steps.map((step: any) => typeof step === 'string' ? { value: step } : (typeof step === 'object' && step !== null ? step : { value: String(step) }))
            : [],
          source: 'signup',
        },
      };

      // Pre-clean the data structure to ensure all arrays contain only dicts (deduplicated)
      const cleanOnboardingDataDedup = (data: any): any => {
        if (Array.isArray(data)) {
          if (data.length === 0) return [];
          return data.map(item => {
            if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
              return cleanOnboardingDataDedup(item);
            } else if (Array.isArray(item)) {
              return { items: cleanOnboardingDataDedup(item) };
            } else {
              return { value: item };
            }
          });
        } else if (typeof data === 'object' && data !== null) {
          const cleaned: any = {};
          for (const [key, value] of Object.entries(data)) {
            cleaned[key] = cleanOnboardingDataDedup(value);
          }
          return cleaned;
        }
        return data;
      };

      const cleanedStructuredData = cleanOnboardingDataDedup(structuredData);

      // Send onboarding completion to backend
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: user?.id || user?.email,
          onboardingData: cleanedStructuredData,
          completedAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Mark as completed in localStorage
        if (user) {
          localStorage.setItem(`onboarding_completed_${user.email}`, 'true');
        }
        
        // Show welcome message if available
        if (result.welcome_message) {
          message.success(
            result.welcome_message.message || 'Welcome to Aiser! Your workspace is ready.',
            5
          );
        } else {
          message.success('Welcome to Aiser! Your journey starts now.', 3);
        }
        
        completeOnboarding();
      } else {
        const errorData = await response.json().catch(() => ({}));
        message.error(errorData.detail || 'Failed to complete onboarding');
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
      message.error('Error completing onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const progress = Math.round(((currentStep + 1) / steps.length) * 100);

  if (!isOnboardingActive) {
    return null;
  }

  return (
    <>
      <Modal
        title={
          <div style={{ textAlign: 'center' }}>
            <Title level={3} style={{ margin: 0 }}>
              <RocketOutlined /> Welcome to Aiser Platform
            </Title>
            <Progress 
              percent={progress} 
              size="small" 
              style={{ marginTop: '8px' }}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
          </div>
        }
        open={isOnboardingActive}
        onCancel={skipOnboarding}
        footer={null}
        width={700}
        centered
        closable={false}
        maskClosable={false}
      >
        <div style={{ minHeight: '500px' }}>
          <Steps
            current={currentStep}
            size="small"
            style={{ marginBottom: '32px' }}
          >
            {steps.map((step, index) => (
              <Steps.Step
                key={step.key}
                title={step.title}
                description={step.description}
                icon={step.icon}
              />
            ))}
          </Steps>

          <div style={{ marginBottom: '32px' }}>
            {steps[currentStep]?.content}
          </div>

          <Divider />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              onClick={prevStep}
              disabled={currentStep === 0}
              icon={<ArrowLeftOutlined />}
            >
              Previous
            </Button>

            <Space>
              <Button onClick={skipOnboarding}>
                Skip
              </Button>
              <Text type="secondary">
                Step {currentStep + 1} of {steps.length}
              </Text>
              <Button
                type="primary"
                onClick={currentStep === 0 ? () => form.submit() : currentStep === steps.length - 1 ? handleComplete : () => {
                  const stepKey = steps[currentStep]?.key;
                  if (stepKey === 'plan_selection' || stepKey === 'organization') {
                    form.submit();
                  } else {
                    nextStep();
                  }
                }}
                loading={loading}
                icon={currentStep === steps.length - 1 ? <CheckCircleOutlined /> : <ArrowRightOutlined />}
              >
                {currentStep === 0 ? 'Continue' : currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
              </Button>
            </Space>
          </div>
        </div>
      </Modal>
      
      {showPricingModal && (
        <PricingModal
          visible={showPricingModal}
          onClose={() => setShowPricingModal(false)}
          onUpgrade={(planType, isYearly) => {
            console.log('Upgrade requested:', planType, isYearly);
            setShowPricingModal(false);
            // TODO: Implement upgrade flow
            message.info('Upgrade functionality coming soon!');
          }}
          currentPlan={selectedPlan}
        />
      )}
    </>
  );
};

export default EnhancedOnboardingModal;

