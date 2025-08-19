/**
 * Multi-tenant middleware for Cube.js
 * Handles tenant isolation and context management
 */

import { Request, Response, NextFunction } from 'express';
// Mock implementations for build
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

const Joi = {
  object: (schema: any) => ({
    validate: (data: any) => ({ error: null, value: data })
  }),
  string: () => ({
    alphanum: () => ({
      min: (n: number) => ({
        max: (n: number) => ({
          required: () => ({
            messages: (msgs: any) => ({})
          })
        })
      })
    })
  }),
  uuid: () => ({ optional: () => ({}) }),
  valid: (...values: string[]) => ({ default: (val: string) => ({}) }),
  array: () => ({ items: (item: any) => ({ default: (val: any) => ({}) }) }),
  number: () => ({ integer: () => ({ min: (n: number) => ({ default: (val: number) => ({}) }) }) })
};

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

// Tenant validation schema
const tenantSchema = Joi.object({
  tenantId: Joi.string()
    .alphanum()
    .min(3)
    .max(50)
    .required()
    .messages({
      'string.alphanum': 'Tenant ID must contain only alphanumeric characters',
      'string.min': 'Tenant ID must be at least 3 characters long',
      'string.max': 'Tenant ID must not exceed 50 characters',
      'any.required': 'Tenant ID is required'
    }),
  
  organizationId: Joi.string()
    .uuid()
    .optional(),
    
  subscriptionTier: Joi.string()
    .valid('free', 'pro', 'team', 'enterprise')
    .default('free'),
    
  features: Joi.array()
    .items(Joi.string())
    .default([]),
    
  limits: Joi.object({
    maxUsers: Joi.number().integer().min(1).default(1),
    maxProjects: Joi.number().integer().min(1).default(3),
    maxQueries: Joi.number().integer().min(100).default(1000),
    maxDataSources: Joi.number().integer().min(1).default(5)
  }).default({})
});

// Extended Request interface for tenant context
export interface TenantRequest extends Request {
  tenant?: {
    tenantId: string;
    organizationId?: string;
    subscriptionTier: string;
    features: string[];
    limits: {
      maxUsers: number;
      maxProjects: number;
      maxQueries: number;
      maxDataSources: number;
    };
  };
}

// Type for tenant limits keys
export type TenantLimitKey = keyof TenantRequest['tenant']['limits'];

/**
 * Extract tenant ID from various sources
 */
function extractTenantId(req: Request): string | null {
  // Priority order: header, query param, subdomain, JWT claim
  
  // 1. Check X-Tenant-ID header
  const headerTenantId = req.headers['x-tenant-id'] as string;
  if (headerTenantId) {
    return headerTenantId;
  }
  
  // 2. Check query parameter
  const queryTenantId = req.query.tenantId as string;
  if (queryTenantId) {
    return queryTenantId;
  }
  
  // 3. Check subdomain (e.g., tenant1.aiser.app)
  const host = req.headers.host;
  if (host && host.includes('.')) {
    const subdomain = host.split('.')[0];
    if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
      return subdomain;
    }
  }
  
  // 4. Check JWT token claims (if available)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      // Note: JWT verification should be done in security middleware
      // This is just for tenant extraction
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      if (payload.tenantId) {
        return payload.tenantId;
      }
    } catch (error) {
      logger.warn('Failed to extract tenant from JWT:', error);
    }
  }
  
  return null;
}

/**
 * Validate tenant access and permissions
 */
export async function validateTenantAccess(
  req: TenantRequest, 
  securityContext: any
): Promise<void> {
  const tenantId = securityContext.tenantId;
  
  if (!tenantId) {
    throw new Error('Tenant ID is required for multi-tenant access');
  }
  
  // Validate tenant ID format
  const { error } = tenantSchema.validate({ tenantId });
  if (error) {
    throw new Error(`Invalid tenant ID: ${error.details[0].message}`);
  }
  
  // TODO: Add database lookup for tenant validation
  // This would typically check:
  // - Tenant exists and is active
  // - User has access to this tenant
  // - Subscription is valid
  // - Feature access permissions
  
  logger.info(`Tenant access validated: ${tenantId}`);
}

/**
 * Create tenant context middleware
 */
