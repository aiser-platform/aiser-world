'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getBackendUrlForApi } from '@/utils/backendUrl';

// Types
export interface Organization {
  id: number;
  name: string;
  description?: string;
  website?: string;
  plan_type: 'free' | 'pro' | 'enterprise';
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
  storage_used_mb: number;
  storage_limit_mb: number;
  projects_count: number;
  projects_limit: number;
}

export interface PricingPlan {
  id: number;
  name: string;
  plan_type: 'free' | 'pro' | 'enterprise';
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
  const { user, isAuthenticated } = useAuth();
  
  // State
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial data when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      loadInitialData();
    }
  }, [isAuthenticated, user]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        getOrganizations(),
        getPricingPlans(),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load initial data');
    } finally {
      setLoading(false);
    }
  };

  const getOrganizations = async () => {
    try {
      // Call the real API to get organizations
      const response = await fetch(`${getBackendUrlForApi()}/api/organizations`);
      if (response.ok) {
        const orgs = await response.json();
        setOrganizations(orgs);
        
        // Set the first organization as current (or find by user's organization)
        if (orgs.length > 0) {
          setCurrentOrganization(orgs[0]);
          // Load projects for the current organization
          await getProjects(orgs[0].id);
          // Load usage stats for the current organization
          await getOrganizationUsage(orgs[0].id);
        }
      } else {
        throw new Error('Failed to fetch organizations');
      }
    } catch (err) {
      console.error('Error fetching organizations:', err);
      // Fallback to default organization if API fails
      const defaultOrg: Organization = {
        id: 1,
        name: 'Default Organization',
        description: 'Your default organization for data analysis',
        plan_type: 'free',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setOrganizations([defaultOrg]);
      setCurrentOrganization(defaultOrg);
    }
  };

  const getProjects = async (orgId?: number) => {
    try {
      // Call the real API to get projects
      const response = await fetch(`${getBackendUrlForApi()}/api/projects?user_id=default`);
      if (response.ok) {
        const data = await response.json();
        setProjects(data.items || []);
      } else {
        throw new Error('Failed to fetch projects');
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
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
      const response = await fetch(`${getBackendUrlForApi()}/api/organizations/${orgId}/usage`);
      if (response.ok) {
        const usage = await response.json();
        // Transform the API response to match our UsageStats interface
        const transformedUsage: UsageStats = {
          organization_id: orgId,
          ai_queries_used: usage.limits.ai_credits_used || 0,
          ai_queries_limit: usage.limits.ai_credits_limit || 100,
          storage_used_mb: 0, // Not provided by API yet
          storage_limit_mb: (usage.limits.max_storage_gb || 1) * 1024, // Convert GB to MB
          projects_count: usage.limits.max_projects || 1,
          projects_limit: usage.limits.max_projects || 5,
        };
        setUsageStats(transformedUsage);
      } else {
        throw new Error('Failed to fetch usage stats');
      }
    } catch (err) {
      console.error('Error fetching usage stats:', err);
      // Fallback to default usage stats if API fails
      const defaultUsage: UsageStats = {
        organization_id: orgId,
        ai_queries_used: 0,
        ai_queries_limit: 100,
        storage_used_mb: 0,
        storage_limit_mb: 1000,
        projects_count: 1,
        projects_limit: 5,
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
          features: ['Basic AI analysis', 'Up to 100 AI queries/month', '1GB storage', 'Up to 5 projects'],
          ai_queries_limit: 100,
          storage_limit_mb: 1000,
          projects_limit: 5,
        },
        {
          id: 2,
          name: 'Pro',
          plan_type: 'pro',
          price: 29,
          currency: 'USD',
          features: ['Advanced AI analysis', 'Up to 1000 AI queries/month', '10GB storage', 'Up to 20 projects', 'Priority support'],
          ai_queries_limit: 1000,
          storage_limit_mb: 10000,
          projects_limit: 20,
        },
        {
          id: 3,
          name: 'Enterprise',
          plan_type: 'enterprise',
          price: 99,
          currency: 'USD',
          features: ['Full AI capabilities', 'Unlimited AI queries', '100GB storage', 'Unlimited projects', 'Dedicated support', 'Custom integrations'],
          ai_queries_limit: -1, // Unlimited
          storage_limit_mb: 100000,
          projects_limit: -1, // Unlimited
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
      // For now, update the mock organization
      const updatedOrg = organizations.find(org => org.id === orgId);
      if (!updatedOrg) {
        throw new Error('Organization not found');
      }
      
      const updated = { ...updatedOrg, ...data, updated_at: new Date().toISOString() };
      setOrganizations(prev => prev.map(org => org.id === orgId ? updated : org));
      
      if (currentOrganization?.id === orgId) {
        setCurrentOrganization(updated);
      }
      
      return updated;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update organization');
    }
  };

  const clearError = () => {
    setError(null);
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
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};
