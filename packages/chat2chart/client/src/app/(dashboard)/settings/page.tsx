'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  Tabs,
  Form,
  Input,
  Button,
  Switch,
  Select,
  Space,
  Typography,
  Row,
  Col,
  message,
  Table,
  Tag,
  Popconfirm,
  Badge,
  Alert,
  Slider,
  Skeleton,
  Empty,
  Tooltip,
  Divider,
  Modal,
  Statistic,
  Segmented,
  Progress
} from 'antd';
import { 
  UserOutlined, 
  SettingOutlined,
  SecurityScanOutlined,
  TeamOutlined,
  DatabaseOutlined,
  BellOutlined,
  GlobalOutlined, 
  KeyOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  MailOutlined,
  PhoneOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  ArrowUpOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useOrganization } from '@/context/OrganizationContext';
import { usePlanRestrictions } from '@/hooks/usePlanRestrictions';
import { useAuth } from '@/context/AuthContext';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface SettingsPageProps {}

type PlanKey = 'free' | 'pro' | 'team' | 'enterprise';

const PLAN_SUMMARY_META: Record<PlanKey, { tagColor: string; dataHistoryDays: number; includedSeats: number }> = {
  free: { tagColor: 'default', dataHistoryDays: 7, includedSeats: 1 },
  pro: { tagColor: 'blue', dataHistoryDays: 180, includedSeats: 1 },
  team: { tagColor: 'purple', dataHistoryDays: 365, includedSeats: 5 },
  enterprise: { tagColor: 'gold', dataHistoryDays: -1, includedSeats: -1 },
};

