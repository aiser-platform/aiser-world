/**
 * Hook for plan-based feature restrictions
 * Provides utilities to check plan features and show upgrade prompts
 * 
 * CRITICAL: All hooks must be called unconditionally
 * This hook internally uses useOrganization but ensures it's called at top level
 */

import React, { useState, useMemo } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { Modal, Button } from 'antd';
import { useRouter } from 'next/navigation';

export const usePlanRestrictions = () => {
  // CRITICAL: Call hooks unconditionally at the top level
  // useOrganization itself is safe and called unconditionally
  const { currentOrganization } = useOrganization();
  const router = useRouter();
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<string>('');
  const [upgradeMessage, setUpgradeMessage] = useState<string>('');

  const planType = currentOrganization?.plan_type || 'free';

  /**
   * Check if a feature is available for the current plan
   */
  const hasFeature = (feature: string): boolean => {
    const featureMap: Record<string, Record<string, boolean>> = {
      free: {
        watermark: true,
        theme_customization: false,
        api_access: false,
        collaboration: false,
        advanced_collaboration: false,
        team_governance: false,
        priority_support: false,
        dedicated_support: false,
        white_label: false,
        on_premise: false,
        compliance: false,
        sla: false,
        dedicated_success: false,
      },
      pro: {
        watermark: false,
        theme_customization: true,
        api_access: true,
        collaboration: false,
        advanced_collaboration: false,
        team_governance: false,
        priority_support: true,
        dedicated_support: false,
        white_label: false,
        on_premise: false,
        compliance: false,
        sla: false,
        dedicated_success: false,
      },
      team: {
        watermark: false,
        theme_customization: true,
        api_access: true,
        collaboration: true,
        advanced_collaboration: true,
        team_governance: true,
        priority_support: true,
        dedicated_support: true,
        white_label: false,
        on_premise: false,
        compliance: false,
        sla: false,
        dedicated_success: false,
      },
      enterprise: {
        watermark: false,
        theme_customization: true,
        api_access: true,
        collaboration: true,
        advanced_collaboration: true,
        team_governance: true,
        priority_support: true,
        dedicated_support: true,
        white_label: true,
        on_premise: true,
        compliance: true,
        sla: true,
        dedicated_success: true,
      },
    };

    return featureMap[planType]?.[feature] || false;
  };

  /**
   * Check if user can perform an action (e.g., create project, data source)
   */
  const canPerformAction = (action: 'create_project' | 'create_data_source' | 'generate_chart'): boolean => {
    // All plans can generate charts (free plan has 10 credits/month, with watermark)
    if (action === 'generate_chart') {
      return true; // Credit limits are checked on backend
    }
    // For create_project and create_data_source, check limits
    return true; // Limits are checked on backend
  };

  /**
   * Get required plan for a feature
   */
  const getRequiredPlan = (feature: string): string => {
    const planMap: Record<string, string> = {
      api_access: 'Pro',
      theme_customization: 'Pro',
      collaboration: 'Team',
      advanced_collaboration: 'Team',
      team_governance: 'Team',
      priority_support: 'Pro',
      dedicated_support: 'Team',
      white_label: 'Enterprise',
      on_premise: 'Enterprise',
      compliance: 'Enterprise',
      sla: 'Enterprise',
      dedicated_success: 'Enterprise',
    };
    return planMap[feature] || 'Pro';
  };

  /**
   * Show upgrade modal
   */
  const showUpgradePrompt = (feature: string, message?: string) => {
    setUpgradeFeature(feature);
    setUpgradeMessage(message || '');
    setUpgradeModalVisible(true);
  };

  /**
   * Upgrade modal component
   */
  const UpgradeModal = () => (
    <Modal
      title="Upgrade Required"
      open={upgradeModalVisible}
      onCancel={() => setUpgradeModalVisible(false)}
      footer={[
        <Button key="cancel" onClick={() => setUpgradeModalVisible(false)}>
          Cancel
        </Button>,
        <Button
          key="upgrade"
          type="primary"
          onClick={() => {
            setUpgradeModalVisible(false);
            router.push('/billing');
          }}
        >
          View Plans
        </Button>,
      ]}
    >
      <p>
        {upgradeMessage || `This feature requires ${getRequiredPlan(upgradeFeature)} plan or higher.`}
      </p>
      <p>Upgrade now to unlock this feature and more!</p>
    </Modal>
  );

  return {
    planType,
    hasFeature,
    canPerformAction,
    getRequiredPlan,
    showUpgradePrompt,
    UpgradeModal,
  };
};

