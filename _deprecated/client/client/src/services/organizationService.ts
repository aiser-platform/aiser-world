import { fetchAuthApi } from '@/utils/api';

export interface Organization {
  id: number;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  website?: string;
  plan_type: string;
  ai_credits_used: number;
  ai_credits_limit: number;
  subscription_status: string;
  trial_ends_at?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  organization_id: number;
  is_public: boolean;
  settings?: Record<string, any>;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface UsageStats {
  ai_credits_used: number;
  ai_cost_usd: number;
  project_count: number;
  user_count: number;
}

export interface PricingPlan {
  id: number;
  name: string;
  plan_type: string;
  price_monthly: number;
  price_yearly: number;
  ai_credits_monthly: number;
  ai_credits_yearly: number;
  features?: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface OrganizationDashboard {
  organization: Organization;
  usage_stats: UsageStats;
}

export interface Subscription {
  id: number;
  organization_id: number;
  plan_type: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  subscription_metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AIUsageLog {
  id: number;
  organization_id: number;
  user_id: number;
  project_id?: number;
  operation_type: string;
  model_used: string;
  tokens_used: number;
  credits_consumed: number;
  cost_usd?: number;
  usage_metadata?: Record<string, any>;
  created_at: string;
}

export interface UserOrganization {
  id: number;
  user_id: number;
  organization_id: number;
  role_id: number;
  is_owner: boolean;
  joined_at: string;
  user?: Record<string, any>;
  organization?: Record<string, any>;
  role?: Record<string, any>;
}

export interface Role {
  id: number;
  name: string;
  description?: string;
  permissions: Record<string, any>;
  is_system_role: boolean;
  created_at: string;
  updated_at: string;
}

class OrganizationService {
  // Organization methods
  async getOrganizations(): Promise<Organization[]> {
    const response = await fetchAuthApi('organizations/');
    if (!response.ok) {
      throw new Error('Failed to fetch organizations');
    }
    return response.json();
  }

  async getOrganization(orgId: number): Promise<Organization> {
    const response = await fetchAuthApi(`organizations/${orgId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch organization');
    }
    return response.json();
  }

  async createOrganization(data: {
    name: string;
    description?: string;
    website?: string;
  }): Promise<Organization> {
    const response = await fetchAuthApi('organizations/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create organization');
    }
    return response.json();
  }

  async updateOrganization(orgId: number, data: {
    name?: string;
    description?: string;
    website?: string;
    logo_url?: string;
  }): Promise<Organization> {
    const response = await fetchAuthApi(`organizations/${orgId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update organization');
    }
    return response.json();
  }

  async getOrganizationDashboard(orgId: number): Promise<OrganizationDashboard> {
    const response = await fetchAuthApi(`organizations/${orgId}/dashboard`);
    if (!response.ok) {
      throw new Error('Failed to fetch organization dashboard');
    }
    return response.json();
  }

  async getOrganizationUsage(orgId: number): Promise<UsageStats> {
    const response = await fetchAuthApi(`organizations/${orgId}/usage`);
    if (!response.ok) {
      throw new Error('Failed to fetch organization usage');
    }
    return response.json();
  }

  // Project methods
  async getProjects(orgId?: number): Promise<Project[]> {
    const url = orgId 
      ? `projects/?org_id=${orgId}`
      : 'projects/';
    
    const response = await fetchAuthApi(url);
    if (!response.ok) {
      throw new Error('Failed to fetch projects');
    }
    return response.json();
  }

  async getProject(projectId: number): Promise<Project> {
    const response = await fetchAuthApi(`projects/${projectId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch project');
    }
    return response.json();
  }

  async createProject(data: {
    name: string;
    description?: string;
    organization_id: number;
    is_public?: boolean;
    settings?: Record<string, any>;
  }): Promise<Project> {
    const response = await fetchAuthApi('projects/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create project');
    }
    return response.json();
  }

  async updateProject(projectId: number, data: {
    name?: string;
    description?: string;
    is_public?: boolean;
    settings?: Record<string, any>;
  }): Promise<Project> {
    const response = await fetchAuthApi(`projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update project');
    }
    return response.json();
  }

  async deleteProject(projectId: number): Promise<void> {
    const response = await fetchAuthApi(`projects/${projectId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete project');
    }
  }

  // Subscription and billing methods
  async getOrganizationSubscription(orgId: number): Promise<Subscription> {
    const response = await fetchAuthApi(`organizations/${orgId}/subscription`);
    if (!response.ok) {
      throw new Error('Failed to fetch organization subscription');
    }
    return response.json();
  }

  async upgradeOrganizationPlan(orgId: number, planType: string): Promise<Subscription> {
    const response = await fetchAuthApi(`organizations/${orgId}/upgrade`, {
      method: 'POST',
      body: JSON.stringify({ plan_type: planType }),
    });
    if (!response.ok) {
      throw new Error('Failed to upgrade organization plan');
    }
    return response.json();
  }

  async getPricingPlans(): Promise<PricingPlan[]> {
    const response = await fetchAuthApi('pricing');
    if (!response.ok) {
      throw new Error('Failed to fetch pricing plans');
    }
    return response.json();
  }

  // AI usage methods
  async logAIUsage(data: {
    organization_id: number;
    user_id: number;
    project_id?: number;
    operation_type: string;
    model_used: string;
    tokens_used: number;
    credits_consumed: number;
    cost_usd?: number;
    usage_metadata?: Record<string, any>;
  }): Promise<AIUsageLog> {
    const response = await fetchAuthApi('ai-usage/log', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to log AI usage');
    }
    return response.json();
  }

  // Team management methods
  async getProjectMembers(projectId: number): Promise<UserOrganization[]> {
    const response = await fetchAuthApi(`projects/${projectId}/members`);
    if (!response.ok) {
      throw new Error('Failed to fetch project members');
    }
    return response.json();
  }

  async inviteProjectMember(projectId: number, data: {
    email: string;
    role_id: number;
  }): Promise<UserOrganization> {
    const response = await fetchAuthApi(`projects/${projectId}/invite`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to invite project member');
    }
    return response.json();
  }

  // Role methods
  async getRoles(): Promise<Role[]> {
    const response = await fetchAuthApi('roles/');
    if (!response.ok) {
      throw new Error('Failed to fetch roles');
    }
    return response.json();
  }

  async getRole(roleId: number): Promise<Role> {
    const response = await fetchAuthApi(`roles/${roleId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch role');
    }
    return response.json();
  }
}

export const organizationService = new OrganizationService();
export default organizationService;