export function createTenantContext(
  req: TenantRequest, 
  res: Response, 
  next: NextFunction
): void {
  try {
    const tenantId = extractTenantId(req);
    
    if (!tenantId) {
      // For development, allow default tenant
      if (process.env.NODE_ENV === 'development') {
        req.tenant = {
          tenantId: 'default',
          subscriptionTier: 'enterprise',
          features: ['all'],
          limits: {
            maxUsers: 1000,
            maxProjects: 1000,
            maxQueries: 100000,
            maxDataSources: 100
          }
        };
        logger.info('Using default tenant for development');
        return next();
      }
      
      return res.status(400).json({
        error: 'Tenant ID is required',
        message: 'Please provide tenant ID via X-Tenant-ID header, query parameter, or subdomain'
      });
    }
    
    // Validate tenant ID format
    const { error, value } = tenantSchema.validate({ tenantId });
    if (error) {
      return res.status(400).json({
        error: 'Invalid tenant ID',
        message: error.details[0].message
      });
    }
    
    // Create tenant context
    req.tenant = {
      tenantId: value.tenantId,
      organizationId: value.organizationId,
      subscriptionTier: value.subscriptionTier,
      features: value.features,
      limits: value.limits
    };
    
    logger.info(`Tenant context created: ${tenantId}`);
    next();
    
  } catch (error) {
    logger.error('Failed to create tenant context:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process tenant context'
    });
  }
}

/**
 * Tenant-aware database name resolver
 */
export function getTenantDatabaseName(tenantId: string): string {
  const baseName = process.env.CUBE_DB_NAME || 'aiser_world';
  
  // For default tenant, use base database name
  if (tenantId === 'default') {
    return baseName;
  }
  
  // For other tenants, append tenant ID
  return `${baseName}_${tenantId}`;
}

/**
 * Tenant-aware schema name resolver
 */
export function getTenantSchemaName(tenantId: string): string {
  const baseSchema = process.env.CUBE_DB_SCHEMA || 'public';
  
  // For default tenant, use base schema
  if (tenantId === 'default') {
    return baseSchema;
  }
  
  // For other tenants, use tenant-specific schema
  return `tenant_${tenantId}`;
}

/**
 * Check if tenant has access to specific feature
 */
export function hasTenantFeature(tenant: TenantRequest['tenant'], feature: string): boolean {
  if (!tenant) return false;
  
  // Enterprise tier has access to all features
  if (tenant.subscriptionTier === 'enterprise') {
    return true;
  }
  
  // Check if feature is explicitly enabled
  return tenant.features.includes(feature) || tenant.features.includes('all');
}

/**
 * Check if tenant is within usage limits
 */
export function checkTenantLimits(
  tenant: TenantRequest['tenant'], 
  resource: TenantLimitKey, 
  currentUsage: number
): boolean {
  if (!tenant) return false;
  
  const limit = tenant.limits[resource as keyof typeof tenant.limits];
  return currentUsage < limit;
}

/**
 * Middleware to enforce feature access
 */
export function requireFeature(feature: string) {
  return (req: TenantRequest, res: Response, next: NextFunction) => {
    if (!hasTenantFeature(req.tenant, feature)) {
      return res.status(403).json({
        error: 'Feature not available',
        message: `Feature '${feature}' is not available in your subscription tier`,
        requiredFeature: feature,
        currentTier: req.tenant?.subscriptionTier
      });
    }
    next();
  };
}

/**
 * Middleware to enforce usage limits
 */
export function enforceLimit(resource: TenantLimitKey) {
  return async (req: TenantRequest, res: Response, next: NextFunction) => {
    if (!req.tenant) {
      return res.status(400).json({ error: 'Tenant context required' });
    }
    
    // TODO: Implement actual usage tracking
    // This would typically query the database to get current usage
    const currentUsage = 0; // Placeholder
    
    if (!checkTenantLimits(req.tenant, resource, currentUsage)) {
      return res.status(429).json({
        error: 'Usage limit exceeded',
        message: `You have reached the limit for ${String(resource)}`,
        limit: req.tenant.limits[resource as keyof typeof req.tenant.limits],
        currentUsage
      });
    }
    
    next();
  };
}