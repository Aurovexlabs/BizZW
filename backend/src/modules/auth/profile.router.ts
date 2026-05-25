import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { authenticate } from '../../middleware/auth.middleware';
import { asyncHandler, sendSuccess, AppError } from '../../middleware/error.middleware';
import { getTenantDB } from '../../lib/db';
import { getUserModel } from '../auth/user.model';

// This router handles profile-specific endpoints separate from the main auth router

const profileRouter = Router();
profileRouter.use(authenticate);

// PATCH /api/v1/auth/profile — update name, avatar
profileRouter.patch(
  '/profile',
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      name: z.string().min(2).max(100).optional(),
      avatar: z.object({ fileId: z.string(), filePath: z.string() }).optional(),
    });

    const validated = schema.parse(req.body);
    const { userId, orgId } = req.user!;

    const db = await getTenantDB(orgId!);
    const User = getUserModel(db);
    const user = await User.findByIdAndUpdate(userId, validated, { new: true }).select('-passwordHash');

    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
    sendSuccess(res, user, 'Profile updated');
  })
);

// PATCH /api/v1/auth/change-password
profileRouter.patch(
  '/change-password',
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8).max(128),
    });

    const { currentPassword, newPassword } = schema.parse(req.body);
    const { userId, orgId } = req.user!;

    const db = await getTenantDB(orgId!);
    const User = getUserModel(db);
    const user = await User.findById(userId);
    if (!user || !user.passwordHash) throw new AppError('User not found', 404, 'NOT_FOUND');

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) throw new AppError('Current password is incorrect', 400, 'WRONG_PASSWORD');

    const newHash = await bcrypt.hash(newPassword, 12);
    await User.updateOne({ _id: userId }, { passwordHash: newHash });

    sendSuccess(res, null, 'Password changed successfully');
  })
);

export { profileRouter };
