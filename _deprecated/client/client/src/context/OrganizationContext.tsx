'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { organizationService, Organization, Project, UsageStats, PricingPlan } from '@/services/organizationService';

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
    if (isAuthenticated() && user) {
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
      const orgs = await organizationService.getOrganizations();
      setOrganizations(orgs);
      
      // Set current organization to the first one (or default)
      if (orgs.length > 0 && !currentOrganization) {
        setCurrentOrganization(orgs[0]);
        // Load projects for the current organization
        await getProjects(orgs[0].id);
        // Load usage stats for the current organization
        await getOrganizationUsage(orgs[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch organizations');
    }
  };

  const getProjects = async (orgId?: number) => {
    try {
      const projs = await organizationService.getProjects(orgId);
      setProjects(projs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
    }
  };

  const getOrganizationUsage = async (orgId: number) => {
    try {
      const usage = await organizationService.getOrganizationUsage(orgId);
      setUsageStats(usage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch organization usage');
    }
  };

  const getPricingPlans = async () => {
    try {
      const plans = await organizationService.getPricingPlans();
      setPricingPlans(plans);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pricing plans');
    }
  };

  const createOrganization = async (data: { name: string; description?: string; website?: string }) => {
    try {
      setLoading(true);
      setError(null);
      
      const newOrg = await organizationService.createOrganization(data);
      
      // Add to organizations list
      setOrganizations(prev => [...prev, newOrg]);
      
      // Set as current organization
      setCurrentOrganization(newOrg);
      
      return newOrg;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create organization';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateOrganization = async (orgId: number, data: any) => {
    try {
      setLoading(true);
      setError(null);
      
      const updatedOrg = await organizationService.updateOrganization(orgId, data);
      
      // Update in organizations list
      setOrganizations(prev => 
        prev.map(org => org.id === orgId ? updatedOrg : org)
      );
      
      // Update current organization if it's the one being updated
      if (currentOrganization?.id === orgId) {
        setCurrentOrganization(updatedOrg);
      }
      
      return updatedOrg;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update organization';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value: OrganizationContextType = {
    // State
    currentOrganization,
    organizations,
    projects,
    usageStats,
    pricingPlans,
    loading,
    error,

    // Actions
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
