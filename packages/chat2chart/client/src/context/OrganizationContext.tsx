'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { fetchApi } from '@/utils/api';
import { getBackendUrlForApi } from '@/utils/backendUrl';
import { installWatermarkPlugin, updateWatermarkPlanType } from '@/utils/echartsWatermarkPlugin';

// Types
export interface Organization {
  id: number;
  name: string;
  description?: string;
  website?: string;
  plan_type: 'free' | 'pro' | 'team' | 'enterprise';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  organization_id: number;
  status: 'active' | 'archived' | 'deleted';
  created_at: string;
  updated_at: string;
}

export interface UsageStats {
  organization_id: number;
  ai_queries_used: number;
  ai_queries_limit: number;
  ai_credits_used?: number;  // Legacy field name support
  ai_credits_limit?: number; // Legacy field name support
  storage_used_mb: number;
  storage_limit_mb: number;
  projects_count: number;
  projects_limit: number;
  data_sources_count: number;
  data_sources_limit: number;
  seats_used: number;
  seats_limit: number;
  data_history_days: number;
}

export interface PricingPlan {
  id: number;
  name: string;
  plan_type: 'free' | 'pro' | 'team' | 'enterprise';
  price: number;
  currency: string;
  features: string[];
  ai_queries_limit: number;
  storage_limit_mb: number;
  projects_limit: number;
}

interface OrganizationContextType {
  // State
  currentOrganization: Organization | null;
  organizations: Organization[];
  projects: Project[];
  usageStats: UsageStats | null;
  pricingPlans: PricingPlan[];
  loading: boolean;
  error: string | null;

  // Actions
  setCurrentOrganization: (org: Organization | null) => void;
  createOrganization: (data: { name: string; description?: string; website?: string }) => Promise<Organization>;
  updateOrganization: (orgId: number, data: any) => Promise<Organization>;
  getOrganizations: () => Promise<void>;
  getProjects: (orgId?: number) => Promise<void>;
  getOrganizationUsage: (orgId: number) => Promise<void>;
  getPricingPlans: () => Promise<void>;
  clearError: () => void;
  clear: () => void; // Clear all organization state (for logout)
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};

interface OrganizationProviderProps {
  children: ReactNode;
}

