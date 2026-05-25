import { getTenantDB, getTenantDbName } from '../../lib/db';
import {
  emailVerificationOtpTemplate,
  inviteEmailTemplate,
  passwordResetTemplate,
  sendEmail,
  welcomeEmailTemplate,
} from '../../lib/resend';
import {
  AuthTokenPayload,
  Currency,
  PLAN_LIMITS,
  PlanType,
  TenantStatus,
  UserRole,
} from '../../shared/types';
import { Subscription, Tenant } from './tenant.model';
import { UserDocument, getUserModel } from './user.model';

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { logger } from '../../lib/logger';
import { AppError } from '../../middleware/error.middleware';

const SALT_ROUNDS = 12;
const EMAIL_VERIFICATION_OTP_LENGTH = 6;
const EMAIL_VERIFICATION_OTP_TTL_MS = 10 * 60 * 1000;
const EMAIL_VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;
const EMAIL_VERIFICATION_MAX_ATTEMPTS = 5;
const EMAIL_VERIFICATION_RESEND_WINDOW_MS = 60 * 60 * 1000;
const EMAIL_VERIFICATION_MAX_RESENDS_PER_WINDOW = 5;

async function getUserSeatLimit(orgId: string): Promise<{ plan: PlanType; maxUsers: number }> {
  const tenant = await Tenant.findOne({ orgId }).select('plan');
  if (!tenant) throw new AppError('Tenant not found', 404, 'NOT_FOUND');

  return {
    plan: tenant.plan,
    maxUsers: PLAN_LIMITS[tenant.plan].maxUsers,
  };
}

async function enforceInviteSeatLimit(
  orgId: string,
  User: ReturnType<typeof getUserModel>
): Promise<void> {
  const { plan, maxUsers } = await getUserSeatLimit(orgId);
  if (maxUsers === -1) return;

  const now = new Date();
  const [activeUsers, pendingInvites] = await Promise.all([
    User.countDocuments({ isActive: true }),
    User.countDocuments({
      isActive: false,
      inviteToken: { $exists: true, $ne: null },
      inviteTokenExpiry: { $gt: now },
    }),
  ]);

  if (activeUsers + pendingInvites >= maxUsers) {
    throw new AppError(
      `User limit reached for your ${plan} plan (${maxUsers} users). Please upgrade.`,
      402,
      'USER_LIMIT_REACHED'
    );
  }
}

async function enforceActivationSeatLimit(
  orgId: string,
  User: ReturnType<typeof getUserModel>,
  userId: string
): Promise<void> {
  const { plan, maxUsers } = await getUserSeatLimit(orgId);
  if (maxUsers === -1) return;

  const activeUsers = await User.countDocuments({
    isActive: true,
    _id: { $ne: userId },
  });

  if (activeUsers >= maxUsers) {
    throw new AppError(
      `User limit reached for your ${plan} plan (${maxUsers} users). Please upgrade.`,
      402,
      'USER_LIMIT_REACHED'
    );
  }
}

export async function enforceTeamMemberReactivationLimit(
  orgId: string,
  userId: string
): Promise<void> {
  const tenantDB = await getTenantDB(orgId);
  const User = getUserModel(tenantDB);
  await enforceActivationSeatLimit(orgId, User, userId);
}

function generateOrgId(): string {
  return crypto.randomBytes(4).toString('hex');
}

function generateEmailVerificationOtp(): string {
  const forcedOtp = process.env.NODE_ENV === 'test' ? process.env.EMAIL_VERIFICATION_TEST_CODE : '';
  const forcedPattern = new RegExp(`^\\d{${EMAIL_VERIFICATION_OTP_LENGTH}}$`);

  if (forcedOtp && forcedPattern.test(forcedOtp)) {
    return forcedOtp;
  }

  const upperBound = 10 ** EMAIL_VERIFICATION_OTP_LENGTH;
  return crypto.randomInt(0, upperBound).toString().padStart(EMAIL_VERIFICATION_OTP_LENGTH, '0');
}

