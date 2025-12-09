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
  showText?: boolean;
}

const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({ className, showText = true }) => {
  const { user, logout } = useAuth();
  const { currentOrganization, usageStats, getOrganizationUsage } = useOrganization();
  const [pricingModalVisible, setPricingModalVisible] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const router = useRouter();

  // Refresh usage stats when component mounts, organization changes, or dropdown opens
  React.useEffect(() => {
    if (currentOrganization?.id) {
      getOrganizationUsage(currentOrganization.id);
    }
  }, [currentOrganization?.id]);

  // Refresh usage stats when dropdown is opened (on visible change)
  const handleDropdownVisibleChange = (visible: boolean) => {
    if (visible && currentOrganization?.id) {
      // Refresh usage stats when dropdown opens
      getOrganizationUsage(currentOrganization.id);
    }
  };

  // Use real organization data from context with updated usage stats
  // CRITICAL: Only default to 'free' if plan_type is truly missing
  // Log for debugging
  console.log('[UserProfileDropdown] currentOrganization:', currentOrganization);
  console.log('[UserProfileDropdown] usageStats:', usageStats);
  
  const organizationData = {
    name: currentOrganization?.name || 'My Organization',
    plan: (currentOrganization?.plan_type && currentOrganization.plan_type.trim() !== '') 
      ? currentOrganization.plan_type 
      : (currentOrganization ? 'free' : 'loading'), // Show 'loading' if org not loaded yet
    // CRITICAL: Map both ai_queries_* and ai_credits_* fields correctly
    aiCreditsUsed: usageStats?.ai_queries_used ?? usageStats?.ai_credits_used ?? 0,
    aiCreditsLimit: usageStats?.ai_queries_limit ?? usageStats?.ai_credits_limit ?? (currentOrganization?.plan_type === 'pro' ? 1000 : 30),
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
        <div style={{ padding: '8px 0' }}>
          <div className="font-medium text-gray-900 dark:text-gray-100" style={{ marginBottom: '4px' }}>
            {user?.email || user?.username || user?.name || 'User'}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {organizationData.name || 'My Organization'}
          </div>
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
        <div style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span className="text-sm text-gray-900 dark:text-gray-100" style={{ fontWeight: 500 }}>
              Current Plan:
            </span>
            <Badge 
              color={getPlanBadgeColor(organizationData.plan)} 
              text={getPlanDisplayName(organizationData.plan)}
              style={{ fontSize: '11px', padding: '2px 8px' }}
            />
          </div>
          
          <div style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span className="text-sm text-gray-900 dark:text-gray-100" style={{ fontWeight: 500 }}>
                AI Credits:
              </span>
              <span className="text-sm text-gray-900 dark:text-gray-100" style={{ fontWeight: 600 }}>
                {organizationData.aiCreditsUsed}/{organizationData.aiCreditsLimit}
              </span>
            </div>
            <Progress 
              percent={creditsPercentage} 
              size="small" 
              strokeColor={creditsPercentage > 80 ? '#ff4d4f' : '#1890ff'}
              showInfo={false}
            />
          </div>

          {organizationData.isTrialActive && (
            <div className="text-xs text-orange-600 dark:text-orange-400" style={{ marginBottom: '10px', padding: '6px 8px', background: 'rgba(255, 152, 0, 0.1)', borderRadius: '4px' }}>
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
      onClick: async () => {
        try {
          await logout();
        } catch (error) {
          console.error('Logout error:', error);
          // Force redirect even if logout fails
          if (typeof window !== 'undefined') {
            window.location.replace('/login');
          }
        }
      },
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'about',
      label: (
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--ant-color-text-tertiary)' }}>
          Powered by Aicser • v1.0.1 beta
        </div>
      ),
      disabled: true,
    },
  ];

  return (
    <>
      <Dropdown
        menu={{ items: menuItems }}
        trigger={['click']}
        placement="bottomRight"
        overlayClassName="user-profile-dropdown"
        overlayStyle={{ minWidth: 300, padding: '8px 0' }}
        onOpenChange={handleDropdownVisibleChange}
      >
        <div className={`flex items-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors ${className}`} style={{ gap: 10, padding: '6px 10px' }}>
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
          {showText && (
            <div className="block" style={{ minWidth: 140 }}>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100" style={{ lineHeight: '1.4' }}>
                {user?.email?.split('@')[0] || 'User'}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400" style={{ lineHeight: '1.3' }}>
                {getPlanDisplayName(organizationData.plan)} Plan
              </div>
            </div>
          )}
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