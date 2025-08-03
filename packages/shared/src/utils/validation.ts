import { z } from 'zod';

/**
 * Common validation schemas using Zod
 */

export const emailSchema = z.string().email('Invalid email address');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(50, 'Username must be less than 50 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens');

export const chartConfigSchema = z.object({
  title: z.string().min(1, 'Chart title is required'),
  type: z.enum(['line', 'bar', 'pie', 'donut', 'scatter', 'area', 'mixed']),
  metrics: z.array(z.object({
    label: z.string().min(1),
    column: z.string().min(1),
    aggregation: z.enum(['sum', 'avg', 'count', 'min', 'max', 'count_distinct']),
    prefix: z.string().optional(),
    suffix: z.string().optional(),
  })).min(1, 'At least one metric is required'),
  dimensions: z.array(z.object({
    label: z.string().min(1),
    column: z.string().min(1),
  })).min(1, 'At least one dimension is required'),
  filters: z.array(z.object({
    label: z.string().min(1),
    column: z.string().min(1),
    operator: z.enum(['=', '!=', '>', '<', '>=', '<=', 'like', 'in', 'not in']),
    value: z.union([z.string(), z.array(z.string())]),
  })).optional(),
  rowLimit: z.number().min(0).optional(),
});

/**
 * Validation helper functions
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  try {
    emailSchema.parse(email);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0].message };
    }
    return { valid: false, error: 'Invalid email' };
  }
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
  try {
    passwordSchema.parse(password);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0].message };
    }
    return { valid: false, error: 'Invalid password' };
  }
}

export function validateUsername(username: string): { valid: boolean; error?: string } {
  try {
    usernameSchema.parse(username);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0].message };
    }
    return { valid: false, error: 'Invalid username' };
  }
}