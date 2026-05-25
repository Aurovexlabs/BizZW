import { Request, Response, Router } from 'express';
import mongoose, { Connection, Document, Schema } from 'mongoose';
import { z } from 'zod';
import { getTenantDB } from '../../lib/db';
import { sendEmail } from '../../lib/resend';
import { authenticate } from '../../middleware/auth.middleware';
import { asyncHandler, sendSuccess } from '../../middleware/error.middleware';
import { NotificationChannel, NotificationType } from '../../shared/types';

// ─── Schema ───────────────────────────────────────────────────

interface NotificationDocument extends Document {
  orgId: string;
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  channel: NotificationChannel;
  createdAt: Date;
}

const NotificationSchema = new Schema<NotificationDocument>(
  {
    orgId: { type: String, required: true, index: true },
    userId: { type: String, index: true },
    type: { type: String, enum: Object.values(NotificationType), required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
    read: { type: Boolean, default: false, index: true },
    channel: {
      type: String,
      enum: Object.values(NotificationChannel),
      default: NotificationChannel.IN_APP,
    },
  },
  { timestamps: true }
);

const notificationModels = new Map<string, mongoose.Model<NotificationDocument>>();

function getNotificationModel(db: Connection) {
  const key = db.name;
  if (!notificationModels.has(key)) {
    notificationModels.set(key, db.model<NotificationDocument>('Notification', NotificationSchema));
  }
  return notificationModels.get(key)!;
}

// ─── Service functions ────────────────────────────────────────

export async function createNotification(
  orgId: string,
  data: {
    type: NotificationType;
    title: string;
    message: string;
    userId?: string;
    channel?: NotificationChannel;
    emailTo?: string;
    metadata?: Record<string, unknown>;
  }
) {
  const db = await getTenantDB(orgId);
  const Notification = getNotificationModel(db);

  const notification = await Notification.create({
    orgId,
    userId: data.userId,
    type: data.type,
    title: data.title,
    message: data.message,
    data: data.metadata,
    channel: data.channel || NotificationChannel.IN_APP,
    read: false,
  });

  // Send email notification if requested
  if (
    data.emailTo &&
    (data.channel === NotificationChannel.EMAIL || data.channel === NotificationChannel.BOTH)
  ) {
    await sendEmail({
      to: data.emailTo,
      subject: `[BizZW] ${data.title}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="background: #1e40af; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 20px;">BizZW Notification</h1>
          </div>
          <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: 0;">
            <h2 style="color: #1e293b; margin: 0 0 12px;">${data.title}</h2>
            <p style="color: #475569; margin: 0 0 20px; line-height: 1.6;">${data.message}</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              This is an automated notification from BizZW. 
              <a href="${process.env.CLIENT_URL}/settings/notifications" style="color: #1e40af;">Manage preferences</a>
            </p>
          </div>
        </div>
      `,
    }).catch(() => {
      /* Don't fail if email fails */
    });
  }

  return notification;
}

export async function createSystemNotification(
  orgId: string,
  type: NotificationType,
  title: string,
  message: string
) {
  return createNotification(orgId, { type, title, message });
}

// ─── Router ───────────────────────────────────────────────────

export const notificationsRouter = Router();
notificationsRouter.use(authenticate);

// GET /api/v1/notifications — list user's notifications
notificationsRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { orgId, userId } = req.user!;
    const {
      page = 1,
      limit = 20,
      unreadOnly,
    } = z
      .object({
        page: z.coerce.number().default(1),
        limit: z.coerce.number().max(50).default(20),
        unreadOnly: z.coerce.boolean().optional(),
      })
      .parse(req.query);

    const db = await getTenantDB(orgId!);
    const Notification = getNotificationModel(db);

    const filter: Record<string, unknown> = {
      $or: [{ userId }, { userId: { $exists: false } }],
    };
    if (unreadOnly) filter.read = false;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Notification.countDocuments(filter),
      Notification.countDocuments({ ...filter, read: false }),
    ]);

    sendSuccess(res, notifications, 'Notifications retrieved', 200, {
      total,
      page,
      limit,
      unreadCount,
      totalPages: Math.ceil(total / limit),
    });
  })
);

// PATCH /api/v1/notifications/:id/read — mark one as read
notificationsRouter.patch(
  '/:id/read',
  asyncHandler(async (req: Request, res: Response) => {
    const db = await getTenantDB(req.user!.orgId!);
    const Notification = getNotificationModel(db);
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    sendSuccess(res, null, 'Marked as read');
  })
);

// PATCH /api/v1/notifications/read-all — mark all as read
notificationsRouter.patch(
  '/read-all',
  asyncHandler(async (req: Request, res: Response) => {
    const { orgId, userId } = req.user!;
    const db = await getTenantDB(orgId!);
    const Notification = getNotificationModel(db);
    await Notification.updateMany(
      { $or: [{ userId }, { userId: { $exists: false } }], read: false },
      { read: true }
    );
    sendSuccess(res, null, 'All notifications marked as read');
  })
);

// DELETE /api/v1/notifications/:id
notificationsRouter.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const db = await getTenantDB(req.user!.orgId!);
    const Notification = getNotificationModel(db);
    await Notification.findByIdAndDelete(req.params.id);
    sendSuccess(res, null, 'Notification deleted');
  })
);

// GET /api/v1/notifications/unread-count
notificationsRouter.get(
  '/unread-count',
  asyncHandler(async (req: Request, res: Response) => {
    const { orgId, userId } = req.user!;
    const db = await getTenantDB(orgId!);
    const Notification = getNotificationModel(db);
    const count = await Notification.countDocuments({
      $or: [{ userId }, { userId: { $exists: false } }],
      read: false,
    });
    sendSuccess(res, { count }, 'Unread count retrieved');
  })
);
