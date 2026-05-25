import * as authService from './auth.service';

import { NextFunction, Request, Response } from 'express';
import { AppError, asyncHandler, sendSuccess } from '../../middleware/error.middleware';
import { Currency, UserRole } from '../../shared/types';

import { z } from 'zod';
import { getTenantDB } from '../../lib/db';
import { Tenant } from './tenant.model';
import { getUserModel } from './user.model';

// ─── Validation Schemas ───────────────────────────────────────

const registerSchema = z.object({
  businessName: z.string().min(2).max(100),
  ownerName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  businessType: z.string().optional(),
  currency: z.nativeEnum(Currency).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum([UserRole.ORG_ADMIN, UserRole.ACCOUNTANT, UserRole.CASHIER, UserRole.VIEWER]),
});

const acceptInviteSchema = z.object({
  name: z.string().min(2).max(100),
  password: z.string().min(8).max(128),
  orgId: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  password: z.string().min(8).max(128),
  orgId: z.string().min(1),
});

const verifyEmailLegacySchema = z.object({
  orgId: z.string().optional(),
});

const verifyEmailOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().min(4).max(10),
  orgId: z.string().optional(),
});

const resendVerificationSchema = z.object({
  email: z.string().email(),
  orgId: z.string().min(1).optional(),
});

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// ─── Controllers ─────────────────────────────────────────────

export const register = asyncHandler(async (req: Request, res: Response) => {
  const body = registerSchema.parse(req.body);
  const result = await authService.registerBusiness(body);

  if ('accessToken' in result) {
    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
    sendSuccess(
      res,
      { user: result.user, tenant: result.tenant, accessToken: result.accessToken },
      'Business registered successfully',
      201
    );
    return;
  }

  sendSuccess(
    res,
    result,
    result.verificationEmailSent
      ? 'Business registered. Enter the OTP from your email to activate sign-in.'
      : 'Business registered. Verification OTP delivery is pending, use resend if needed.',
    201
  );
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const body = loginSchema.parse(req.body);
  const result = await authService.loginUser(body);

  res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
  sendSuccess(
    res,
    { user: result.user, tenant: result.tenant, accessToken: result.accessToken },
    'Login successful'
  );
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken as string | undefined;
  if (!refreshToken) throw new AppError('No refresh token provided', 401, 'NO_REFRESH_TOKEN');

  const accessToken = await authService.refreshAccessToken(refreshToken);
  sendSuccess(res, { accessToken }, 'Token refreshed');
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  });
  sendSuccess(res, null, 'Logged out successfully');
});

export const invite = asyncHandler(async (req: Request, res: Response) => {
  const body = inviteSchema.parse(req.body);
  const { orgId, userId } = req.user!;

  // Get inviter name and org name
  const tenantDB = await getTenantDB(orgId);
  const User = getUserModel(tenantDB);
  const [inviter, tenant] = await Promise.all([User.findById(userId), Tenant.findOne({ orgId })]);

  if (!inviter || !tenant) throw new AppError('Inviter not found', 404, 'NOT_FOUND');

  const result = await authService.inviteStaffMember(
    orgId,
    inviter.name,
    tenant.name,
    body.email,
    body.role
  );
  sendSuccess(res, result, 'Invitation sent successfully');
});

export const acceptInvite = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params;
  const body = acceptInviteSchema.parse(req.body);

  const result = await authService.acceptInvitation(token, body.name, body.password, body.orgId);
  res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
  sendSuccess(
    res,
    { user: result.user, tenant: result.tenant, accessToken: result.accessToken },
    'Invitation accepted'
  );
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = forgotPasswordSchema.parse(req.body);
  await authService.forgotPassword(email);
  // Always return success to prevent email enumeration
  sendSuccess(res, null, 'If an account with that email exists, a reset link has been sent.');
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params;
  const body = resetPasswordSchema.parse(req.body);
  await authService.resetPassword(token, body.orgId, body.password);
  sendSuccess(res, null, 'Password reset successfully');
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params;
  const body = verifyEmailLegacySchema.parse(req.body);
  const result = await authService.verifyEmailAddress(token, body.orgId || '');
  sendSuccess(res, result, 'Email verification link is no longer supported');
});

export const verifyEmailOtp = asyncHandler(async (req: Request, res: Response) => {
  const body = verifyEmailOtpSchema.parse(req.body);
  const result = await authService.verifyEmailAddressWithOtp(body);
  sendSuccess(res, result, 'Email verified successfully');
});

export const resendVerification = asyncHandler(async (req: Request, res: Response) => {
  const body = resendVerificationSchema.parse(req.body);
  await authService.resendEmailVerification(body.email, body.orgId);
  sendSuccess(res, null, 'If an account exists, a verification code has been sent.');
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const { userId, orgId } = req.user!;

  const [tenantDB, tenant] = await Promise.all([getTenantDB(orgId), Tenant.findOne({ orgId })]);

  const User = getUserModel(tenantDB);
  const user = await User.findById(userId).select(
    '-passwordHash -inviteToken -resetToken -emailVerificationOtpHash -emailVerificationOtpExpiry -emailVerificationOtpAttempts -emailVerificationResendWindowStart -emailVerificationResendCount -emailVerificationSentAt'
  );
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

  sendSuccess(res, { user, tenant }, 'User profile retrieved');
});

export const getTeamMembers = asyncHandler(async (req: Request, res: Response) => {
  const { orgId } = req.user!;
  const tenantDB = await getTenantDB(orgId);
  const User = getUserModel(tenantDB);

  const users = await User.find({})
    .select(
      '-passwordHash -inviteToken -resetToken -emailVerificationOtpHash -emailVerificationOtpExpiry -emailVerificationOtpAttempts -emailVerificationResendWindowStart -emailVerificationResendCount -emailVerificationSentAt'
    )
    .sort({ createdAt: -1 });
  sendSuccess(res, users, 'Team members retrieved');
});

export const updateTeamMember = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { memberId } = req.params;
    const { orgId } = req.user!;

    const updateSchema = z.object({
      name: z.string().min(2).max(100).optional(),
      role: z.nativeEnum(UserRole).optional(),
      isActive: z.boolean().optional(),
    });

    const body = updateSchema.parse(req.body);
    const tenantDB = await getTenantDB(orgId);
    const User = getUserModel(tenantDB);

    const existingUser = await User.findById(memberId).select('isActive');
    if (!existingUser) throw new AppError('Team member not found', 404, 'NOT_FOUND');

    if (body.isActive === true && !existingUser.isActive) {
      await authService.enforceTeamMemberReactivationLimit(orgId, memberId);
    }

    const user = await User.findByIdAndUpdate(memberId, body, { new: true }).select(
      '-passwordHash'
    );
    if (!user) throw new AppError('Team member not found', 404, 'NOT_FOUND');

    sendSuccess(res, user, 'Team member updated');
  }
);

export const removeTeamMember = asyncHandler(async (req: Request, res: Response) => {
  const { memberId } = req.params;
  const { orgId, userId } = req.user!;

  if (memberId === userId) throw new AppError('You cannot remove yourself', 400, 'SELF_REMOVE');

  const tenantDB = await getTenantDB(orgId);
  const User = getUserModel(tenantDB);

  const user = await User.findById(memberId);
  if (!user) throw new AppError('Team member not found', 404, 'NOT_FOUND');
  if (user.role === UserRole.ORG_OWNER)
    throw new AppError('Cannot remove the organization owner', 400, 'CANNOT_REMOVE_OWNER');

  await User.findByIdAndUpdate(memberId, { isActive: false });
  sendSuccess(res, null, 'Team member removed');
});
