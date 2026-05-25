import crypto from 'crypto';
import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { getTenantDB } from '../../lib/db';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { AppError, asyncHandler, sendSuccess } from '../../middleware/error.middleware';
import { UserRole } from '../../shared/types';
import { API_PERMISSIONS, getApiKeyModel, hashApiKey } from './api-keys.model';

// ─── Router ───────────────────────────────────────────────────

export const apiKeysRouter = Router();
apiKeysRouter.use(authenticate);
apiKeysRouter.use(authorize(UserRole.ORG_OWNER));

// GET /api/v1/api-keys
apiKeysRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const db = await getTenantDB(req.user!.orgId!);
    const ApiKey = getApiKeyModel(db);
    const keys = await ApiKey.find({ orgId: req.user!.orgId }).sort({ createdAt: -1 });
    sendSuccess(res, keys, 'API keys retrieved');
  })
);

// GET /api/v1/api-keys/permissions — list all available permissions
apiKeysRouter.get(
  '/permissions',
  asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, API_PERMISSIONS, 'Available permissions');
  })
);

// POST /api/v1/api-keys
apiKeysRouter.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { name, permissions, expiresInDays } = z
      .object({
        name: z.string().min(1).max(100),
        permissions: z.array(z.enum(API_PERMISSIONS)).min(1),
        expiresInDays: z.number().int().positive().optional(),
      })
      .parse(req.body);

    const db = await getTenantDB(req.user!.orgId!);
    const ApiKey = getApiKeyModel(db);

    // Generate key: bz_live_<orgId>_<random>
    const rawKey = `bz_live_${req.user!.orgId}_${crypto.randomBytes(24).toString('base64url')}`;
    const keyPrefix = rawKey.substring(0, 12) + '...';
    const hashedKey = hashApiKey(rawKey);

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : undefined;

    const apiKey = await ApiKey.create({
      orgId: req.user!.orgId,
      name,
      permissions,
      keyPrefix,
      hashedKey,
      isActive: true,
      createdBy: req.user!.userId,
      ...(expiresAt && { expiresAt }),
    });

    const created = apiKey.toObject() as unknown as { hashedKey?: string } & Record<
      string,
      unknown
    >;
    delete created.hashedKey;

    sendSuccess(
      res,
      {
        ...created,
        key: rawKey, // raw key only shown once!
      },
      'API key created — save this key, it will not be shown again',
      201
    );
  })
);

// PATCH /api/v1/api-keys/:id/deactivate
apiKeysRouter.patch(
  '/:id/deactivate',
  asyncHandler(async (req: Request, res: Response) => {
    const db = await getTenantDB(req.user!.orgId!);
    const ApiKey = getApiKeyModel(db);
    const key = await ApiKey.findOneAndUpdate(
      { _id: req.params.id, orgId: req.user!.orgId },
      { isActive: false },
      { new: true }
    );
    if (!key) throw new AppError('API key not found', 404, 'NOT_FOUND');
    sendSuccess(res, key, 'API key deactivated');
  })
);

// DELETE /api/v1/api-keys/:id
apiKeysRouter.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const db = await getTenantDB(req.user!.orgId!);
    const ApiKey = getApiKeyModel(db);
    await ApiKey.findOneAndDelete({ _id: req.params.id, orgId: req.user!.orgId });
    sendSuccess(res, null, 'API key deleted');
  })
);
