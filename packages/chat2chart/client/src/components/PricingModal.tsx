'use client';

import React, { useState } from 'react';
import { Modal, Button, Card, List, Divider, Switch, message, Tag, Tooltip } from 'antd';
import { CheckOutlined, CrownOutlined, TeamOutlined, RocketOutlined, StarOutlined } from '@ant-design/icons';
import './PricingModal.css';

interface PlanStat {
  label: string;
  value: string;
}

type PricingPlanKey = 'free' | 'pro' | 'team' | 'enterprise';

interface PricingPlan {
  name: string;
  plan_type: PricingPlanKey;
  price_monthly: number;
  price_yearly: number;
  stats: PlanStat[];
  features: string[];
  watermark: boolean;
  trial_days: number;
  popular?: boolean;
  min_seats?: number;
  price_per_seat?: number;
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
      stats: [
        { label: 'AI Credits', value: '30 / month' },
        { label: 'Storage', value: '5 GB' },
        { label: 'Data History', value: '7 days' },
      ],
      features: [
        '1 project workspace',
        'Connect up to 2 data sources',
        'Watermarked charts & exports',
        'Community support'
      ],
      watermark: true,
      trial_days: 0
    },
    {
      name: 'Pro',
      plan_type: 'pro',
      price_monthly: 25,
      price_yearly: 250,
      stats: [
        { label: 'AI Credits', value: '300 / month' },
        { label: 'Storage', value: '90 GB' },
        { label: 'Data History', value: '6 months' },
      ],
      features: [
        'Unlimited workspaces & data sources',
        'Watermark-free charts & dashboards',
        'Theme & brand customization',
        'API access & automation',
        'Priority email & chat support'
      ],
      watermark: false,
      trial_days: 14,
      popular: true
    },
    {
      name: 'Team',
      plan_type: 'team',
      price_monthly: 99,
      price_yearly: 990,
      stats: [
        { label: 'AI Credits', value: '2,000 / month' },
        { label: 'Storage', value: '500 GB' },
        { label: 'Data History', value: '1 year' },
        { label: 'Seats', value: '5 included' },
      ],
      min_seats: 5,
      price_per_seat: 25,
      features: [
        'Advanced collaboration & approvals',
        'Role-based permissions & governance',
        'Shared asset libraries',
        'Dedicated support channel',
        '$25 per additional seat'
      ],
      watermark: false,
      trial_days: 14
    },
    {
      name: 'Enterprise',
      plan_type: 'enterprise',
      price_monthly: 0, // Custom pricing
      price_yearly: 0,
      stats: [
        { label: 'AI Credits', value: 'Unlimited*' },
        { label: 'Storage', value: 'Custom / multi-region' },
        { label: 'Data History', value: 'Multi-year' },
        { label: 'Seats', value: 'Custom' },
      ],
      features: [
        'On-premise / Own-cloud deployment',
        'White-label options',
        'Custom AI models',
        'SSO (Single Sign-On)',
        '99.9% SLA with dedicated support',
        'Compliance-ready (SOC 2, GDPR)',
        'Dedicated customer success manager',
        'Custom pricing & onboarding'
      ],
      watermark: false,
      trial_days: 30
    }
  ];

  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case 'free':
        return <StarOutlined className="plan-icon plan-icon-free" />;
      case 'pro':
        return <RocketOutlined className="plan-icon plan-icon-pro" />;
      case 'team':
        return <TeamOutlined className="plan-icon plan-icon-team" />;
      case 'enterprise':
        return <CrownOutlined className="plan-icon plan-icon-enterprise" />;
      default:
        return <StarOutlined className="plan-icon" />;
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
    return `$${price.toFixed(2)}`;
  };

  const formatYearlyPrice = (plan: PricingPlan) => {
    if (plan.plan_type === 'enterprise') {
      return 'Custom';
    }
    if (plan.price_yearly === 0) {
      return 'Free';
    }
    return `$${plan.price_yearly.toFixed(2)}`;
  };

  const getYearlySavings = (plan: PricingPlan) => {
    if (plan.price_monthly === 0 || plan.plan_type === 'enterprise') return null;
    const monthlyCost = plan.price_monthly * 12;
    const savings = monthlyCost - plan.price_yearly;
    const percentage = Math.round((savings / monthlyCost) * 100);
    return percentage;
  };

  const creditPacks = [
    { id: 'starter', label: 'Starter Boost', price: 10, credits: 1000, note: 'Perfect for pilots & proofs of concept.' },
    { id: 'growth', label: 'Growth Pack', price: 25, credits: 2500, note: 'Ideal for ongoing team demos.' },
    { id: 'scale', label: 'Scale Pack', price: 100, credits: 10000, note: 'Great for quarterly launch spikes.' },
    { id: 'enterprise', label: 'Enterprise Surge', price: 500, credits: 50000, note: 'Designed for high-volume operations.' },
  ];

  const handleUpgrade = async (planType: string) => {
    if (planType === 'enterprise') {
      message.info('Please contact our sales team for Enterprise pricing');
      return;
    }

    // Organization context removed - upgrade functionality disabled
    message.info('Plan upgrade functionality is currently unavailable. Please contact support.');
    onUpgrade(planType, isYearly);
  };

  const isCurrentPlan = (planType: string) => {
    return currentPlan === planType;
  };

  return (
    <Modal
      title={
        <div className="pricing-modal-header">
          <h2 className="pricing-modal-title">Choose Your Plan</h2>
          <p className="pricing-modal-subtitle">Upgrade to unlock more features and AI credits</p>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1000}
      className="pricing-modal"
    >
      <div className="pricing-toggle-container">
        <div className="pricing-toggle">
          <span className={`pricing-toggle-label ${!isYearly ? 'pricing-toggle-active' : ''}`}>
            Monthly
          </span>
          <Switch
            checked={isYearly}
            onChange={setIsYearly}
            className="pricing-toggle-switch"
          />
          <span className={`pricing-toggle-label ${isYearly ? 'pricing-toggle-active' : ''}`}>
            Yearly
          </span>
          <Tag color="green" className="pricing-savings-tag">Save 17%</Tag>
        </div>
      </div>

      <div className="pricing-cards-grid">
        {plans.map((plan) => {
          const savings = getYearlySavings(plan);
          const isCurrent = isCurrentPlan(plan.plan_type);
          
          return (
            <Card
              key={plan.plan_type}
              className={`pricing-card ${plan.popular ? 'pricing-card-popular' : ''} ${isCurrent ? 'pricing-card-current' : ''}`}
              bodyStyle={{ padding: '20px' }}
            >
              {plan.popular && (
                <div className="pricing-badge pricing-badge-popular">
                  <Tag color="blue" className="pricing-badge-tag">Most Popular</Tag>
                </div>
              )}
              
              {isCurrent && (
                <div className="pricing-badge pricing-badge-current">
                  <Tag color="green" className="pricing-badge-tag">Current Plan</Tag>
                </div>
              )}

              <div className="pricing-card-header">
                <div className="pricing-card-icon">{getPlanIcon(plan.plan_type)}</div>
                <h3 className="pricing-card-title">{plan.name}</h3>
                <div className="pricing-card-price">
                  <span className="pricing-price-amount">{formatPrice(plan)}</span>
                  {plan.price_monthly > 0 && plan.plan_type !== 'enterprise' && (
                    <span className="pricing-price-period">/month</span>
                  )}
                </div>
                <div className="pricing-card-meta">
                  {isYearly && savings && (
                    <div className="pricing-savings">
                      Save ${(plan.price_monthly * 12 - plan.price_yearly).toFixed(2)} yearly
                    </div>
                  )}
                  {plan.stats && (
                    <div className="pricing-card-stats">
                      {plan.stats.map((stat) => (
                        <div className="pricing-stat" key={`${plan.plan_type}-${stat.label}`}>
                          <span className="pricing-stat-label">{stat.label}</span>
                          <span className="pricing-stat-value">{stat.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {plan.plan_type === 'team' && plan.min_seats && (
                    <div className="pricing-card-footnote">
                      Includes {plan.min_seats} seats · ${plan.price_per_seat}/additional seat
                    </div>
                  )}
                  {plan.trial_days > 0 && !isCurrent && (
                    <div className="pricing-trial-compact">
                      {plan.trial_days}-day trial
                    </div>
                  )}
                </div>
              </div>

              <Divider className="pricing-divider" />

              <List
                size="small"
                dataSource={plan.features}
                renderItem={(feature) => (
                  <List.Item className="pricing-feature-item">
                    <div className="pricing-feature">
                      <CheckOutlined className="pricing-feature-icon" />
                      <span className="pricing-feature-text">{feature}</span>
                    </div>
                  </List.Item>
                )}
              />

              <div className="pricing-card-action">
                <Button
                  type={plan.popular ? 'primary' : 'default'}
                  size="large"
                  block
                  loading={loading}
                  disabled={isCurrent}
                  onClick={() => handleUpgrade(plan.plan_type)}
                  className={`pricing-button ${isCurrent ? 'pricing-button-current' : ''} ${plan.popular ? 'pricing-button-popular' : ''}`}
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

      <div className="pricing-addons">
        <div className="pricing-addons-card">
          <div className="pricing-addons-info">
            <h4 className="pricing-addons-title">💡 Need More?</h4>
            <p className="pricing-addons-description">
              Pre-purchase AI credit packs for peak demand without changing plans.
            </p>
          </div>
          <div className="credit-pack-grid">
            {creditPacks.map((pack) => (
              <Tooltip key={pack.id} title={pack.note} placement="top">
                <div className="credit-pack-card">
                  <div className="credit-pack-price">${pack.price}</div>
                  <div className="credit-pack-label">{pack.label}</div>
                  <div className="credit-pack-credits">
                    {pack.credits.toLocaleString()} credits
                  </div>
                  <div className="credit-pack-meta">
                    ≈ ${(pack.price / pack.credits).toFixed(3)}/credit
                  </div>
                </div>
              </Tooltip>
            ))}
          </div>
        </div>
      </div>

      <p className="pricing-footnote-text">
        *Unlimited credits available with dedicated enterprise or bring-your-own-model agreements.
      </p>

      <div className="pricing-footer">
        <div className="pricing-footer-benefits">
          <div className="pricing-footer-benefit">
            <CheckOutlined /> 14-day free trial on all paid plans
          </div>
          <div className="pricing-footer-benefit">
            <CheckOutlined /> Cancel anytime, no questions asked
          </div>
          <div className="pricing-footer-benefit">
            <CheckOutlined /> All features unlocked during trial
          </div>
        </div>
        <p className="pricing-footer-text">Prices shown in USD. Secure payment processing via Stripe.</p>
      </div>
    </Modal>
  );
};

export default PricingModal;