const SettingsPage: React.FC<SettingsPageProps> = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { currentOrganization, usageStats } = useOrganization();
  const { planType, hasFeature, getRequiredPlan, showUpgradePrompt, UpgradeModal } = usePlanRestrictions();

  // State
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});

  // Forms
  const [profileForm] = Form.useForm();
  const [orgForm] = Form.useForm();
  const [securityForm] = Form.useForm();
  const [notificationForm] = Form.useForm();
  const [appearanceForm] = Form.useForm();
  const [apiKeyForm] = Form.useForm();
  const [providerKeyForm] = Form.useForm();

  // Data
  const [userProfile, setUserProfile] = useState<any>(null);
  const [securitySettings, setSecuritySettings] = useState<any>(null);
  const [notificationSettings, setNotificationSettings] = useState<any>(null);
  const [appearanceSettings, setAppearanceSettings] = useState<any>(null);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [providerApiKeys, setProviderApiKeys] = useState<any>({});
  const [aiModelPreference, setAiModelPreference] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [showProviderKeyModal, setShowProviderKeyModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [dataSources, setDataSources] = useState<any[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberStatusFilter, setMemberStatusFilter] = useState<'all' | 'active' | 'invited' | 'inactive'>('all');
  const [dataSourceSearch, setDataSourceSearch] = useState('');
  const [dataSourceStatusFilter, setDataSourceStatusFilter] = useState<'all' | 'connected' | 'failed' | 'pending'>('all');
  const overviewStats = useMemo(() => ({
    members: teamMembers.length,
    activeMembers: teamMembers.filter((m) => m.status === 'active').length,
    dataSources: dataSources.length,
    apiKeys: apiKeys.length,
  }), [teamMembers, dataSources, apiKeys]);
  const planUsage = useMemo(() => {
    const aiLimit = usageStats?.ai_queries_limit ?? 0;
    const storageLimitMb = usageStats?.storage_limit_mb ?? 0;
    const storageLimitGb = storageLimitMb > 0 ? storageLimitMb / 1024 : storageLimitMb;
    const projectLimit = usageStats?.projects_limit ?? 0;

    const aiUsed = usageStats?.ai_queries_used ?? 0;
    const storageUsedGb = (usageStats?.storage_used_mb ?? 0) / 1024;
    const projectsUsed = usageStats?.projects_count ?? 0;

    const aiPercent = aiLimit > 0 ? Math.min(100, (aiUsed / aiLimit) * 100) : 0;
    const storagePercent = storageLimitGb > 0 ? Math.min(100, (storageUsedGb / storageLimitGb) * 100) : 0;
    const projectPercent = projectLimit > 0 ? Math.min(100, (projectsUsed / projectLimit) * 100) : 0;

    return {
      planLabel: planType?.toUpperCase() || 'FREE',
      ai: { used: aiUsed, limit: aiLimit, percent: aiPercent },
      storage: { used: storageUsedGb, limit: storageLimitGb, percent: storagePercent },
      projects: { used: projectsUsed, limit: projectLimit, percent: projectPercent },
    };
  }, [usageStats, planType]);

  const planKey: PlanKey = (['free', 'pro', 'team', 'enterprise'].includes(planType || '')
    ? (planType as PlanKey)
    : 'free');
  const planMeta = PLAN_SUMMARY_META[planKey];
  const planTagColor = planMeta.tagColor;
  const collaborationPlanName = getRequiredPlan('collaboration') || 'Pro';
  const apiAccessPlanName = getRequiredPlan('api_access') || 'Pro';
  const dataHistoryLabel =
    planMeta.dataHistoryDays < 0 ? 'Multi-year' : `${planMeta.dataHistoryDays} days`;
  const includedSeatsLabel =
    planMeta.includedSeats < 0 ? 'Custom team seats' : `${planMeta.includedSeats} seats included`;
  const hasCollaboration = hasFeature('collaboration');
  const hasApiAccess = hasFeature('api_access');
  const formatStorageValue = (gbValue: number) => {
    if (!Number.isFinite(gbValue)) return '0 GB';
    const safeValue = Math.max(gbValue, 0);
    return safeValue >= 10 ? `${safeValue.toFixed(0)} GB` : `${safeValue.toFixed(1)} GB`;
  };
  const collaborationTooltip = hasCollaboration
    ? undefined
    : `Team collaboration requires the ${collaborationPlanName} plan.`;
  const apiAccessTooltip = hasApiAccess
    ? undefined
    : `API access requires the ${apiAccessPlanName} plan.`;

  const planUpgradeCTA = useCallback(() => {
    router.push('/billing');
  }, [router]);

  const handleManageTeamClick = useCallback(() => {
    if (hasCollaboration) {
      router.push('/team');
      return;
    }
    showUpgradePrompt('collaboration', `Team collaboration requires the ${collaborationPlanName} plan.`);
  }, [hasCollaboration, router, showUpgradePrompt, collaborationPlanName]);

  const renderPlanStat = (title: string, value: string, percent: number) => (
    <Col xs={24} md={8} key={title}>
      <Card size="small" bordered={false} className="plan-stat-card">
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>{title}</Text>
          <Text strong style={{ fontSize: 18 }}>{value}</Text>
          <Progress percent={percent} size="small" showInfo={false} strokeColor="var(--color-brand-primary, #00c2cb)" />
        </Space>
      </Card>
    </Col>
  );

  const filteredTeamMembers = useMemo(() => teamMembers.filter((member) => {
    const matchesSearch =
      !memberSearch ||
      member.username?.toLowerCase().includes(memberSearch.toLowerCase()) ||
      member.email?.toLowerCase().includes(memberSearch.toLowerCase());
    const matchesStatus = memberStatusFilter === 'all' || member.status === memberStatusFilter;
    return matchesSearch && matchesStatus;
  }), [teamMembers, memberSearch, memberStatusFilter]);
  const filteredDataSources = useMemo(() => dataSources.filter((source) => {
    const matchesSearch =
      !dataSourceSearch || source.name?.toLowerCase().includes(dataSourceSearch.toLowerCase());
    const matchesStatus =
      dataSourceStatusFilter === 'all' || source.connection_status === dataSourceStatusFilter;
    return matchesSearch && matchesStatus;
  }), [dataSources, dataSourceSearch, dataSourceStatusFilter]);

  // Load all settings on mount and when user/org changes
  useEffect(() => {
    // Immediately populate profile form with user data from AuthContext when available
    if (user) {
      const userValues = {
        username: user.username || '',
        firstName: user.first_name || user.firstName || '',
        lastName: user.last_name || user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.bio || '',
        website: user.website || '',
        location: user.location || '',
        timezone: user.timezone || 'UTC'
      };
      profileForm.setFieldsValue(userValues);
      console.log('Profile form populated from user context:', userValues);
    }
    loadAllSettings();
  }, [currentOrganization, user]);

  const loadAllSettings = async () => {
    setFetching(true);
    try {
      await Promise.all([
        loadProfile(),
        loadOrganization(),
        loadSecurity(),
        loadNotifications(),
        loadAppearance(),
        loadApiKeys(),
        loadProviderApiKeys(),
        loadAiModelPreference(),
        loadAvailableModels(),
        loadTeamMembers(),
        loadDataSources()
      ]);
    } catch (error) {
      console.error('Error loading settings:', error);
      message.error('Failed to load settings');
    } finally {
      setFetching(false);
    }
  };

  const loadProfile = async () => {
    try {
      const res = await fetch('/users/profile', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const profile = await res.json();
        setUserProfile(profile);
        // Always use API response data, fallback to user context if missing
        const formValues = {
          username: profile.username || user?.username || '',
          firstName: profile.first_name || profile.firstName || user?.first_name || user?.firstName || '',
          lastName: profile.last_name || profile.lastName || user?.last_name || user?.lastName || '',
          email: profile.email || user?.email || '',
          phone: profile.phone || user?.phone || '',
          bio: profile.bio || user?.bio || '',
          website: profile.website || user?.website || '',
          location: profile.location || user?.location || '',
          timezone: profile.timezone || user?.timezone || 'UTC'
        };
        profileForm.setFieldsValue(formValues);
        console.log('Profile loaded from API:', formValues);
        console.log('API response structure:', profile);
      } else {
        // If API fails, at least use user context data
        if (user) {
          profileForm.setFieldsValue({
            username: user.username || '',
            firstName: user.first_name || user.firstName || '',
            lastName: user.last_name || user.lastName || '',
            email: user.email || '',
            phone: user.phone || '',
            bio: user.bio || '',
            website: user.website || '',
            location: user.location || '',
            timezone: user.timezone || 'UTC'
          });
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      // Fallback to user context data on error
      if (user) {
        profileForm.setFieldsValue({
          username: user.username || '',
          firstName: user.first_name || user.firstName || '',
          lastName: user.last_name || user.lastName || '',
          email: user.email || '',
          phone: user.phone || '',
          bio: user.bio || '',
          website: user.website || '',
          location: user.location || '',
          timezone: user.timezone || 'UTC'
        });
      }
    }
  };

  const loadOrganization = async () => {
    // CRITICAL: Initialize form from currentOrganization immediately if available
    if (currentOrganization) {
      console.log('[SettingsPage] Initializing org form from currentOrganization:', currentOrganization);
      orgForm.setFieldsValue({
        name: currentOrganization.name || '',
        description: currentOrganization.description || '',
        website: currentOrganization.website || ''
      });
    }
    
    // Also fetch from API to get latest data
    if (!currentOrganization?.id) {
      console.warn('[SettingsPage] No currentOrganization.id, cannot fetch from API');
      return;
    }
    
    try {
      const res = await fetch(`/api/organizations/${currentOrganization.id}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const org = await res.json();
        console.log('[SettingsPage] Loaded organization from API:', org);
        orgForm.setFieldsValue({
          name: org.name || currentOrganization.name || '',
          description: org.description || currentOrganization.description || '',
          website: org.website || currentOrganization.website || ''
        });
      } else {
        console.warn('[SettingsPage] Failed to load organization from API, using currentOrganization data');
      }
    } catch (error) {
      console.error('[SettingsPage] Failed to load organization:', error);
      // Form already initialized from currentOrganization above
    }
  };

  const loadSecurity = async () => {
    try {
      const res = await fetch('/users/security-settings', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const settings = await res.json();
        setSecuritySettings(settings);
        securityForm.setFieldsValue(settings);
      }
    } catch (error) {
      console.error('Failed to load security settings:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const res = await fetch('/users/notification-settings', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const settings = await res.json();
        setNotificationSettings(settings);
        notificationForm.setFieldsValue(settings);
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  };

  const loadAppearance = async () => {
    try {
      const res = await fetch('/users/appearance-settings', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const settings = await res.json();
        setAppearanceSettings(settings);
        appearanceForm.setFieldsValue(settings);
      }
    } catch (error) {
      console.error('Failed to load appearance settings:', error);
    }
  };

  const loadApiKeys = async () => {
    try {
      const res = await fetch('/users/api-keys', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const keys = await res.json();
        setApiKeys(Array.isArray(keys) ? keys : []);
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
      setApiKeys([]);
    }
  };

  const loadProviderApiKeys = async () => {
    try {
      const res = await fetch('/users/provider-api-keys', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setProviderApiKeys(data.providers || {});
      }
    } catch (error) {
      console.error('Failed to load provider API keys:', error);
      setProviderApiKeys({});
    }
  };

  const loadAiModelPreference = async () => {
    try {
      const res = await fetch('/users/preferences/ai-model', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setAiModelPreference(data.ai_model || '');
      }
    } catch (error) {
      console.error('Failed to load AI model preference:', error);
    }
  };

  const loadAvailableModels = async () => {
    try {
      const res = await fetch('/api/ai/models', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        const modelsList = Array.isArray(data.models) ? data.models : Object.values(data.models || {});
        setAvailableModels(modelsList);
      }
    } catch (error) {
      console.error('Failed to load available models:', error);
      setAvailableModels([]);
    }
  };

  const loadTeamMembers = async () => {
    if (!currentOrganization?.id) return;
    try {
      const res = await fetch(`/api/organizations/${currentOrganization.id}/members`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const members = await res.json();
        setTeamMembers(Array.isArray(members) ? members : []);
      }
    } catch (error) {
      console.error('Failed to load team members:', error);
      setTeamMembers([]);
    }
  };

  const loadDataSources = async () => {
    try {
      const res = await fetch('/data/sources', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setDataSources(data.data_sources || []);
      }
    } catch (error) {
      console.error('Failed to load data sources:', error);
      setDataSources([]);
    }
  };

  // Handlers
  const handleProfileUpdate = async (values: any) => {
    setLoading(true);
    try {
      const payload = {
        username: values.username,
        first_name: values.firstName,
        last_name: values.lastName,
        email: values.email,
        phone: values.phone,
        bio: values.bio,
        website: values.website,
        location: values.location,
        timezone: values.timezone
      };

      const res = await fetch('/users/profile', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        let errorMessage = `Failed to update profile: ${res.status}`;
        try {
          const errorData = await res.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
          try {
            const errorText = await res.text();
            errorMessage = errorText || errorMessage;
          } catch {}
        }
        throw new Error(errorMessage);
      }

      const updated = await res.json();
      // Update form with response data, ensuring all fields are populated
      const updatedValues = {
        username: updated.username || values.username || user?.username || '',
        firstName: updated.first_name || updated.firstName || values.firstName || user?.first_name || user?.firstName || '',
        lastName: updated.last_name || updated.lastName || values.lastName || user?.last_name || user?.lastName || '',
        email: updated.email || values.email || user?.email || '',
        phone: updated.phone || values.phone || user?.phone || '',
        bio: updated.bio || values.bio || user?.bio || '',
        website: updated.website || values.website || user?.website || '',
        location: updated.location || values.location || user?.location || '',
        timezone: updated.timezone || values.timezone || user?.timezone || 'UTC'
      };
      profileForm.setFieldsValue(updatedValues);
      setUserProfile(updated);
      console.log('Profile updated from API response:', updatedValues);

      message.success('Profile updated successfully!');
      setIsEditingProfile(false);
      // Reload to ensure we have the latest data
      await loadProfile();
    } catch (error: any) {
      message.error(error?.message || 'Failed to update profile. Please try again.');
      console.error('Profile update error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOrganizationUpdate = async (values: any) => {
    if (!currentOrganization?.id) {
      message.error('No organization selected');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: values.name,
        description: values.description,
        website: values.website
      };

      const res = await fetch(`/api/organizations/${currentOrganization.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        let errorMessage = `Failed to update organization: ${res.status}`;
        try {
          const errorData = await res.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
          try {
            const errorText = await res.text();
            errorMessage = errorText || errorMessage;
          } catch {}
        }
        throw new Error(errorMessage);
      }

      const updated = await res.json();
      message.success('Organization settings updated successfully!');
      await loadOrganization();
    } catch (error: any) {
      message.error(error?.message || 'Failed to update organization settings. Please try again.');
      console.error('Organization update error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSecurityUpdate = async (values: any) => {
    setLoading(true);
    try {
      const res = await fetch('/users/security-settings', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });

      if (res.ok) {
        message.success('Security settings updated successfully');
        await loadSecurity();
      } else {
        message.error('Failed to update security settings');
      }
    } catch (error) {
      message.error('Error updating security settings');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationUpdate = async (values: any) => {
    setLoading(true);
    try {
      const res = await fetch('/users/notification-settings', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });

      if (res.ok) {
        message.success('Notification settings updated successfully');
        await loadNotifications();
      } else {
        message.error('Failed to update notification settings');
      }
    } catch (error) {
      message.error('Error updating notification settings');
    } finally {
      setLoading(false);
    }
  };

  const handleAppearanceUpdate = async (values: any) => {
    setLoading(true);
    try {
      const res = await fetch('/users/appearance-settings', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });

      if (res.ok) {
        message.success('Appearance settings updated successfully');
        await loadAppearance();
      } else {
        message.error('Failed to update appearance settings');
      }
    } catch (error) {
      message.error('Error updating appearance settings');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApiKey = async (values: any) => {
    if (!hasApiAccess) {
      showUpgradePrompt('api_access', `API keys are available on the ${apiAccessPlanName} plan.`);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/users/api-keys', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: values.name })
      });

      if (res.ok) {
        const data = await res.json();
        message.success('API key created successfully!');
        message.info(`Your API key: ${data.api_key} (Copy it now, it won't be shown again)`);
        apiKeyForm.resetFields();
        await loadApiKeys();
      } else {
        message.error('Failed to create API key');
      }
    } catch (error) {
      message.error('Error creating API key');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteApiKey = async (keyId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/users/api-keys/${keyId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.ok) {
        message.success('API key deleted successfully');
        await loadApiKeys();
      } else {
        message.error('Failed to delete API key');
      }
    } catch (error) {
      message.error('Error deleting API key');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAiModelPreference = async (modelId: string) => {
    setLoading(true);
    try {
      const res = await fetch('/users/preferences/ai-model', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai_model: modelId })
      });
      if (res.ok) {
        message.success('AI model preference updated!');
        setAiModelPreference(modelId);
      } else {
        message.error('Failed to update AI model preference');
      }
    } catch (error) {
      message.error('Error updating AI model preference');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProviderApiKey = async (provider: string, apiKey: string) => {
    setLoading(true);
    try {
      const res = await fetch('/users/provider-api-keys', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, api_key: apiKey })
      });
      if (res.ok) {
        message.success(`${provider.toUpperCase()} API key saved successfully!`);
        loadProviderApiKeys();
        setShowProviderKeyModal(false);
        setEditingProvider(null);
        providerKeyForm.resetFields();
      } else {
        message.error(`Failed to save ${provider.toUpperCase()} API key`);
      }
    } catch (error) {
      message.error(`Error saving ${provider.toUpperCase()} API key`);
    } finally {
      setLoading(false);
    }
  };

  // Table columns
  const apiKeyColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: 'Key',
      dataIndex: 'key_preview',
      key: 'key_preview',
      render: (text: string, record: any) => (
        <Space>
          <Text code>{showApiKey[record.id] ? record.api_key || text : text}</Text>
          <Button
            type="text"
            size="small"
            icon={showApiKey[record.id] ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            onClick={() => setShowApiKey({ ...showApiKey, [record.id]: !showApiKey[record.id] })}
          />
        </Space>
      )
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => date ? new Date(date).toLocaleDateString() : 'N/A'
    },
    {
      title: 'Last Used',
      dataIndex: 'last_used',
      key: 'last_used',
      render: (date: string) => date ? new Date(date).toLocaleDateString() : 'Never'
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'red'}>{active ? 'Active' : 'Inactive'}</Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
          <Popconfirm
            title="Are you sure you want to delete this API key?"
          onConfirm={() => handleDeleteApiKey(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
      )
    }
  ];

  const teamMemberColumns = [
    {
      title: 'User',
      key: 'user',
      render: (record: any) => (
        <Space>
          <Text strong>{record.name || record.username || record.email}</Text>
            <Text type="secondary">{record.email}</Text>
        </Space>
      )
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={role === 'owner' ? 'gold' : role === 'admin' ? 'red' : 'blue'}>
          {role?.toUpperCase() || 'MEMBER'}
        </Tag>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Badge
          status={status === 'active' ? 'success' : status === 'invited' ? 'processing' : 'default'}
          text={status?.toUpperCase() || 'UNKNOWN'}
        />
      )
    },
    {
      title: 'Joined',
      dataIndex: 'joined_at',
      key: 'joined_at',
      render: (date: string) => date ? new Date(date).toLocaleDateString() : 'N/A'
    }
  ];

  const dataSourceColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: any) => (
        <Space>
          <DatabaseOutlined />
          <Text strong>{text || record.data_source_name || 'Unnamed'}</Text>
        </Space>
      )
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'database' ? 'blue' : type === 'file' ? 'green' : type === 'warehouse' ? 'purple' : 'orange'}>
          {type?.toUpperCase() || 'UNKNOWN'}
        </Tag>
      )
    },
    {
      title: 'Status',
      dataIndex: 'connection_status',
      key: 'connection_status',
      render: (status: string) => (
        <Badge
          status={status === 'connected' ? 'success' : status === 'failed' ? 'error' : 'processing'}
          text={status?.toUpperCase() || 'UNKNOWN'}
        />
      )
    },
    {
      title: 'Last Accessed',
      dataIndex: 'last_accessed',
      key: 'last_accessed',
      render: (date: string) => date ? new Date(date).toLocaleDateString() : 'Never'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => router.push(`/data?edit=${record.id}`)}>
            Edit
          </Button>
          <Popconfirm
            title="Are you sure you want to delete this data source?"
            onConfirm={async () => {
              try {
                const res = await fetch(`/data/sources/${record.id}`, {
                  method: 'DELETE',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json' }
                });
                if (res.ok) {
                  message.success('Data source deleted successfully');
                  await loadDataSources();
                } else {
                  message.error('Failed to delete data source');
                }
              } catch (error) {
                message.error('Error deleting data source');
              }
            }}
            okText="Yes"
            cancelText="No"
          >
            <Button type="text" danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  if (fetching) {
    return (
      <div className="page-wrapper">
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

    return (
      <div className="page-wrapper" style={{ paddingLeft: '24px', paddingRight: '24px', paddingTop: '24px', paddingBottom: '24px' }}>
        <div className="page-header" style={{ marginBottom: '24px' }}>
          <Title level={2} className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <SettingOutlined style={{ color: 'var(--ant-color-primary)', fontSize: '24px' }} />
            Settings
          </Title>
          <Text type="secondary" className="page-description" style={{ marginTop: '4px', marginBottom: '0' }}>
            Manage your account, organization, and application preferences
          </Text>
        </div>
        <div className="page-body">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card className="stat-card">
              <Statistic title="Team Members" value={overviewStats.members} />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="stat-card">
              <Statistic title="Active Members" value={overviewStats.activeMembers} valueStyle={{ color: 'var(--ant-color-success)' }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="stat-card">
              <Statistic title="Data Sources" value={overviewStats.dataSources} valueStyle={{ color: 'var(--ant-color-primary)' }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="stat-card">
              <Statistic title="API Keys" value={overviewStats.apiKeys} valueStyle={{ color: 'var(--ant-color-warning)' }} />
            </Card>
          </Col>
        </Row>

          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Tabs
            className="page-tabs"
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'profile',
                label: (
                  <span>
                <UserOutlined /> Profile
                  </span>
                ),
                children: (
              <Card
                title={
                  <Space>
                    <UserOutlined />
                    <span>Personal Information</span>
                  </Space>
                }
                extra={
                  !isEditingProfile ? (
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      onClick={() => setIsEditingProfile(true)}
                    >
                      Edit
                    </Button>
                  ) : (
                    <Space>
                      <Button onClick={() => { setIsEditingProfile(false); profileForm.resetFields(); }}>
                        Cancel
                      </Button>
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        loading={loading}
                        onClick={() => profileForm.submit()}
                      >
                        Save
                      </Button>
                    </Space>
                  )
                }
                className="content-card"
              >
                    <Form
                      form={profileForm}
                      layout="vertical"
                      onFinish={handleProfileUpdate}
                  disabled={!isEditingProfile}
                  initialValues={{
                    username: user?.username || '',
                    firstName: user?.first_name || user?.firstName || '',
                    lastName: user?.last_name || user?.lastName || '',
                    email: user?.email || '',
                    phone: user?.phone || '',
                    bio: user?.bio || '',
                    website: user?.website || '',
                    location: user?.location || '',
                    timezone: user?.timezone || 'UTC'
                  }}
                >
                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                          <Form.Item
                            name="username"
                            label="Username"
                        rules={[{ required: true, message: 'Please enter your username' }]}
                          >
                        <Input prefix={<UserOutlined />} placeholder="Username" size="large" />
                          </Form.Item>
                        </Col>
                    <Col xs={24} sm={12}>
                          <Form.Item
                            name="email"
                        label="Email Address"
                            rules={[
                          { required: true, message: 'Please enter your email' },
                          { type: 'email', message: 'Please enter a valid email' }
                            ]}
                          >
                        <Input prefix={<MailOutlined />} placeholder="Email Address" size="large" />
                          </Form.Item>
                        </Col>
                      </Row>

                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                          <Form.Item
                        name="firstName"
                        label="First Name"
                        rules={[{ required: true, message: 'Please enter your first name' }]}
                      >
                        <Input prefix={<UserOutlined />} placeholder="First Name" size="large" />
                          </Form.Item>
                        </Col>
                    <Col xs={24} sm={12}>
                          <Form.Item
                        name="lastName"
                        label="Last Name"
                        rules={[{ required: true, message: 'Please enter your last name' }]}
                          >
                        <Input prefix={<UserOutlined />} placeholder="Last Name" size="large" />
                          </Form.Item>
                        </Col>
                      </Row>

                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Form.Item name="phone" label="Phone Number">
                        <Input prefix={<PhoneOutlined />} placeholder="Phone Number" size="large" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item name="bio" label="Bio">
                    <TextArea
                      rows={4}
                      placeholder="Tell us about yourself..."
                      maxLength={500}
                      showCount
                      size="large"
                    />
                  </Form.Item>

                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Form.Item name="website" label="Website">
                        <Input prefix={<GlobalOutlined />} placeholder="https://yourwebsite.com" size="large" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="location" label="Location">
                        <Input placeholder="City, Country" size="large" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item name="timezone" label="Timezone">
                    <Select
                      placeholder="Select timezone"
                      size="large"
                      showSearch
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                      options={[
                        { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
                        { value: 'America/New_York', label: 'EST (Eastern Time)' },
                        { value: 'America/Chicago', label: 'CST (Central Time)' },
                        { value: 'America/Denver', label: 'MST (Mountain Time)' },
                        { value: 'America/Los_Angeles', label: 'PST (Pacific Time)' },
                        { value: 'Europe/London', label: 'GMT (Greenwich Mean Time)' },
                        { value: 'Europe/Paris', label: 'CET (Central European Time)' },
                        { value: 'Asia/Tokyo', label: 'JST (Japan Standard Time)' },
                        { value: 'Asia/Shanghai', label: 'CST (China Standard Time)' },
                        { value: 'Asia/Dubai', label: 'GST (Gulf Standard Time)' }
                      ]}
                    />
                      </Form.Item>
                    </Form>
                  </Card>
                )
              },
              {
                key: 'organization',
                label: (
                  <span>
                <TeamOutlined /> Organization
                  </span>
                ),
                children: (
              <Card
                title={
                  <Space>
                    <TeamOutlined />
                    <span>Organization Settings</span>
                  </Space>
                }
                className="content-card"
              >
                {!currentOrganization ? (
                  <Card>
                    <Alert
                      message="Organization Not Loaded"
                      description="Your organization information is being loaded. Please wait a moment and refresh the page if this persists."
                      type="info"
                      showIcon
                      action={
                        <Button size="small" onClick={() => window.location.reload()}>
                          Refresh Page
                        </Button>
                      }
                    />
                  </Card>
                ) : (
                  <>
                    <Form form={orgForm} layout="vertical" onFinish={handleOrganizationUpdate}>
                      <Row gutter={16}>
                        <Col xs={24} sm={12}>
                          <Form.Item
                            name="name"
                            label="Organization Name"
                            rules={[{ required: true, message: 'Please enter organization name' }]}
                          >
                            <Input placeholder="Organization Name" size="large" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                          <Form.Item name="website" label="Website">
                            <Input prefix={<GlobalOutlined />} placeholder="https://yourwebsite.com" size="large" />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Form.Item name="description" label="Description">
                        <TextArea
                          rows={4}
                          placeholder="Tell us about your organization..."
                          maxLength={500}
                          showCount
                          size="large"
                        />
                      </Form.Item>

                      {planUsage && (
                        <div
                          style={{
                            marginBottom: 24,
                            padding: 20,
                            borderRadius: 16,
                            border: '1px solid var(--ant-color-border)',
                            background: 'var(--layout-panel-background, var(--ant-color-bg-container))'
                          }}
                        >
                          <Row justify="space-between" align="middle" gutter={[12, 12]}>
                            <Col xs={24} md={12}>
                              <Space size={8} wrap>
                                <Text type="secondary">Current Plan</Text>
                                <Tag color={planTagColor}>{planUsage.planLabel}</Tag>
                              </Space>
                            </Col>
                            <Col xs={24} md={12} style={{ textAlign: 'right' }}>
                              <Space size={8} wrap>
                                <Text type="secondary">Need more capacity?</Text>
                                <Button
                                  type="primary"
                                  icon={<ArrowUpOutlined />}
                                  onClick={planUpgradeCTA}
                                >
                                  Manage Plan
                                </Button>
                              </Space>
                            </Col>
                          </Row>
                          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                            {renderPlanStat(
                              'AI Credits',
                              planUsage.ai.limit > 0
                                ? `${planUsage.ai.used} / ${planUsage.ai.limit}`
                                : `${planUsage.ai.used} used`,
                              planUsage.ai.percent
                            )}
                            {renderPlanStat(
                              'Storage',
                              planUsage.storage.limit > 0
                                ? `${formatStorageValue(planUsage.storage.used)} / ${formatStorageValue(planUsage.storage.limit)}`
                                : `${formatStorageValue(planUsage.storage.used)} used`,
                              planUsage.storage.percent
                            )}
                            {renderPlanStat(
                              'Projects',
                              planUsage.projects.limit > 0
                                ? `${planUsage.projects.used} / ${planUsage.projects.limit}`
                                : `${planUsage.projects.used} active`,
                              planUsage.projects.percent
                            )}
                          </Row>
                          <Divider style={{ margin: '16px 0' }} />
                          <Row gutter={[16, 16]}>
                            <Col xs={24} md={12}>
                              <Space direction="vertical" size={2}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Data history window</Text>
                                <Text strong>{dataHistoryLabel}</Text>
                              </Space>
                            </Col>
                            <Col xs={24} md={12}>
                              <Space direction="vertical" size={2}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Included seats</Text>
                                <Text strong>{includedSeatsLabel}</Text>
                              </Space>
                            </Col>
                          </Row>
                        </div>
                      )}

                      <Form.Item>
                        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading} size="large">
                          Save Changes
                        </Button>
                      </Form.Item>
                    </Form>
                  </>
                )}
                        </Card>
                )
              },
              {
                key: 'security',
                label: (
                  <span>
                <SecurityScanOutlined /> Security
                  </span>
                ),
                children: (
              <Card
                title={
                  <Space>
                    <SecurityScanOutlined />
                    <span>Security Settings</span>
                  </Space>
                }
                className="content-card"
              >
                <Form form={securityForm} layout="vertical" onFinish={handleSecurityUpdate}>
                      <Form.Item
                        name="two_factor_enabled"
                        label="Two-Factor Authentication"
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>

                      <Form.Item
                        name="session_timeout"
                        label="Session Timeout (minutes)"
                    tooltip="Automatically log out after inactivity"
                      >
                        <Slider
                          min={15}
                          max={480}
                          marks={{
                            15: '15m',
                            60: '1h',
                            240: '4h',
                            480: '8h'
                          }}
                        />
                      </Form.Item>

                  <Form.Item
                    name="api_access_enabled"
                    label="API Access"
                    valuePropName="checked"
                    tooltip="Enable API access for this account"
                    extra={!hasApiAccess ? `Available on ${apiAccessPlanName} plans and above.` : undefined}
                  >
                    <Switch disabled={!hasApiAccess} />
                  </Form.Item>
                  {!hasApiAccess && (
                    <Button
                      type="link"
                      icon={<ArrowUpOutlined />}
                      onClick={() =>
                        showUpgradePrompt(
                          'api_access',
                          `API access requires the ${apiAccessPlanName} plan.`
                        )
                      }
                      style={{ paddingLeft: 0 }}
                    >
                      Upgrade to unlock API access
                    </Button>
                  )}

                      <Form.Item>
                    <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading} size="large">
                          Save Changes
                    </Button>
                      </Form.Item>
                    </Form>
                  </Card>
                )
              },
              {
            key: 'notifications',
                label: (
                  <span>
                <BellOutlined /> Notifications
                  </span>
                ),
                children: (
                  <Card
                title={
                  <Space>
                    <BellOutlined />
                    <span>Notification Preferences</span>
                  </Space>
                }
                className="content-card"
              >
                <Form form={notificationForm} layout="vertical" onFinish={handleNotificationUpdate}>
                  <Row gutter={24}>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="email_notifications"
                        label="Email Notifications"
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="dashboard_updates"
                        label="Dashboard Updates"
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={24}>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="data_source_alerts"
                        label="Data Source Alerts"
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="team_invites" label="Team Invites" valuePropName="checked">
                        <Switch />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={24}>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="system_maintenance"
                        label="System Maintenance"
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="marketing_emails" label="Marketing Emails" valuePropName="checked">
                        <Switch />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item>
                    <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading} size="large">
                      Save Changes
                    </Button>
                  </Form.Item>
                </Form>
              </Card>
            )
          },
          {
            key: 'appearance',
            label: (
              <span>
                <GlobalOutlined /> Appearance
              </span>
            ),
            children: (
              <Card
                title={
                  <Space>
                    <GlobalOutlined />
                    <span>Appearance Settings</span>
                  </Space>
                }
                className="content-card"
              >
                <Form form={appearanceForm} layout="vertical" onFinish={handleAppearanceUpdate}>
                  <Alert
                    message="Theme Setting"
                    description="Use the theme toggle in the header to switch between light and dark mode. This setting is synced automatically."
                    type="info"
                    showIcon
                    style={{ marginBottom: '24px' }}
                  />
                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Form.Item name="language" label="Language">
                        <Select size="large" options={[
                          { value: 'en', label: 'English' },
                          { value: 'es', label: 'Spanish' },
                          { value: 'fr', label: 'French' },
                          { value: 'de', label: 'German' },
                          { value: 'zh', label: 'Chinese' },
                          { value: 'ja', label: 'Japanese' }
                        ]} />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item name="font_size" label="Font Size">
                    <Slider min={12} max={18} marks={{ 12: '12px', 14: '14px', 16: '16px', 18: '18px' }} />
                  </Form.Item>

                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Form.Item name="compact_mode" label="Compact Mode" valuePropName="checked">
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="sidebar_collapsed" label="Sidebar Collapsed" valuePropName="checked">
                        <Switch />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item>
                    <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading} size="large">
                      Save Changes
                    </Button>
                  </Form.Item>
                </Form>
              </Card>
            )
          },
          {
            key: 'api-keys',
            label: (
              <span>
                <KeyOutlined /> API Keys
              </span>
            ),
            children: (
              <Card
                title={
                  <Space>
                    <KeyOutlined />
                    <span>API Keys & AI Configuration</span>
                  </Space>
                }
                className="content-card"
              >
                <Divider orientation="left">AI Model Preference</Divider>
                <Space direction="vertical" style={{ width: '100%', marginBottom: '24px' }}>
                  <Text type="secondary" style={{ marginBottom: '8px', display: 'block' }}>
                    Select your preferred AI model for queries. This preference will be used across all your AI-powered features.
                  </Text>
                  <Select
                    value={aiModelPreference}
                    onChange={handleSaveAiModelPreference}
                    style={{ width: '100%', maxWidth: '400px' }}
                    size="large"
                    placeholder="Select AI Model"
                    loading={availableModels.length === 0}
                  >
                    {availableModels.map((model: any) => (
                      <Option key={model.id} value={model.id} disabled={!model.available}>
                        <Space>
                          <Tag color={model.provider === 'azure' ? 'blue' : model.provider === 'openai' ? 'green' : 'default'}>
                            {model.provider?.toUpperCase() || 'Provider'}
                          </Tag>
                          <span>{model.name || model.id}</span>
                          {!model.available && (
                            <Tag color="red" style={{ marginLeft: '8px' }}>API Key Required</Tag>
                          )}
                        </Space>
                      </Option>
                    ))}
                  </Select>
                  {aiModelPreference && (
                    <Alert
                      message={`Current Model: ${availableModels.find((m: any) => m.id === aiModelPreference)?.name || aiModelPreference}`}
                      type="info"
                      showIcon
                      style={{ marginTop: '8px' }}
                    />
                  )}
                </Space>

                <Divider orientation="left">AI Provider API Keys</Divider>
                <Alert
                  message="Secure API Key Storage"
                  description="Your provider API keys are encrypted at rest and only used to access AI services. Never share your API keys with anyone."
                  type="info"
                  showIcon
                  style={{ marginBottom: '16px' }}
                />
                <Space direction="vertical" style={{ width: '100%', marginBottom: '24px' }}>
                  {['openai', 'azure', 'anthropic'].map((provider) => {
                    const hasKey = providerApiKeys[provider]?.has_key || false;
                    const keyPreview = providerApiKeys[provider]?.key_preview || '';
                    return (
                      <Card key={provider} size="small" style={{ marginBottom: '8px' }}>
                        <Row justify="space-between" align="middle">
                          <Col>
                            <Space>
                              <Tag color={provider === 'azure' ? 'blue' : provider === 'openai' ? 'green' : 'purple'}>
                                {provider.toUpperCase()}
                              </Tag>
                              {hasKey ? (
                                <Space>
                                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                                  <Text type="secondary" code>
                                    {keyPreview || '••••••••••••'}
                                  </Text>
                                  <Text type="secondary" style={{ fontSize: '12px' }}>
                                    Encrypted
                                  </Text>
                                </Space>
                              ) : (
                                <Text type="secondary">No API key configured</Text>
                              )}
                            </Space>
                          </Col>
                          <Col>
                            <Button
                              type={hasKey ? 'default' : 'primary'}
                              size="small"
                              onClick={() => {
                                setEditingProvider(provider);
                                setShowProviderKeyModal(true);
                              }}
                            >
                              {hasKey ? 'Update' : 'Add'} API Key
                            </Button>
                          </Col>
                        </Row>
                      </Card>
                    );
                  })}
                </Space>

                <Divider orientation="left">Aicser Platform API Keys</Divider>
                <Text type="secondary" style={{ marginBottom: '16px', display: 'block' }}>
                  Generate API keys to access Aicser platform APIs programmatically.
                </Text>
                <Form form={apiKeyForm} layout="inline" onFinish={handleCreateApiKey} style={{ marginBottom: '16px' }}>
                  <Form.Item
                    name="name"
                    rules={[{ required: true, message: 'Please enter API key name' }]}
                    style={{ flex: 1, marginRight: '8px', maxWidth: '300px' }}
                  >
                    <Input placeholder="API Key Name (e.g., 'Production', 'Development')" size="large" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" icon={<PlusOutlined />} loading={loading} size="large">
                      Create API Key
                    </Button>
                  </Form.Item>
                </Form>

                    <Table
                      columns={apiKeyColumns}
                      dataSource={apiKeys}
                      rowKey="id"
                      pagination={false}
                  locale={{ emptyText: <Empty description="No API keys created yet" /> }}
                    />
                  </Card>
                )
              },
              {
                key: 'team',
                label: (
                  <span>
                <TeamOutlined /> Team
                  </span>
                ),
                children: (
                  <Card
                title={
                  <Space>
                    <TeamOutlined />
                    <span>Team Members</span>
                  </Space>
                }
                extra={
                  <Tooltip title={collaborationTooltip} placement="bottomRight">
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleManageTeamClick}
                    >
                      Manage Team
                    </Button>
                  </Tooltip>
                }
                className="content-card"
                  >
                    <div className="page-toolbar" style={{ flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                      <Space size={12} wrap>
                        <Input
                          allowClear
                          prefix={<SearchOutlined />}
                          placeholder="Search team members"
                          value={memberSearch}
                          onChange={(e) => setMemberSearch(e.target.value)}
                          style={{ width: 220 }}
                        />
                        <Segmented
                          value={memberStatusFilter}
                          onChange={(value) => setMemberStatusFilter(value as typeof memberStatusFilter)}
                          options={[
                            { label: 'All', value: 'all' },
                            { label: 'Active', value: 'active' },
                            { label: 'Invited', value: 'invited' },
                            { label: 'Inactive', value: 'inactive' },
                          ]}
                        />
                      </Space>
                      <Button type="link" icon={<ReloadOutlined />} onClick={loadTeamMembers}>
                        Refresh
                      </Button>
                    </div>
                    <Table
                      columns={teamMemberColumns}
                      dataSource={filteredTeamMembers}
                  rowKey="id"
                      pagination={false}
                  locale={{ emptyText: <Empty description="No team members" /> }}
                    />
                  </Card>
                )
              },
              {
                key: 'data-sources',
                label: (
                  <span>
                <DatabaseOutlined /> Data Sources
                  </span>
                ),
                children: (
              <Card
                title={
                  <Space>
                    <DatabaseOutlined />
                    <span>Data Sources</span>
                  </Space>
                }
                className="content-card"
              >
                    <div className="page-toolbar" style={{ flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                      <Space size={12} wrap>
                        <Input
                          allowClear
                          prefix={<SearchOutlined />}
                          placeholder="Search data sources"
                          value={dataSourceSearch}
                          onChange={(e) => setDataSourceSearch(e.target.value)}
                          style={{ width: 220 }}
                        />
                        <Segmented
                          value={dataSourceStatusFilter}
                          onChange={(value) => setDataSourceStatusFilter(value as typeof dataSourceStatusFilter)}
                          options={[
                            { label: 'All', value: 'all' },
                            { label: 'Connected', value: 'connected' },
                            { label: 'Failed', value: 'failed' },
                            { label: 'Pending', value: 'pending' },
                          ]}
                        />
                      </Space>
                      <Button type="link" icon={<ReloadOutlined />} onClick={loadDataSources}>
                        Refresh
                      </Button>
                    </div>
                    <Table
                      columns={dataSourceColumns}
                      dataSource={filteredDataSources}
                      rowKey="id"
                      pagination={false}
                  locale={{ emptyText: <Empty description="No data sources" /> }}
                    />
                  </Card>
                )
              }
            ]}
          />
          </div>
        </div>
        <UpgradeModal />
        {/* Provider API Key Modal */}
        <Modal
        title={`Configure ${editingProvider?.toUpperCase()} API Key`}
        open={showProviderKeyModal}
        onCancel={() => {
          setShowProviderKeyModal(false);
          setEditingProvider(null);
        }}
        footer={null}
        width={500}
      >
        <Form
          form={providerKeyForm}
          layout="vertical"
          onFinish={(values) => {
            if (editingProvider) {
              handleSaveProviderApiKey(editingProvider, values.api_key);
            }
          }}
        >
          <Alert
            message="Security Notice"
            description="Your API key will be encrypted and stored securely. It will only be used to access AI services on your behalf."
            type="warning"
            showIcon
            style={{ marginBottom: '16px' }}
          />
          <Form.Item
            name="api_key"
            label="API Key"
            rules={[
              { required: true, message: 'Please enter your API key' },
              { min: 20, message: 'API key must be at least 20 characters' }
            ]}
          >
            <Input.Password
              placeholder={`Enter your ${editingProvider?.toUpperCase()} API key`}
              size="large"
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
              >
                Save & Encrypt
              </Button>
              <Button onClick={() => {
                setShowProviderKeyModal(false);
                setEditingProvider(null);
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
        </Modal>
      </div>
    );
};

export default SettingsPage;