function hashEmailVerificationOtp(otp: string): string {
  const secret = process.env.EMAIL_OTP_SECRET || process.env.JWT_ACCESS_SECRET || 'bizzw-email-otp';
  return crypto.createHmac('sha256', secret).update(otp).digest('hex');
}

function normalizeOtp(otp: string): string {
  return otp.replace(/\s+/g, '').trim();
}

function isEmailVerificationOtpMatch(otp: string, storedHash: string): boolean {
  const candidateHash = hashEmailVerificationOtp(otp);
  const candidate = Buffer.from(candidateHash, 'hex');
  const stored = Buffer.from(storedHash, 'hex');

  if (candidate.length !== stored.length) {
    return false;
  }

  return crypto.timingSafeEqual(candidate, stored);
}

function shouldAutoVerifyEmailInCurrentEnvironment(): boolean {
  if (process.env.AUTH_AUTO_VERIFY_EMAIL === 'true') {
    return true;
  }

  if (process.env.AUTH_AUTO_VERIFY_EMAIL === 'false') {
    return false;
  }

  return process.env.NODE_ENV === 'test';
}

function getOtpExpiryDate(): Date {
  return new Date(Date.now() + EMAIL_VERIFICATION_OTP_TTL_MS);
}

async function resolveOrgIdForEmail(email: string, orgId?: string): Promise<string | undefined> {
  if (orgId) {
    return orgId;
  }

  const tenant = await Tenant.findOne({ email });
  return tenant?.orgId;
}

function signAccessToken(payload: AuthTokenPayload): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET not set');
  return jwt.sign(payload, secret, {
    expiresIn: (process.env.JWT_ACCESS_EXPIRES as jwt.SignOptions['expiresIn']) || '15m',
  });
}

function signRefreshToken(payload: AuthTokenPayload): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET not set');
  return jwt.sign(payload, secret, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES as jwt.SignOptions['expiresIn']) || '7d',
  });
}

export interface RegisterInput {
  businessName: string;
  ownerName: string;
  email: string;
  password: string;
  businessType?: string;
  currency?: Currency;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// ─── Register ─────────────────────────────────────────────────

export async function registerBusiness(input: RegisterInput) {
  const {
    businessName,
    ownerName,
    email,
    password,
    businessType = 'retail',
    currency = Currency.USD,
  } = input;

  // Check no existing tenant with this email
  const existing = await Tenant.findOne({ email: email.toLowerCase() });
  if (existing)
    throw new AppError('A business with this email already exists', 409, 'DUPLICATE_EMAIL');

  const orgId = generateOrgId();
  const dbName = getTenantDbName(orgId);

  // Create tenant in master DB
  const tenant = await Tenant.create({
    orgId,
    name: businessName,
    email: email.toLowerCase(),
    plan: PlanType.STARTER,
    status: TenantStatus.TRIAL,
    dbName,
    settings: { currency, taxRate: 15, businessType, timezone: 'Africa/Harare' },
  });

  // Create initial subscription (30-day trial)
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 30);
  await Subscription.create({
    tenantId: tenant._id,
    plan: PlanType.STARTER,
    status: 'ACTIVE',
    startDate: new Date(),
    endDate: trialEnd,
    amount: 0,
  });

  // Create owner user in tenant DB
  const tenantDB = await getTenantDB(orgId);
  const User = getUserModel(tenantDB);
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const autoVerifyEmail = shouldAutoVerifyEmailInCurrentEnvironment();
  const verificationOtp = autoVerifyEmail ? undefined : generateEmailVerificationOtp();
  const verificationOtpHash = verificationOtp
    ? hashEmailVerificationOtp(verificationOtp)
    : undefined;
  const verificationExpiry = autoVerifyEmail ? undefined : getOtpExpiryDate();
  const now = new Date();

