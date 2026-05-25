import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getTenantDB } from '../lib/db';
import { ApiPermission, getApiKeyModel, hashApiKey } from '../modules/api-keys/api-keys.model';
import { AuthTokenPayload, UserRole } from '../shared/types';
import { AppError } from './error.middleware';

const API_KEY_PREFIX = 'bz_live_';
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const API_KEY_PERMISSION_RULES: Array<{
  prefix: string;
  read?: ApiPermission;
  write?: ApiPermission;
}> = [
  { prefix: '/api/v1/inventory', read: 'inventory:read', write: 'inventory:write' },
  { prefix: '/api/v1/sales', read: 'sales:read', write: 'sales:write' },
  { prefix: '/api/v1/invoices', read: 'invoices:read', write: 'invoices:write' },
  { prefix: '/api/v1/customers', read: 'customers:read', write: 'customers:write' },
  { prefix: '/api/v1/reports', read: 'reports:read' },
  { prefix: '/api/v1/expenses', read: 'expenses:read', write: 'expenses:write' },
];

function parseOrgIdFromApiKey(rawKey: string): string | undefined {
  if (!rawKey.startsWith(API_KEY_PREFIX)) return undefined;

  const withoutPrefix = rawKey.slice(API_KEY_PREFIX.length);
  const firstSeparator = withoutPrefix.indexOf('_');
  if (firstSeparator <= 0) return undefined;

  const candidate = withoutPrefix.slice(0, firstSeparator);
  return /^[a-z0-9]{6,32}$/.test(candidate) ? candidate : undefined;
}

function getRequiredApiPermission(req: Request): ApiPermission | null {
  const path = req.baseUrl || req.originalUrl || '';
  const rule = API_KEY_PERMISSION_RULES.find((entry) => path.startsWith(entry.prefix));
  if (!rule) return null;

  if (READ_METHODS.has(req.method.toUpperCase())) {
    return rule.read ?? null;
  }

  return rule.write ?? null;
}

async function authenticateApiKey(req: Request, rawKey: string): Promise<void> {
  const inferredOrgId = parseOrgIdFromApiKey(rawKey);
  const legacyOrgId =
    typeof req.headers['x-org-id'] === 'string' ? req.headers['x-org-id'] : undefined;
  const orgId = inferredOrgId || legacyOrgId;

  if (!orgId) {
    throw new AppError('Legacy API keys require x-org-id header', 401, 'API_KEY_ORG_REQUIRED');
  }

  const db = await getTenantDB(orgId);
  const ApiKey = getApiKeyModel(db);
  const hashedKey = hashApiKey(rawKey);
  const now = new Date();

  const apiKey = await ApiKey.findOne({
    orgId,
    hashedKey,
    isActive: true,
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: now } }],
  }).select('orgId name permissions keyPrefix');

  if (!apiKey) {
    throw new AppError('Invalid, inactive, or expired API key', 401, 'INVALID_API_KEY');
  }

  const requiredPermission = getRequiredApiPermission(req);
  if (!requiredPermission) {
    throw new AppError('API key access is not allowed for this endpoint', 403, 'API_KEY_FORBIDDEN');
  }

  if (!apiKey.permissions.includes(requiredPermission)) {
    throw new AppError('API key permission denied', 403, 'API_KEY_PERMISSION_DENIED');
  }

  await ApiKey.updateOne({ _id: apiKey._id }, { $set: { lastUsed: now } });

  req.user = {
    userId: `api_${apiKey._id.toString()}`,
    orgId,
    role: UserRole.VIEWER,
    email: 'api-key@bizzw.local',
    name: apiKey.name,
  };
  req.orgId = orgId;
  req.authType = 'api-key';
  req.apiKey = {
    id: apiKey._id.toString(),
    name: apiKey.name,
    permissions: apiKey.permissions,
    keyPrefix: apiKey.keyPrefix,
  };
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
  }

  if (token.startsWith(API_KEY_PREFIX)) {
    try {
      await authenticateApiKey(req, token);
      return next();
    } catch (error) {
      if (error instanceof AppError) {
        return next(error);
      }
      return next(new AppError('Invalid API key', 401, 'INVALID_API_KEY'));
    }
  }

  try {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new Error('JWT_ACCESS_SECRET not configured');

    const payload = jwt.verify(token, secret) as AuthTokenPayload;
    req.user = payload;
    req.orgId = payload.orgId;
    req.authType = 'jwt';
    next();
  } catch {
    next(new AppError('Invalid or expired token', 401, 'INVALID_TOKEN'));
  }
}

// Role hierarchy for permission checks
const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 100,
  [UserRole.ORG_OWNER]: 80,
  [UserRole.ORG_ADMIN]: 60,
  [UserRole.ACCOUNTANT]: 40,
  [UserRole.CASHIER]: 30,
  [UserRole.VIEWER]: 10,
};

export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    // API key permissions are validated during authenticate().
    if (req.authType === 'api-key') {
      return next();
    }

    const userRoleLevel = ROLE_HIERARCHY[req.user.role] ?? 0;
    const hasPermission = allowedRoles.some((role) => ROLE_HIERARCHY[role] <= userRoleLevel);

    if (!hasPermission) {
      return next(new AppError('Insufficient permissions', 403, 'FORBIDDEN'));
    }

    next();
  };
}

// Middleware to ensure tenant scope is set
export function requireTenant(req: Request, _res: Response, next: NextFunction): void {
  if (!req.orgId) {
    return next(new AppError('Tenant context required', 400, 'NO_TENANT'));
  }
  next();
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return next();
  }

  try {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) return next();

    const payload = jwt.verify(token, secret) as AuthTokenPayload;
    req.user = payload;
    req.orgId = payload.orgId;
  } catch {
    // Silently ignore invalid optional tokens
  }

  next();
}
