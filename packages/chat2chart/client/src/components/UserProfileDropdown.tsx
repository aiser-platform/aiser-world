'use client';

import React, { useState } from 'react';
import { Dropdown, Avatar, Badge, Button, Progress, Divider, message } from 'antd';
import { 
  UserOutlined, 
  SettingOutlined, 
  LogoutOutlined, 
  CrownOutlined,
  BarChartOutlined,
  TeamOutlined,
  BellOutlined,
  ProjectOutlined
} from '@ant-design/icons';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { useRouter } from 'next/navigation';
import PricingModal from './PricingModal';

interface UserProfileDropdownProps {
  className?: string;
}

const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({ className }) => {
  const { user, logout } = useAuth();
  const { currentOrganization, usageStats } = useOrganization();
  const [pricingModalVisible, setPricingModalVisible] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const router = useRouter();

  // Use real organization data from context
  const organizationData = {
    name: currentOrganization?.name || 'My Organization',
    plan: currentOrganization?.plan_type || 'free',
    aiCreditsUsed: usageStats?.ai_queries_used || 0,
    aiCreditsLimit: usageStats?.ai_queries_limit || 50,
    daysLeftInTrial: 0, // Not implemented yet
    isTrialActive: false // Not implemented yet
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'free': return 'default';
      case 'pro': return 'blue';
      case 'team': return 'purple';
      case 'enterprise': return 'gold';
      default: return 'default';
    }
  };

  const getPlanDisplayName = (plan: string) => {
    return plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : 'Unknown';
  };

  const handleUpgrade = async (planType: string, isYearly: boolean) => {
    setUpgradeLoading(true);
    try {
      // For now, we'll simulate the upgrade process
      // In a real app, you would:
      // 1. Create Stripe checkout session
      // 2. Redirect to Stripe checkout
      // 3. Handle webhook to update subscription
      
      // Simulate payment method (in real app, this would come from Stripe)
      const mockPaymentMethodId = 'pm_mock_payment_method';
      
      // await upgradePlan(planType, mockPaymentMethodId); // Commented out since function doesn't exist
      console.log('Upgrade requested for plan:', planType);
      setPricingModalVisible(false);
      
    } catch (error) {
      message.error('Failed to upgrade plan. Please try again.');
    } finally {
      setUpgradeLoading(false);
    }
  };

  const creditsPercentage = (organizationData.aiCreditsUsed / organizationData.aiCreditsLimit) * 100;

  const menuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: (
        <div className="py-2">
          <div className="font-medium text-gray-900 dark:text-gray-100">{user?.email || 'User'}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{organizationData.name}</div>
        </div>
      ),
      onClick: () => router.push('/settings/profile'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'plan-info',
      label: (
        <div className="py-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Current Plan</span>
            <Badge 
              color={getPlanBadgeColor(organizationData.plan)} 
              text={getPlanDisplayName(organizationData.plan)}
            />
          </div>
          
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600 dark:text-gray-300">AI Credits</span>
              <span className="text-gray-900 dark:text-gray-100">{organizationData.aiCreditsUsed}/{organizationData.aiCreditsLimit}</span>
            </div>
            <Progress 
              percent={creditsPercentage} 
              size="small" 
              strokeColor={creditsPercentage > 80 ? '#ff4d4f' : '#1890ff'}
              showInfo={false}
            />
          </div>

          {organizationData.isTrialActive && (
            <div className="text-xs text-orange-600 dark:text-orange-400 mb-2">
              Trial expires in {organizationData.daysLeftInTrial} days
            </div>
          )}

          <Button
            type="primary"
            size="small"
            icon={<CrownOutlined />}
            block
            onClick={() => setPricingModalVisible(true)}
            className="bg-gradient-to-r from-blue-500 to-purple-600 border-none"
          >
            Upgrade Plan
          </Button>
        </div>
      ),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'usage',
      icon: <BarChartOutlined />,
      label: 'Usage & Billing',
      onClick: () => router.push('/billing'),
    },
    {
      key: 'team',
      icon: <TeamOutlined />,
      label: 'Team Management',
      onClick: () => router.push('/team'),
    },
    {
      key: 'projects',
      icon: <ProjectOutlined />,
      label: 'Projects',
      onClick: () => router.push('/projects'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      onClick: () => router.push('/settings'),
    },
    {
      key: 'notifications',
      icon: <BellOutlined />,
      label: 'Notifications',
      onClick: () => router.push('/settings'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Sign Out',
      onClick: logout,
    },
  ];

  return (
    <>
      <Dropdown
        menu={{ items: menuItems }}
        trigger={['click']}
        placement="bottomRight"
        overlayClassName="user-profile-dropdown"
        overlayStyle={{ minWidth: 280 }}
      >
        <div className={`flex items-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg p-2 transition-colors ${className}`} style={{ gap: 8 }}>
          <div className="relative">
            <Avatar 
              size="default" 
              icon={<UserOutlined />}
              className="bg-blue-500"
            />
            {organizationData.isTrialActive && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white"></div>
            )}
          </div>
          {/* always show username on desktop and tablet, collapse only on very small screens */}
          <div className="ml-2 block" style={{ minWidth: 140 }}>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {user?.email?.split('@')[0] || 'User'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {getPlanDisplayName(organizationData.plan)} Plan
            </div>
          </div>
        </div>
      </Dropdown>

      <PricingModal
        visible={pricingModalVisible}
        onClose={() => setPricingModalVisible(false)}
        onUpgrade={handleUpgrade}
        currentPlan={organizationData.plan}
        loading={upgradeLoading}
      />
    </>
  );
};

export default UserProfileDropdown;