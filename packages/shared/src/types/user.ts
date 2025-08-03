// User and workspace types
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  defaultChartTypes: string[];
  notifications: {
    email: boolean;
    push: boolean;
    insights: boolean;
    alerts: boolean;
  };
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  members: WorkspaceMember[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMember {
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  workspaces: Workspace[];
  settings: {
    ssoEnabled: boolean;
    mfaRequired: boolean;
    auditLogging: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}