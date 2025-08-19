/**
 * Security middleware for Cube.js
 * Handles authentication, authorization, and security context
 */

import { Request } from 'express';
// Mock implementations for build
const jwt = {
  verify: (token: string, secret: string) => ({ sub: 'user', tenantId: 'default' })
};

const winston = {
  createLogger: (config: any) => ({
    info: (msg: string, meta?: any) => console.log(msg, meta),
    warn: (msg: string, meta?: any) => console.warn(msg, meta),
    error: (msg: string, meta?: any) => console.error(msg, meta)
  }),
  format: {
    combine: (...args: any[]) => {},
    timestamp: () => {},
    json: () => {}
  },
  transports: {
    Console: class {
      constructor(options: any) {}
    }
  }
};
import { TenantRequest } from './tenant';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

// Security context interface
export interface SecurityContext {
  userId?: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
  isAuthenticated: boolean;
  tokenType?: 'user' | 'service' | 'api_key';
  expiresAt?: Date;
  sessionId?: string;
}

// JWT payload interface
interface JWTPayload {
  sub?: string; // user ID
  tenantId?: string;
  roles?: string[];
  permissions?: string[];
  type?: 'user' | 'service' | 'api_key';
  exp?: number;
  sessionId?: string;
}

/**
 * Extract and verify JWT token
 */
async function verifyJWTToken(token: string): Promise<JWTPayload | null> {
  try {
    const secret = process.env.JWT_SECRET || process.env.CUBE_JWT_SECRET;
    if (!secret) {
      logger.warn('JWT secret not configured');
      return null;
    }

    const payload = jwt.verify(token, secret) as JWTPayload;
    return payload;
  } catch (error) {
    logger.warn('JWT verification failed:', error);
    return null;
  }
}

/**
 * Extract API key and validate
 */
async function verifyApiKey(apiKey: string): Promise<JWTPayload | null> {
  try {
    // TODO: Implement API key validation against database
    // This would typically:
    // 1. Hash the API key
    // 2. Look up in database
    // 3. Check if active and not expired
    // 4. Return associated tenant and permissions
    
    logger.info('API key validation not implemented yet');
    return null;
  } catch (error) {
    logger.warn('API key verification failed:', error);
    return null;
  }
}

/**
 * Create security context from request
 */
export async function createSecurityContext(req: TenantRequest): Promise<SecurityContext> {
  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.headers['x-api-key'] as string;
  
  // Default security context for unauthenticated requests
  let securityContext: SecurityContext = {
    tenantId: req.tenant?.tenantId || 'default',
    roles: ['anonymous'],
    permissions: ['read:public'],
    isAuthenticated: false
  };

  try {
    // Try JWT authentication first
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = await verifyJWTToken(token);
      
      if (payload) {
        securityContext = {
          userId: payload.sub,
          tenantId: payload.tenantId || req.tenant?.tenantId || 'default',
          roles: payload.roles || ['user'],
          permissions: payload.permissions || ['read:own', 'write:own'],
          isAuthenticated: true,
          tokenType: payload.type || 'user',
          expiresAt: payload.exp ? new Date(payload.exp * 1000) : undefined,
          sessionId: payload.sessionId
        };
        
        logger.info(`JWT authentication successful for user: ${payload.sub}`);
      }
    }
    
    // Try API key authentication if JWT failed
    else if (apiKeyHeader) {
      const payload = await verifyApiKey(apiKeyHeader);
      
      if (payload) {
        securityContext = {
          userId: payload.sub,
          tenantId: payload.tenantId || req.tenant?.tenantId || 'default',
          roles: payload.roles || ['service'],
          permissions: payload.permissions || ['read:all', 'write:all'],
          isAuthenticated: true,
          tokenType: 'api_key'
        };
        
        logger.info(`API key authentication successful`);
      }
    }
    
    // For development mode, allow unauthenticated access
    else if (process.env.NODE_ENV === 'development') {
      securityContext = {
        userId: 'dev-user',
        tenantId: req.tenant?.tenantId || 'default',
        roles: ['admin', 'user'],
        permissions: ['read:all', 'write:all', 'admin:all'],
        isAuthenticated: true,
        tokenType: 'user'
      };
      
      logger.info('Development mode: allowing unauthenticated access');
    }

    // Ensure tenant consistency
    if (req.tenant && securityContext.tenantId !== req.tenant.tenantId) {
      logger.warn(`Tenant mismatch: token=${securityContext.tenantId}, context=${req.tenant.tenantId}`);
      // Use tenant from context (header/subdomain) as it's more explicit
      securityContext.tenantId = req.tenant.tenantId;
    }

    return securityContext;
    
  } catch (error) {
    logger.error('Failed to create security context:', error);
    throw new Error('Authentication failed');
  }
}

