import * as authController from './auth.controller';

import { authenticate, authorize } from '../../middleware/auth.middleware';

import { Router } from 'express';
import { authRateLimiter } from '../../middleware/rateLimiter.middleware';
import { UserRole } from '../../shared/types';
import { profileRouter } from './profile.router';

export const authRouter = Router();

// Public routes (rate limited)
authRouter.post('/register', authRateLimiter, authController.register);
authRouter.post('/login', authRateLimiter, authController.login);
authRouter.post('/refresh', authController.refresh);
authRouter.post('/logout', authController.logout);
authRouter.post('/forgot-password', authRateLimiter, authController.forgotPassword);
authRouter.post('/reset-password/:token', authRateLimiter, authController.resetPassword);
authRouter.post('/verify-email/:token', authRateLimiter, authController.verifyEmail);
authRouter.post('/verify-email-otp', authRateLimiter, authController.verifyEmailOtp);
authRouter.post('/resend-verification', authRateLimiter, authController.resendVerification);
authRouter.post('/accept-invite/:token', authController.acceptInvite);

// Protected routes
authRouter.get('/me', authenticate, authController.getMe);
authRouter.post(
  '/invite',
  authenticate,
  authorize(UserRole.ORG_OWNER, UserRole.ORG_ADMIN),
  authController.invite
);
authRouter.get(
  '/team',
  authenticate,
  authorize(UserRole.ORG_OWNER, UserRole.ORG_ADMIN),
  authController.getTeamMembers
);
authRouter.patch(
  '/team/:memberId',
  authenticate,
  authorize(UserRole.ORG_OWNER, UserRole.ORG_ADMIN),
  authController.updateTeamMember
);
authRouter.delete(
  '/team/:memberId',
  authenticate,
  authorize(UserRole.ORG_OWNER),
  authController.removeTeamMember
);

// Profile routes
authRouter.use(profileRouter);