  const user = await User.create({
    name: ownerName,
    email: email.toLowerCase(),
    passwordHash,
    role: UserRole.ORG_OWNER,
    isActive: true,
    emailVerified: autoVerifyEmail,
    emailVerificationOtpHash: verificationOtpHash,
    emailVerificationOtpExpiry: verificationExpiry,
    emailVerificationOtpAttempts: 0,
    emailVerificationResendWindowStart: autoVerifyEmail ? undefined : now,
    emailVerificationResendCount: autoVerifyEmail ? 0 : 1,
    emailVerificationSentAt: autoVerifyEmail ? undefined : now,
  });

  if (!autoVerifyEmail) {
    let verificationEmailSent = false;

    if (verificationOtp) {
      try {
        await sendEmail({
          to: email,
          subject: `Your BizZW verification code`,
          html: emailVerificationOtpTemplate(
            ownerName,
            businessName,
            verificationOtp,
            Math.ceil(EMAIL_VERIFICATION_OTP_TTL_MS / (60 * 1000))
          ),
        });
        verificationEmailSent = true;
      } catch (error) {
        logger.warn(
          { err: error, email: email.toLowerCase(), orgId },
          'Verification email delivery failed after fallback attempts'
        );
      }
    }

    return {
      requiresEmailVerification: true as const,
      verificationEmailSent,
      verificationMethod: 'otp' as const,
      otpLength: EMAIL_VERIFICATION_OTP_LENGTH,
      otpExpiresInSeconds: Math.floor(EMAIL_VERIFICATION_OTP_TTL_MS / 1000),
      email: email.toLowerCase(),
      orgId,
    };
  }

  // In test environments we auto-verify to keep integration tests deterministic.
  await sendEmail({
    to: email,
    subject: `Welcome to BizZW, ${ownerName}! 🇿🇼`,
    html: welcomeEmailTemplate(ownerName, businessName),
  }).catch((err) => {
    logger.warn({ err, email: email.toLowerCase(), orgId }, 'Welcome email failed');
  });

  const tokenPayload: AuthTokenPayload = {
    userId: String(user._id),
    orgId,
    role: UserRole.ORG_OWNER,
    email: email.toLowerCase(),
    name: ownerName,
  };

  return {
    user: sanitizeUser(user),
    tenant: sanitizeTenant(tenant),
    accessToken: signAccessToken(tokenPayload),
    refreshToken: signRefreshToken(tokenPayload),
  };
}

// ─── Login ────────────────────────────────────────────────────

