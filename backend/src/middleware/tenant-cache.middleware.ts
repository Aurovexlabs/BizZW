import type { NextFunction, Request, Response } from 'express';
import { bumpTenantDataVersion } from '../lib/cache';
import { logger } from '../lib/logger';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const TENANT_WRITE_ROUTE_PREFIXES = [
  '/api/v1/inventory',
  '/api/v1/invoices',
  '/api/v1/sales',
  '/api/v1/customers',
  '/api/v1/expenses',
  '/api/v1/purchase-orders',
  '/api/v1/subscriptions',
  '/api/v1/branches',
  '/api/v1/auth/invite',
  '/api/v1/auth/team',
  '/api/v1/auth/accept-invite',
];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function getRequestPath(req: Request): string {
  return (req.originalUrl || req.url || req.path || '').split('?')[0];
}

function shouldInvalidate(req: Request): boolean {
  if (!MUTATING_METHODS.has(req.method.toUpperCase())) {
    return false;
  }

  const pathname = getRequestPath(req);
  if (!pathname.startsWith('/api/v1/')) {
    return false;
  }

  return TENANT_WRITE_ROUTE_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

export function tenantCacheInvalidationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!shouldInvalidate(req)) {
    next();
    return;
  }

  res.on('finish', () => {
    if (res.statusCode >= 400) {
      return;
    }

    const orgId = req.user?.orgId || req.orgId;
    if (!orgId) {
      return;
    }

    void bumpTenantDataVersion(orgId).catch((error) => {
      logger.warn(
        {
          err: error,
          orgId,
          path: getRequestPath(req),
          method: req.method,
          statusCode: res.statusCode,
        },
        'Failed to invalidate tenant report cache after write'
      );
    });
  });

  next();
}