export const OrganizationProvider: React.FC<OrganizationProviderProps> = ({ children }) => {
  const { user, isAuthenticated, authLoading: loading } = useAuth();
  
  // State
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);
  const [error, setError] = useState<string | null>(null);

  // CRITICAL: Install watermark plugin early (client-side only)
  // This ensures the preprocessor is registered before any charts are created
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Install plugin immediately on client-side mount
      installWatermarkPlugin(currentOrganization?.plan_type);
      console.log('✅ Watermark plugin installed in OrganizationProvider');
    }
  }, []); // Only run once on mount

  // Update watermark plan type when organization changes
  useEffect(() => {
    if (currentOrganization) {
      updateWatermarkPlanType(currentOrganization.plan_type);
      console.log('✅ Watermark plan type updated:', currentOrganization.plan_type);
    }
  }, [currentOrganization?.plan_type]);

  useEffect(() => {
    if (user) {
      // Add a small delay to ensure authentication cookies are properly set
      const timer = setTimeout(() => {
        loadInitialData();
      }, 150); // slight delay
      
      return () => clearTimeout(timer);
    } else if (!loading && !isAuthenticated) {
      // Clear organization state when user logs out
      clear();
    }
  }, [loading, isAuthenticated, user]);

  const loadInitialData = async () => {
    try {
      await Promise.all([
        getOrganizations(),
        getPricingPlans(),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load initial data');
    }
  };

  const getOrganizations = async () => {
    try {
      // Call the real API to get organizations with proper authentication
      const response = await fetchApi('api/organizations', { method: 'GET' });
      if (response.ok) {
        const orgs = await response.json();
        // Log the raw response for debugging
        console.log('[OrganizationContext] Raw organizations response:', orgs);
        
        // Ensure plan_type is included in each organization
        // CRITICAL: Only default to 'free' if plan_type is truly missing (null/undefined/empty)
        // Do NOT override a valid plan_type from the backend
        const orgsWithPlan = Array.isArray(orgs) ? orgs.map((org: any) => {
          const processed = {
            ...org,
            // Only set default if plan_type is missing, null, undefined, or empty string
            plan_type: (org.plan_type && org.plan_type.trim() !== '') 
              ? org.plan_type 
              : (org.planType && org.planType.trim() !== '') 
                ? org.planType 
                : 'free' // Only default if truly missing
          };
          console.log(`[OrganizationContext] Processed org ${processed.id}: plan_type=${processed.plan_type}, name=${processed.name}`);
          return processed;
        }) : [];
        
        console.log('[OrganizationContext] Processed organizations:', orgsWithPlan);
        setOrganizations(orgsWithPlan);

        // Set the first organization as current (or find by user's organization)
        if (orgsWithPlan.length > 0) {
          const selectedOrg = orgsWithPlan[0];
          console.log('[OrganizationContext] Setting current organization:', selectedOrg);
          console.log('[OrganizationContext] Selected org plan_type:', selectedOrg.plan_type);
          setCurrentOrganization(selectedOrg);
          // Load projects for the current organization
          await getProjects(orgsWithPlan[0].id);
          // Load usage stats for the current organization
          await getOrganizationUsage(orgsWithPlan[0].id);
        } else {
          console.warn('[OrganizationContext] No organizations found for user');
          setCurrentOrganization(null);
        }
        return;
      }
      // If proxy returned non-ok, throw to trigger fallback
      throw new Error(`Proxy response: ${response.status}`);
    } catch (err) {
      console.warn('Error fetching organizations via proxy, attempting direct backend fallback:', err);
      try {
        // Try direct backend fetch as a fallback (useful for mixed dev/container setups)
        const backend = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
        const direct = await fetch(`${backend.replace(/\/$/, '')}/api/organizations`, { method: 'GET', credentials: 'include' });
        if (direct.ok) {
          const orgs = await direct.json();
          console.log('[OrganizationContext] Direct backend fallback response:', orgs);
          // Ensure plan_type is included in each organization
          // CRITICAL: Only default to 'free' if plan_type is truly missing
          const orgsWithPlan = Array.isArray(orgs) ? orgs.map((org: any) => {
            const processed = {
              ...org,
              plan_type: (org.plan_type && org.plan_type.trim() !== '') 
                ? org.plan_type 
                : (org.planType && org.planType.trim() !== '') 
                  ? org.planType 
                  : 'free' // Only default if truly missing
            };
            console.log(`[OrganizationContext] Direct fallback - Processed org ${processed.id}: plan_type=${processed.plan_type}`);
            return processed;
          }) : [];
          setOrganizations(orgsWithPlan);
          if (orgsWithPlan.length > 0) {
            const selectedOrg = orgsWithPlan[0];
            console.log('[OrganizationContext] Direct fallback - Setting current organization:', selectedOrg);
            console.log('[OrganizationContext] Direct fallback - Selected org plan_type:', selectedOrg.plan_type);
            setCurrentOrganization(selectedOrg);
            await getProjects(orgsWithPlan[0].id);
            await getOrganizationUsage(orgsWithPlan[0].id);
          } else {
            console.warn('[OrganizationContext] Direct fallback - No organizations found');
            setCurrentOrganization(null);
          }
          return;
        }
        console.warn('Direct backend fetch failed', direct.status);
      } catch (e2) {
        console.error('Direct backend fallback also failed', e2);
      }
      // Don't set a default organization if API fails - let components handle the null state
      // Setting a fake organization causes permission errors when trying to access it
      console.warn('Failed to load organizations - components should handle null organization state');
      setOrganizations([]);
      setCurrentOrganization(null);
    }
  };

  const getProjects = async (orgId?: number) => {
    try {
      // Call the real API to get projects with proper authentication
      const response = await fetchApi('api/projects?user_id=default', { method: 'GET' });
      if (response.ok) {
        const data = await response.json();
        setProjects(data.items || []);
        return;
      }
      throw new Error(`Proxy response: ${response.status}`);
    } catch (err) {
      console.warn('Error fetching projects via proxy, attempting direct backend fallback', err);
      try {
        const backend = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
        const direct = await fetch(`${backend.replace(/\/$/, '')}/api/projects?user_id=default`, { method: 'GET', credentials: 'include' });
        if (direct.ok) {
          const data = await direct.json();
          setProjects(data.items || []);
          return;
        }
        console.warn('Direct fetch projects failed', direct.status);
      } catch (e2) {
        console.error('Direct projects fallback failed', e2);
      }
      // Fallback to default project if API fails
      const defaultProject: Project = {
        id: 1,
        name: 'Data Analysis Project',
        description: 'Your main data analysis project',
        organization_id: orgId || 1,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setProjects([defaultProject]);
    }
  };

  const getOrganizationUsage = async (orgId: number) => {
    try {
      // Call the real API to get usage stats
      const response = await fetchApi(`api/organizations/${orgId}/usage`, { method: 'GET' });
      if (response.ok) {
        const usage = await response.json();
        const limits = usage.limits || {};
        const usageMetrics = usage.usage || {};
        const storageLimitGb = limits.storage_limit_gb ?? 0;

        const dataSourcesLimit = limits.max_data_sources ?? 0;
        const dataSourcesUsed = usageMetrics.data_sources_used ?? 0;
        const projectsLimit = limits.max_projects ?? 0;
        const projectsUsed = usageMetrics.projects_used ?? 0;
        const seatsLimit = limits.max_users ?? limits.included_seats ?? 0;
        const seatsUsed = usageMetrics.active_users ?? 0;
        const dataHistoryDays = limits.data_history_days ?? 7;

        const transformedUsage: UsageStats = {
          organization_id: orgId,
          ai_queries_used: usageMetrics.ai_credits_used ?? limits.ai_credits_used ?? 0,
          ai_queries_limit: limits.ai_credits_limit ?? 0,
          storage_used_mb: (usageMetrics.storage_used_gb ?? 0) * 1024,
          storage_limit_mb: storageLimitGb > 0 ? storageLimitGb * 1024 : storageLimitGb,
          projects_count: projectsUsed,
          projects_limit: projectsLimit,
          data_sources_count: dataSourcesUsed,
          data_sources_limit: dataSourcesLimit,
          seats_used: seatsUsed,
          seats_limit: seatsLimit,
          data_history_days: dataHistoryDays,
        };
        setUsageStats(transformedUsage);
        return;
      }
      throw new Error(`Proxy response: ${response.status}`);
    } catch (err) {
      console.warn('Error fetching usage stats via proxy, attempting direct backend fallback', err);
      try {
        const backend = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
        const direct = await fetch(`${backend.replace(/\/$/, '')}/api/organizations/${orgId}/usage`, { method: 'GET', credentials: 'include' });
        if (direct.ok) {
          const usage = await direct.json();
          const limits = usage.limits || {};
          const usageMetrics = usage.usage || {};
          const storageLimitGb = limits.storage_limit_gb ?? 0;
          const dataSourcesLimit = limits.max_data_sources ?? 0;
          const dataSourcesUsed = usageMetrics.data_sources_used ?? 0;
          const projectsLimit = limits.max_projects ?? 0;
          const projectsUsed = usageMetrics.projects_used ?? 0;
          const seatsLimit = limits.max_users ?? limits.included_seats ?? 0;
          const seatsUsed = usageMetrics.active_users ?? 0;
          const dataHistoryDays = limits.data_history_days ?? 7;

          const transformedUsage: UsageStats = {
            organization_id: orgId,
            ai_queries_used: usageMetrics.ai_credits_used ?? limits.ai_credits_used ?? 0,
            ai_queries_limit: limits.ai_credits_limit ?? 0,
            storage_used_mb: (usageMetrics.storage_used_gb ?? 0) * 1024,
            storage_limit_mb: storageLimitGb > 0 ? storageLimitGb * 1024 : storageLimitGb,
            projects_count: projectsUsed,
            projects_limit: projectsLimit,
            data_sources_count: dataSourcesUsed,
            data_sources_limit: dataSourcesLimit,
            seats_used: seatsUsed,
            seats_limit: seatsLimit,
            data_history_days: dataHistoryDays,
          };
          setUsageStats(transformedUsage);
          return;
        }
        console.warn('Direct usage fetch failed', direct.status);
      } catch (e2) {
        console.error('Direct usage fallback failed', e2);
      }
      // Fallback to default usage stats if API fails
      const defaultUsage: UsageStats = {
        organization_id: orgId,
        ai_queries_used: 0,
        ai_queries_limit: 30,
        storage_used_mb: 0,
        storage_limit_mb: 5 * 1024,
        projects_count: 1,
        projects_limit: 1,
        data_sources_count: 0,
        data_sources_limit: 2,
        seats_used: 1,
        seats_limit: 1,
        data_history_days: 7,
      };
      setUsageStats(defaultUsage);
    }
  };

  const getPricingPlans = async () => {
    try {
      // For now, create default pricing plans
      const defaultPlans: PricingPlan[] = [
        {
          id: 1,
          name: 'Free',
          plan_type: 'free',
          price: 0,
          currency: 'USD',
          features: [
            '30 AI credits / month',
            '5 GB secure storage',
            '1 project workspace',
            'Connect up to 2 data sources',
            'Watermarked charts & exports',
            '7-day data history',
            'Community support'
          ],
          ai_queries_limit: 30,
          storage_limit_mb: 5 * 1024,
          projects_limit: 1,
        },
        {
          id: 2,
          name: 'Pro',
          plan_type: 'pro',
          price: 25,
          currency: 'USD',
          features: [
            '300 AI credits / month',
            '90 GB storage included',
            'Unlimited workspaces & data sources',
            'Watermark-free charts & dashboards',
            'Theme & brand customization',
            'API access & automation',
            'Priority email & chat support'
          ],
          ai_queries_limit: 300,
          storage_limit_mb: 90 * 1024,
          projects_limit: -1,
        },
        {
          id: 3,
          name: 'Team',
          plan_type: 'team',
          price: 99,
          currency: 'USD',
          features: [
            'Includes 5 seats + $25/additional user',
            '2,000 AI credits / month',
            '500 GB storage included',
            'Advanced collaboration & approvals',
            'Role-based governance',
            '1-year data history',
            'Dedicated support channel'
          ],
          ai_queries_limit: 2000,
          storage_limit_mb: 500 * 1024,
          projects_limit: -1,
        },
        {
          id: 4,
          name: 'Enterprise',
          plan_type: 'enterprise',
          price: 0,
          currency: 'USD',
          features: [
            'Custom AI models & on-prem deployment',
            'Unlimited credits & storage',
            'Compliance-ready (SOC 2, GDPR)',
            '99.9% SLA & proactive monitoring',
            'Dedicated customer success team',
            'White-label & advanced governance'
          ],
          ai_queries_limit: -1,
          storage_limit_mb: -1,
          projects_limit: -1,
        },
      ];
      
      setPricingPlans(defaultPlans);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pricing plans');
    }
  };

  const createOrganization = async (data: { name: string; description?: string; website?: string }): Promise<Organization> => {
    try {
      // For now, create a mock organization
      const newOrg: Organization = {
        id: Date.now(),
        name: data.name,
        description: data.description,
        website: data.website,
        plan_type: 'free',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      setOrganizations(prev => [...prev, newOrg]);
      return newOrg;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create organization');
    }
  };

  const updateOrganization = async (orgId: number, data: any): Promise<Organization> => {
    try {
      // Call the real API to update organization
      const response = await fetchApi(`api/organizations/${orgId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to update organization: ${response.status}`);
      }
      
      const updated = await response.json();
      
      // Update local state with the response from backend
      setOrganizations(prev => prev.map(org => org.id === orgId ? updated : org));
      
      // If updating current organization, update it and refresh all data
      if (currentOrganization?.id === orgId) {
        setCurrentOrganization(updated);
        // Reload organizations and usage stats to ensure consistency
        await Promise.all([
          getOrganizations(),
          getOrganizationUsage(orgId)
        ]);
      }
      
      return updated;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update organization');
    }
  };

  const clearError = () => {
    setError(null);
  };

  const clear = () => {
    // Clear all organization state (called on logout)
    setCurrentOrganization(null);
    setOrganizations([]);
    setProjects([]);
    setUsageStats(null);
    setError(null);
    // Note: pricingPlans can stay as they're not user-specific
  };

  const value: OrganizationContextType = {
    currentOrganization,
    organizations,
    projects,
    usageStats,
    pricingPlans,
    loading,
    error,
    setCurrentOrganization,
    createOrganization,
    updateOrganization,
    getOrganizations,
    getProjects,
    getOrganizationUsage,
    getPricingPlans,
    clearError,
    clear,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};
