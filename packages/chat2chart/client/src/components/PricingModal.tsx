'use client';

import React, { useState } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { Modal, Button, Card, Badge, List, Divider, Switch, message } from 'antd';
import { CheckOutlined, CrownOutlined, TeamOutlined, RocketOutlined, StarOutlined } from '@ant-design/icons';

interface PricingPlan {
  name: string;
  plan_type: string;
  price_monthly: number;
  price_yearly: number;
  ai_credits: number;
  features: string[];
  watermark: boolean;
  trial_days: number;
  popular?: boolean;
}

interface PricingModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: (planType: string, isYearly: boolean) => void;
  currentPlan?: string;
  loading?: boolean;
}

const PricingModal: React.FC<PricingModalProps> = ({
  visible,
  onClose,
  onUpgrade,
  currentPlan = 'free',
  loading = false
}) => {
  const [isYearly, setIsYearly] = useState(false);

  const plans: PricingPlan[] = [
    {
      name: 'Free',
      plan_type: 'free',
      price_monthly: 0,
      price_yearly: 0,
      ai_credits: 50,
      features: [
        'Limited access to core features',
        'Basic AI analysis',
        'Watermark on charts',
        '1 project space'
      ],
      watermark: true,
      trial_days: 14
    },
    {
      name: 'Pro',
      plan_type: 'pro',
      price_monthly: 15,
      price_yearly: 150,
      ai_credits: 500,
      features: [
        'Core AI analysis',
        '1 Organization Workspace',
        '1 Project Space',
        'Deep Analysis Mode',
        'Limited Theme & Brand Customization',
        'No watermark'
      ],
      watermark: false,
      trial_days: 14,
      popular: true
    },
    {
      name: 'Team',
      plan_type: 'team',
      price_monthly: 29,
      price_yearly: 290,
      ai_credits: 1000,
      features: [
        'Everything in Pro',
        'Multiple Project Spaces',
        'Multiple Users and Project Collaborations',
        'Unlimited AI Commands',
        'Full Theme & Brand Customization',
        'Platform API Access',
        'EChart MCP Server',
        'Own AI Providers\' API Key'
      ],
      watermark: false,
      trial_days: 14
    },
    {
      name: 'Enterprise',
      plan_type: 'enterprise',
      price_monthly: 0, // Custom pricing
      price_yearly: 0,
      ai_credits: 5000,
      features: [
        'Everything in Team',
        'Full Integrations',
        'White-Label Customization',
        'Dedicated Support',
        'Local AI Model',
        'On-Premise Deployment',
        'Custom AI Providers\' API Key',
        'SLA & Priority Support'
      ],
      watermark: false,
      trial_days: 14
    }
  ];

  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case 'free':
        return <StarOutlined className="text-gray-500" />;
      case 'pro':
        return <RocketOutlined className="text-blue-500" />;
      case 'team':
        return <TeamOutlined className="text-purple-500" />;
      case 'enterprise':
        return <CrownOutlined className="text-yellow-500" />;
      default:
        return <StarOutlined />;
    }
  };

  const formatPrice = (plan: PricingPlan) => {
    if (plan.plan_type === 'enterprise') {
      return 'Custom';
    }
    if (plan.price_monthly === 0) {
      return 'Free';
    }
    const price = isYearly ? plan.price_yearly / 12 : plan.price_monthly;
    return `$${price}`;
  };

  const getYearlySavings = (plan: PricingPlan) => {
    if (plan.price_monthly === 0 || plan.plan_type === 'enterprise') return null;
    const monthlyCost = plan.price_monthly * 12;
    const savings = monthlyCost - plan.price_yearly;
    const percentage = Math.round((savings / monthlyCost) * 100);
    return percentage;
  };

  const { currentOrganization } = useOrganization();

  const handleUpgrade = async (planType: string) => {
    if (planType === 'enterprise') {
      message.info('Please contact our sales team for Enterprise pricing');
      return;
    }

    try {
      const orgId = currentPlan === 'free' ? (currentOrganization?.id || 1) : (currentOrganization?.id || 1);
      const payload = { plan_type: planType, payment_method_id: 'pm_mock_payment_method' };
      const res = await fetch(`/api/v1/organizations/${orgId}/upgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Upgrade failed');

      const data = await res.json();
      message.success('Plan upgraded successfully');
      onUpgrade(planType, isYearly);
    } catch (err) {
      console.error(err);
      message.error('Failed to upgrade plan. Please try again.');
    }
  };

  const isCurrentPlan = (planType: string) => {
    return currentPlan === planType;
  };

  return (
    <Modal
      title={
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Choose Your Plan</h2>
          <p className="text-gray-600">Upgrade to unlock more features and AI credits</p>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1200}
      className="pricing-modal"
    >
      <div className="mb-6 text-center">
        <div className="inline-flex items-center bg-gray-100 rounded-lg p-1">
          <span className={`px-3 py-1 text-sm ${!isYearly ? 'font-medium' : 'text-gray-600'}`}>
            Monthly
          </span>
          <Switch
            checked={isYearly}
            onChange={setIsYearly}
            className="mx-2"
          />
          <span className={`px-3 py-1 text-sm ${isYearly ? 'font-medium' : 'text-gray-600'}`}>
            Yearly
          </span>
          <Badge count="Save 17%" className="ml-2" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const savings = getYearlySavings(plan);
          const isCurrent = isCurrentPlan(plan.plan_type);
          
          return (
            <Card
              key={plan.plan_type}
              className={`relative h-full ${
                plan.popular ? 'border-blue-500 shadow-lg' : ''
              } ${isCurrent ? 'border-green-500 bg-green-50' : ''}`}
              bodyStyle={{ padding: '24px' }}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge count="Most Popular" className="bg-blue-500" />
                </div>
              )}
              
              {isCurrent && (
                <div className="absolute -top-3 right-4">
                  <Badge count="Current Plan" className="bg-green-500" />
                </div>
              )}

              <div className="text-center mb-4">
                <div className="text-2xl mb-2">{getPlanIcon(plan.plan_type)}</div>
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-2">
                  <span className="text-3xl font-bold">{formatPrice(plan)}</span>
                  {plan.price_monthly > 0 && plan.plan_type !== 'enterprise' && (
                    <span className="text-gray-500 text-sm">/user/month</span>
                  )}
                </div>
                {isYearly && savings && (
                  <div className="text-green-600 text-sm font-medium">
                    Save {savings}% yearly
                  </div>
                )}
              </div>

              <div className="mb-4">
                <div className="text-center mb-3">
                  <span className="font-semibold">{plan.ai_credits.toLocaleString()}</span>
                  <span className="text-gray-500 text-sm"> AI credits/month</span>
                </div>
                {plan.trial_days > 0 && !isCurrent && (
                  <div className="text-center text-blue-600 text-sm font-medium mb-3">
                    {plan.trial_days} days free trial
                  </div>
                )}
              </div>

              <Divider />

              <List
                size="small"
                dataSource={plan.features}
                renderItem={(feature) => (
                  <List.Item className="border-none px-0 py-1">
                    <div className="flex items-start">
                      <CheckOutlined className="text-green-500 mt-1 mr-2 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  </List.Item>
                )}
              />

              <div className="mt-6">
                <Button
                  type={plan.popular ? 'primary' : 'default'}
                  size="large"
                  block
                  loading={loading}
                  disabled={isCurrent}
                  onClick={() => handleUpgrade(plan.plan_type)}
                  className={
                    isCurrent 
                      ? 'bg-green-500 border-green-500 text-white cursor-not-allowed' 
                      : plan.popular 
                        ? 'bg-blue-500 border-blue-500' 
                        : ''
                  }
                >
                  {isCurrent 
                    ? 'Current Plan' 
                    : plan.plan_type === 'enterprise' 
                      ? 'Contact Sales' 
                      : plan.price_monthly === 0 
                        ? 'Get Started' 
                        : 'Upgrade Now'
                  }
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 text-center">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold mb-2">Add-Ons Available</h4>
          <p className="text-sm text-gray-600">
            <strong>Additional AI Credits:</strong> $0.01 per token - Purchase additional AI tokens and credits as needed beyond your monthly allocation.
          </p>
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-gray-500">
        <p>All plans include 14 days free trial. No credit card required for Free plan.</p>
        <p>Prices shown in USD. Cancel anytime.</p>
      </div>
    </Modal>
  );
};

export default PricingModal;