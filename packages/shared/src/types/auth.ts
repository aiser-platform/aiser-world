// Authentication types
export interface User {
  id: string;
  email: string;
  username: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface SignupData {
  email: string;
  username: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export type UserRole = 'owner' | 'admin' | 'member' | 'viewer' | 'public';

export interface Permission {
  resource: string;
  action: 'read' | 'write' | 'delete' | 'share';
  granted: boolean;
}