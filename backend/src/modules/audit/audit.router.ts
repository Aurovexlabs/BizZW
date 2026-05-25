import { Request, Response, Router } from 'express';
import mongoose, { Connection, Document, Schema } from 'mongoose';
import { z } from 'zod';
import { getTenantDB } from '../../lib/db';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { asyncHandler, sendSuccess } from '../../middleware/error.middleware';
import { AuditAction, UserRole } from '../../shared/types';

// ─── Schema ───────────────────────────────────────────────────

interface AuditLogDocument extends Document {
  orgId: string;
  userId: string;
  userName: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<AuditLogDocument>(
  {
    orgId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    action: { type: String, enum: Object.values(AuditAction), required: true, index: true },
    resource: { type: String, required: true, index: true },
    resourceId: { type: String },
    description: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

// TTL index: auto-delete logs older than 2 years (compliance)
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 730 });

const auditModels = new Map<string, mongoose.Model<AuditLogDocument>>();

export function getAuditModel(db: Connection) {
  const key = db.name;
  if (!auditModels.has(key)) {
    auditModels.set(key, db.model<AuditLogDocument>('AuditLog', AuditLogSchema));
  }
  return auditModels.get(key)!;
}

// ─── Service: log an action ───────────────────────────────────

export async function logAudit(
  orgId: string,
  userId: string,
  userName: string,
  action: AuditAction,
  resource: string,
  description: string,
  opts?: {
    resourceId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }
) {
  try {
    const db = await getTenantDB(orgId);
    const AuditLog = getAuditModel(db);
    await AuditLog.create({
      orgId,
      userId,
      userName,
      action,
      resource,
      description,
      resourceId: opts?.resourceId,
      metadata: opts?.metadata,
      ipAddress: opts?.ipAddress,
      userAgent: opts?.userAgent,
    });
  } catch {
    // Never let audit logging break main operations
  }
}

// ─── Express middleware: auto-log requests ────────────────────

export function auditMiddleware(
  resource: string,
  action: AuditAction,
  getDescription: (req: Request) => string
) {
  return (req: Request, res: Response, next: () => void) => {
    res.once('finish', () => {
      // Only log successful mutations
      if (res.statusCode < 400 && req.user) {
        logAudit(
          req.user.orgId,
          req.user.userId,
          req.user.name || req.user.email,
          action,
          resource,
          getDescription(req),
          {
            resourceId: req.params.id,
            ipAddress: req.ip || req.socket.remoteAddress,
            userAgent: req.headers['user-agent'],
          }
        ).catch(() => {});
      }
    });

    next();
  };
}

// ─── Router ───────────────────────────────────────────────────

export const auditRouter = Router();
auditRouter.use(authenticate);

// GET /api/v1/audit — list audit logs (admin only)
auditRouter.get(
  '/',
  authorize(UserRole.ORG_OWNER, UserRole.ORG_ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const { orgId } = req.user!;
    const {
      page = 1,
      limit = 50,
      userId,
      action,
      resource,
      startDate,
      endDate,
    } = z
      .object({
        page: z.coerce.number().default(1),
        limit: z.coerce.number().max(100).default(50),
        userId: z.string().optional(),
        action: z.nativeEnum(AuditAction).optional(),
        resource: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
      .parse(req.query);

    const db = await getTenantDB(orgId!);
    const AuditLog = getAuditModel(db);

    const filter: Record<string, unknown> = {};
    if (userId) filter.userId = userId;
    if (action) filter.action = action;
    if (resource) filter.resource = resource;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) (filter.createdAt as Record<string, unknown>).$gte = new Date(startDate);
      if (endDate)
        (filter.createdAt as Record<string, unknown>).$lte = new Date(endDate + 'T23:59:59Z');
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      AuditLog.countDocuments(filter),
    ]);

    sendSuccess(res, logs, 'Audit logs retrieved', 200, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  })
);

// GET /api/v1/audit/stats — action counts over time
auditRouter.get(
  '/stats',
  authorize(UserRole.ORG_OWNER, UserRole.ORG_ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const { orgId } = req.user!;
    const db = await getTenantDB(orgId!);
    const AuditLog = getAuditModel(db);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [byAction, byUser, timeline] = await Promise.all([
      AuditLog.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AuditLog.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { userId: '$userId', userName: '$userName' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      AuditLog.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    sendSuccess(res, { byAction, byUser, timeline }, 'Audit stats retrieved');
  })
);