export async function loginUser(input: LoginInput) {
  const { email, password } = input;

  // Find tenant by email
  const tenant = await Tenant.findOne({ email: email.toLowerCase() });
  if (!tenant) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

  if (tenant.status === TenantStatus.SUSPENDED) {
    throw new AppError(
      'Your account has been suspended. Contact support.',
      403,
      'ACCOUNT_SUSPENDED'
    );
  }

  // Find user in tenant DB
  const tenantDB = await getTenantDB(tenant.orgId);
  const User = getUserModel(tenantDB);
  const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
  if (!user) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  if (!user.passwordHash)
    throw new AppError('Please accept your invitation before logging in', 400, 'NO_PASSWORD');
  if (!user.emailVerified) {
    throw new AppError(
      'Email not verified. Enter the OTP sent to your email before signing in.',
      403,
      'EMAIL_NOT_VERIFIED'
    );
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

  // Update last login
  await User.updateOne({ _id: user._id }, { lastLogin: new Date() });

  const tokenPayload: AuthTokenPayload = {
    userId: String(user._id),
    orgId: tenant.orgId,
    role: user.role,
    email: user.email,
    name: user.name,
  };

  return {
    user: sanitizeUser(user),
    tenant: sanitizeTenant(tenant),
    accessToken: signAccessToken(tokenPayload),
    refreshToken: signRefreshToken(tokenPayload),
  };
}

// ─── Refresh Token ────────────────────────────────────────────

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET not set');

  let payload: AuthTokenPayload;
  try {
    payload = jwt.verify(refreshToken, secret) as AuthTokenPayload;
  } catch {
    throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  // Verify user still exists and is active
  const tenantDB = await getTenantDB(payload.orgId);
  const User = getUserModel(tenantDB);
  const user = await User.findById(payload.userId);
  if (!user || !user.isActive)
    throw new AppError('User not found or inactive', 401, 'USER_NOT_FOUND');
  if (!user.emailVerified) {
    throw new AppError('Email not verified', 403, 'EMAIL_NOT_VERIFIED');
  }

  return signAccessToken({
    userId: payload.userId,
    orgId: payload.orgId,
    role: user.role,
    email: user.email,
  });
}

// ─── Invite Staff ─────────────────────────────────────────────

export async function inviteStaffMember(
  orgId: string,
  inviterName: string,
  orgName: string,
  email: string,
  role: UserRole
) {
  const tenantDB = await getTenantDB(orgId);
  const User = getUserModel(tenantDB);

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing)
    throw new AppError(
      'A user with this email already exists in your organization',
      409,
      'DUPLICATE_USER'
    );

  await enforceInviteSeatLimit(orgId, User);

  const inviteToken = crypto.randomBytes(32).toString('hex');
  const inviteTokenExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

  await User.create({
    name: email.split('@')[0], // Placeholder name until they accept
    email: email.toLowerCase(),
    role,
    isActive: false,
    inviteToken,
    inviteTokenExpiry,
  });

  const inviteUrl = `${process.env.CLIENT_URL}/invite/${inviteToken}`;

  await sendEmail({
    to: email,
    subject: `You've been invited to join ${orgName} on BizZW`,
    html: inviteEmailTemplate(inviterName, orgName, inviteUrl, role),
  });

  return { message: 'Invitation sent successfully' };
}

// ─── Accept Invite ────────────────────────────────────────────

export async function acceptInvitation(
  token: string,
  name: string,
  password: string,
  orgId: string
) {
  const tenantDB = await getTenantDB(orgId);
  const User = getUserModel(tenantDB);

  const user = await User.findOne({
    inviteToken: token,
    inviteTokenExpiry: { $gt: new Date() },
  });
  if (!user) throw new AppError('Invalid or expired invitation link', 400, 'INVALID_INVITE_TOKEN');

  await enforceActivationSeatLimit(orgId, User, String(user._id));

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        name,
        passwordHash,
        isActive: true,
        emailVerified: true,
        emailVerificationOtpAttempts: 0,
        emailVerificationResendCount: 0,
      },
      $unset: {
        emailVerificationOtpHash: 1,
        emailVerificationOtpExpiry: 1,
        emailVerificationResendWindowStart: 1,
        emailVerificationSentAt: 1,
        inviteToken: 1,
        inviteTokenExpiry: 1,
      },
    }
  );

  const tenant = await Tenant.findOne({ orgId });

  const tokenPayload: AuthTokenPayload = {
    userId: String(user._id),
    orgId,
    role: user.role,
    email: user.email,
    name,
  };

  return {
    user: { ...sanitizeUser(user), name },
    tenant: tenant ? sanitizeTenant(tenant) : null,
    accessToken: signAccessToken(tokenPayload),
    refreshToken: signRefreshToken(tokenPayload),
  };
}

// ─── Verify Email ────────────────────────────────────────────

export async function verifyEmailAddress(_token: string, _orgId: string) {
  throw new AppError(
    'Verification links are disabled. Request and enter a one-time code instead.',
    410,
    'VERIFICATION_LINK_DEPRECATED'
  );
}

export interface VerifyEmailOtpInput {
  email: string;
  otp: string;
  orgId?: string;
}