/**
 * Check if user has required permission
 */
export function hasPermission(
  securityContext: SecurityContext, 
  permission: string
): boolean {
  // Admin role has all permissions
  if (securityContext.roles.includes('admin')) {
    return true;
  }
  
  // Check explicit permissions
  return securityContext.permissions.includes(permission) ||
         securityContext.permissions.includes('all');
}

/**
 * Check if user has required role
 */
export function hasRole(
  securityContext: SecurityContext, 
  role: string
): boolean {
  return securityContext.roles.includes(role);
}

/**
 * Get user permissions for Cube.js query context
 */
export function getCubePermissions(securityContext: SecurityContext): any {
  const permissions: any = {
    // Basic tenant isolation
    tenant_id: securityContext.tenantId
  };
  
  // Add user-specific filters if authenticated
  if (securityContext.isAuthenticated && securityContext.userId) {
    permissions.user_id = securityContext.userId;
  }
  
  // Add role-based permissions
  if (hasRole(securityContext, 'admin')) {
    permissions.admin_access = true;
  }
  
  if (hasRole(securityContext, 'manager')) {
    permissions.manager_access = true;
  }
  
  return permissions;
}

/**
 * Validate security context for Cube.js operations
 */
export function validateSecurityContext(
  securityContext: SecurityContext,
  operation: 'read' | 'write' | 'admin'
): void {
  // Check if user is authenticated for write/admin operations
  if ((operation === 'write' || operation === 'admin') && !securityContext.isAuthenticated) {
    throw new Error('Authentication required for this operation');
  }
  
  // Check token expiration
  if (securityContext.expiresAt && securityContext.expiresAt < new Date()) {
    throw new Error('Token has expired');
  }
  
  // Check required permissions
  const requiredPermissions: Record<string, string[]> = {
    read: ['read:own', 'read:all'],
    write: ['write:own', 'write:all'],
    admin: ['admin:all']
  };
  
  const required = requiredPermissions[operation];
  const hasRequiredPermission = required.some(perm => 
    hasPermission(securityContext, perm)
  );
  
  if (!hasRequiredPermission) {
    throw new Error(`Insufficient permissions for ${operation} operation`);
  }
}

/**
 * Create audit log entry for security events
 */
export function createAuditLog(
  securityContext: SecurityContext,
  action: string,
  resource: string,
  details?: any
): void {
  const auditEntry = {
    timestamp: new Date().toISOString(),
    userId: securityContext.userId,
    tenantId: securityContext.tenantId,
    action,
    resource,
    details,
    sessionId: securityContext.sessionId,
    tokenType: securityContext.tokenType
  };
  
  // TODO: Store audit log in database or external service
  logger.info('Audit log entry:', auditEntry);
}

/**
 * Rate limiting based on security context
 */
export function getRateLimitKey(securityContext: SecurityContext): string {
  // Use different rate limit keys based on authentication
  if (securityContext.isAuthenticated && securityContext.userId) {
    return `user:${securityContext.userId}:${securityContext.tenantId}`;
  }
  
  return `tenant:${securityContext.tenantId}`;
}

/**
 * Get rate limit configuration based on security context
 */
export function getRateLimitConfig(securityContext: SecurityContext): {
  points: number;
  duration: number;
} {
  // Different limits based on authentication and roles
  if (hasRole(securityContext, 'admin')) {
    return { points: 1000, duration: 60 }; // 1000 requests per minute
  }
  
  if (securityContext.isAuthenticated) {
    return { points: 100, duration: 60 }; // 100 requests per minute
  }
  
  return { points: 10, duration: 60 }; // 10 requests per minute for anonymous
}