export async function verifyEmailAddressWithOtp(input: VerifyEmailOtpInput) {
  const normalizedEmail = input.email.toLowerCase();
  const normalizedOtp = normalizeOtp(input.otp);
  const otpPattern = new RegExp(`^\\d{${EMAIL_VERIFICATION_OTP_LENGTH}}$`);

  if (!otpPattern.test(normalizedOtp)) {
    throw new AppError('Invalid verification code. Please try again.', 400, 'INVALID_OTP');
  }

  const resolvedOrgId = await resolveOrgIdForEmail(normalizedEmail, input.orgId);
  if (!resolvedOrgId) {
    throw new AppError('Invalid verification code. Please try again.', 400, 'INVALID_OTP');
  }

  const tenantDB = await getTenantDB(resolvedOrgId);
  const User = getUserModel(tenantDB);
  const user = await User.findOne({ email: normalizedEmail, isActive: true });

  if (!user) {
    throw new AppError('Invalid verification code. Please try again.', 400, 'INVALID_OTP');
  }

  if (user.emailVerified) {
    return {
      verified: true,
      email: user.email,
    };
  }

  if (!user.emailVerificationOtpHash || !user.emailVerificationOtpExpiry) {
    throw new AppError('Verification code expired. Request a new code.', 400, 'EXPIRED_OTP');
  }

  if (user.emailVerificationOtpExpiry.getTime() <= Date.now()) {
    throw new AppError('Verification code expired. Request a new code.', 400, 'EXPIRED_OTP');
  }

  const failedAttempts = user.emailVerificationOtpAttempts || 0;
  if (failedAttempts >= EMAIL_VERIFICATION_MAX_ATTEMPTS) {
    throw new AppError(
      'Too many incorrect attempts. Request a new verification code.',
      429,
      'OTP_ATTEMPTS_EXCEEDED'
    );
  }

  if (!isEmailVerificationOtpMatch(normalizedOtp, user.emailVerificationOtpHash)) {
    const nextFailedAttempts = failedAttempts + 1;
    await User.updateOne({ _id: user._id }, { emailVerificationOtpAttempts: nextFailedAttempts });

    if (nextFailedAttempts >= EMAIL_VERIFICATION_MAX_ATTEMPTS) {
      throw new AppError(
        'Too many incorrect attempts. Request a new verification code.',
        429,
        'OTP_ATTEMPTS_EXCEEDED'
      );
    }

    throw new AppError('Invalid verification code. Please try again.', 400, 'INVALID_OTP');
  }

  await User.updateOne(
    { _id: user._id },
    {
      emailVerified: true,
      emailVerificationOtpHash: undefined,
      emailVerificationOtpExpiry: undefined,
      emailVerificationOtpAttempts: 0,
      emailVerificationResendWindowStart: undefined,
      emailVerificationResendCount: 0,
      emailVerificationSentAt: new Date(),
    }
  );

  const tenant = await Tenant.findOne({ orgId: resolvedOrgId });
  if (tenant) {
    await sendEmail({
      to: user.email,
      subject: `Welcome to BizZW, ${user.name}! 🇿🇼`,
      html: welcomeEmailTemplate(user.name, tenant.name),
    }).catch((err) => {
      logger.warn(
        { err, email: user.email, orgId: resolvedOrgId },
        'Welcome email failed after OTP verification'
      );
    });
  }

  return {
    verified: true,
    email: user.email,
  };
}

// ─── Resend Email Verification ──────────────────────────────

export async function resendEmailVerification(email: string, orgId?: string) {
  const normalizedEmail = email.toLowerCase();
  const resolvedOrgId = await resolveOrgIdForEmail(normalizedEmail, orgId);

  // Always return success-like behavior to avoid email enumeration.
  if (!resolvedOrgId) {
    return;
  }

  const tenantDB = await getTenantDB(resolvedOrgId);
  const User = getUserModel(tenantDB);
  const user = await User.findOne({ email: normalizedEmail, isActive: true });

  if (!user || user.emailVerified) {
    return;
  }

  const now = Date.now();
  const lastSentAt = user.emailVerificationSentAt?.getTime() || 0;
  if (now - lastSentAt < EMAIL_VERIFICATION_RESEND_COOLDOWN_MS) {
    return;
  }

  let resendWindowStartMs = user.emailVerificationResendWindowStart?.getTime() || now;
  let resendCount = user.emailVerificationResendCount || 0;
  if (now - resendWindowStartMs > EMAIL_VERIFICATION_RESEND_WINDOW_MS) {
    resendWindowStartMs = now;
    resendCount = 0;
  }

  if (resendCount >= EMAIL_VERIFICATION_MAX_RESENDS_PER_WINDOW) {
    logger.warn(
      { email: normalizedEmail, orgId: resolvedOrgId },
      'Verification OTP resend suppressed due to resend window limit'
    );
    return;
  }

  const verificationOtp = generateEmailVerificationOtp();
  const verificationOtpHash = hashEmailVerificationOtp(verificationOtp);
  const verificationExpiry = getOtpExpiryDate();

  await User.updateOne(
    { _id: user._id },
    {
      emailVerificationOtpHash: verificationOtpHash,
      emailVerificationOtpExpiry: verificationExpiry,
      emailVerificationOtpAttempts: 0,
      emailVerificationResendWindowStart: new Date(resendWindowStartMs),
      emailVerificationResendCount: resendCount + 1,
      emailVerificationSentAt: new Date(now),
    }
  );

  const tenant = await Tenant.findOne({ orgId: resolvedOrgId });
  const orgName = tenant?.name || 'your BizZW workspace';

  await sendEmail({
    to: normalizedEmail,
    subject: 'Your BizZW verification code',
    html: emailVerificationOtpTemplate(
      user.name,
      orgName,
      verificationOtp,
      Math.ceil(EMAIL_VERIFICATION_OTP_TTL_MS / (60 * 1000))
    ),
  }).catch((err) => {
    logger.warn(
      { err, email: normalizedEmail, orgId: resolvedOrgId },
      'Verification resend email failed after fallback attempts'
    );
  });
}

// ─── Forgot Password ──────────────────────────────────────────

export async function forgotPassword(email: string) {
  const tenant = await Tenant.findOne({ email: email.toLowerCase() });
  // Always respond with success to prevent email enumeration
  if (!tenant) return;

  const tenantDB = await getTenantDB(tenant.orgId);
  const User = getUserModel(tenantDB);
  const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
  if (!user) return;

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await User.updateOne({ _id: user._id }, { resetToken, resetTokenExpiry });

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}?orgId=${tenant.orgId}`;

  await sendEmail({
    to: email,
    subject: 'BizZW Password Reset Request',
    html: passwordResetTemplate(user.name, resetUrl),
  }).catch((err) => console.error('Password reset email failed:', err));
}

// ─── Reset Password ───────────────────────────────────────────

export async function resetPassword(token: string, orgId: string, newPassword: string) {
  const tenantDB = await getTenantDB(orgId);
  const User = getUserModel(tenantDB);

  const user = await User.findOne({
    resetToken: token,
    resetTokenExpiry: { $gt: new Date() },
  });
  if (!user) throw new AppError('Invalid or expired reset token', 400, 'INVALID_RESET_TOKEN');

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await User.updateOne(
    { _id: user._id },
    { passwordHash, resetToken: undefined, resetTokenExpiry: undefined }
  );
}

// ─── Helpers ──────────────────────────────────────────────────

function sanitizeUser(user: UserDocument) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    isActive: user.isActive,
    emailVerified: user.emailVerified,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
  };
}

function sanitizeTenant(tenant: InstanceType<typeof Tenant>) {
  return {
    _id: tenant._id,
    orgId: tenant.orgId,
    name: tenant.name,
    email: tenant.email,
    plan: tenant.plan,
    status: tenant.status,
    settings: tenant.settings,
    createdAt: tenant.createdAt,
  };
}
