import { getTenantDB } from '../../lib/db';
import { logger } from '../../lib/logger';
import { AppError } from '../../middleware/error.middleware';
import { PLAN_LIMITS, PLAN_PRICES, PlanType, SubscriptionStatus } from '../../shared/types';
import { getBranchModel } from '../auth/branch.model';
import { Subscription, Tenant } from '../auth/tenant.model';
import { getUserModel } from '../auth/user.model';
import { getProductModel } from '../inventory/product.model';

// Paynow is a CommonJS package with no ESM export — use require() directly
// This is safe since tsconfig targets commonjs
type PaynowPayment = {
  add: (desc: string, amount: number) => void;
};

type PaynowInitResponse = {
  success: boolean;
  redirectUrl?: string;
  pollUrl?: string;
  status?: string;
  error?: string;
};

type PaynowPollResponse = {
  status: string;
};

type PaynowClient = {
  resultUrl: string;
  returnUrl: string;
  createPayment: (ref: string, email: string) => PaynowPayment;
  send: (payment: unknown) => Promise<PaynowInitResponse | undefined>;
  pollTransaction: (pollUrl: string) => Promise<PaynowPollResponse | undefined>;
};

const PaynowSDK = require('paynow') as new (id: string, key: string) => PaynowClient;

const SUCCESSFUL_PAYNOW_STATUSES = new Set(['paid', 'awaiting delivery', 'delivered']);
const FAILED_PAYNOW_STATUSES = new Set(['cancelled', 'refunded', 'disputed']);

function normalizeUrl(rawUrl: string): string {
  return rawUrl.replace(/\/+$/, '');
}

function normalizePaynowStatus(status: string): string {
  return status.trim().toLowerCase().replace(/\s+/g, ' ');
}

function createPaynowClient(referenceForReturnUrl?: string): PaynowClient {
  const paynowIntegrationId = process.env.PAYNOW_INTEGRATION_ID;
  const paynowIntegrationKey = process.env.PAYNOW_INTEGRATION_KEY;

  if (!paynowIntegrationId || !paynowIntegrationKey) {
    throw new AppError('Paynow is not configured', 500, 'PAYNOW_NOT_CONFIGURED');
  }

  const port = Number(process.env.PORT || '5000');
  const fallbackApiBaseUrl = `http://localhost:${Number.isFinite(port) ? port : 5000}`;
  const apiBaseUrl = normalizeUrl(process.env.PUBLIC_API_BASE_URL || fallbackApiBaseUrl);
  const clientUrl = normalizeUrl(process.env.CLIENT_URL || 'http://localhost:5173');

  const paynow = new PaynowSDK(paynowIntegrationId, paynowIntegrationKey);
  paynow.resultUrl = `${apiBaseUrl}/api/v1/subscriptions/paynow-callback`;

  const returnParams = new URLSearchParams({ status: 'complete' });
  if (referenceForReturnUrl) {
    returnParams.set('reference', referenceForReturnUrl);
  }
  paynow.returnUrl = `${clientUrl}/settings/billing?${returnParams.toString()}`;

  return paynow;
}

async function confirmPaynowStatus(
  reference: string,
  incomingStatus: string,
  pollUrl?: string
): Promise<string> {
  const normalizedIncoming = normalizePaynowStatus(incomingStatus);
  if (!pollUrl) {
    return normalizedIncoming;
  }

  try {
    const paynow = createPaynowClient();
    const polled = await paynow.pollTransaction(pollUrl);
    if (polled?.status) {
      return normalizePaynowStatus(polled.status);
    }
  } catch (error) {
    logger.warn(
      { err: error, reference },
      'Could not confirm Paynow callback status via poll URL; using callback status'
    );
  }

  return normalizedIncoming;
}

// ─── Get Current Subscription ─────────────────────────────────

export async function getCurrentSubscription(orgId: string) {
  const tenant = await Tenant.findOne({ orgId });
  if (!tenant) throw new AppError('Tenant not found', 404, 'NOT_FOUND');

  const subscription = await Subscription.findOne({ tenantId: tenant._id }).sort({ createdAt: -1 });

  const limits = PLAN_LIMITS[tenant.plan];
  const prices = PLAN_PRICES;

  return {
    plan: tenant.plan,
    status: tenant.status,
    subscription,
    limits,
    prices,
  };
}

// ─── Check Usage Limits ───────────────────────────────────────

export async function checkUsageLimits(orgId: string) {
  const tenant = await Tenant.findOne({ orgId });
  if (!tenant) throw new AppError('Tenant not found', 404, 'NOT_FOUND');

  const limits = PLAN_LIMITS[tenant.plan];
  const db = await getTenantDB(orgId);

  const User = getUserModel(db);
  const Product = getProductModel(db);
  const Branch = getBranchModel(db);

  const [userCount, productCount, branchCount] = await Promise.all([
    User.countDocuments({ isActive: true }),
    Product.countDocuments({ isActive: true }),
    Branch.countDocuments({ isActive: true }),
  ]);

  return {
    plan: tenant.plan,
    usage: {
      users: {
        current: userCount,
        limit: limits.maxUsers,
        isUnlimited: limits.maxUsers === -1,
        isAtLimit: limits.maxUsers !== -1 && userCount >= limits.maxUsers,
      },
      products: {
        current: productCount,
        limit: limits.maxProducts,
        isUnlimited: limits.maxProducts === -1,
        isAtLimit: limits.maxProducts !== -1 && productCount >= limits.maxProducts,
      },
      branches: {
        current: branchCount,
        limit: limits.maxBranches,
        isUnlimited: limits.maxBranches === -1,
        isAtLimit: limits.maxBranches !== -1 && branchCount >= limits.maxBranches,
      },
    },
    features: {
      aiFeatures: limits.aiFeatures,
      advancedReports: limits.advancedReports,
      apiAccess: limits.apiAccess,
    },
  };
}

// ─── Enforce Limit Before Create ─────────────────────────────

export async function enforceUserLimit(orgId: string): Promise<void> {
  const usage = await checkUsageLimits(orgId);
  if (usage.usage.users.isAtLimit) {
    throw new AppError(
      `User limit reached for your ${usage.plan} plan (${usage.usage.users.limit} users). Please upgrade.`,
      402,
      'USER_LIMIT_REACHED'
    );
  }
}

export async function enforceProductLimit(orgId: string): Promise<void> {
  const usage = await checkUsageLimits(orgId);
  if (usage.usage.products.isAtLimit) {
    throw new AppError(
      `Product limit reached for your ${usage.plan} plan (${usage.usage.products.limit} products). Please upgrade.`,
      402,
      'PRODUCT_LIMIT_REACHED'
    );
  }
}

// ─── Initiate Paynow Payment for Plan Upgrade ─────────────────

export async function initiateUpgradePayment(orgId: string, newPlan: PlanType) {
  const tenant = await Tenant.findOne({ orgId });
  if (!tenant) throw new AppError('Tenant not found', 404, 'NOT_FOUND');

  if (newPlan === PlanType.STARTER) {
    throw new AppError('Cannot downgrade to Starter plan via payment', 400, 'INVALID_PLAN');
  }

  if (tenant.plan === newPlan) {
    throw new AppError('You are already on this plan', 400, 'SAME_PLAN');
  }

  const amount = PLAN_PRICES[newPlan];

  const reference = `BizZW-${orgId}-${newPlan}-${Date.now()}`;
  const paynow = createPaynowClient(reference);
  const payment = paynow.createPayment(reference, tenant.email);
  payment.add(`BizZW ${newPlan} Plan - Monthly`, amount);

  const response = await paynow.send(payment);

  if (!response?.success || !response.redirectUrl || !response.pollUrl) {
    throw new AppError('Failed to initiate payment. Please try again.', 500, 'PAYNOW_ERROR');
  }

  // Create pending subscription record
  const subscriptionEnd = new Date();
  subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);

  const subscription = await Subscription.create({
    tenantId: tenant._id,
    plan: newPlan,
    status: SubscriptionStatus.PENDING,
    startDate: new Date(),
    endDate: subscriptionEnd,
    amount,
    paynowRef: reference,
    paynowPollUrl: response.pollUrl,
  });

  return {
    redirectUrl: response.redirectUrl,
    pollUrl: response.pollUrl,
    reference,
    subscriptionId: subscription._id,
    amount,
    plan: newPlan,
  };
}

// ─── Handle Paynow Callback ───────────────────────────────────

export interface PaynowCallbackPayload {
  reference: string;
  status: string;
  pollUrl?: string;
  paynowReference?: string;
}

export async function handlePaynowCallback(payload: PaynowCallbackPayload) {
  const { reference, status, pollUrl, paynowReference } = payload;
  const subscription = await Subscription.findOne({ paynowRef: reference });
  if (!subscription) {
    logger.warn({ reference }, 'Received Paynow callback for unknown subscription reference');
    return;
  }

  const effectivePollUrl = pollUrl || subscription.paynowPollUrl;
  const confirmedStatus = await confirmPaynowStatus(reference, status, effectivePollUrl);

  const updateFields: Record<string, unknown> = {};
  if (effectivePollUrl) {
    updateFields.paynowPollUrl = effectivePollUrl;
  }
  if (paynowReference) {
    updateFields.paynowReference = paynowReference;
  }

  if (SUCCESSFUL_PAYNOW_STATUSES.has(confirmedStatus)) {
    updateFields.status = SubscriptionStatus.ACTIVE;
    await Subscription.updateOne({ _id: subscription._id }, { $set: updateFields });
    await Tenant.updateOne({ _id: subscription.tenantId }, { plan: subscription.plan });
    return;
  }

  if (FAILED_PAYNOW_STATUSES.has(confirmedStatus)) {
    updateFields.status = SubscriptionStatus.CANCELLED;
  }

  if (Object.keys(updateFields).length > 0) {
    await Subscription.updateOne({ _id: subscription._id }, { $set: updateFields });
  }
}

// ─── Cancel Subscription ──────────────────────────────────────

export async function cancelSubscription(orgId: string) {
  const tenant = await Tenant.findOne({ orgId });
  if (!tenant) throw new AppError('Tenant not found', 404, 'NOT_FOUND');

  if (tenant.plan === PlanType.STARTER) {
    throw new AppError('Starter plan cannot be cancelled (it is free)', 400, 'ALREADY_FREE');
  }

  // Downgrade to starter at end of current period
  await Tenant.updateOne({ orgId }, { plan: PlanType.STARTER });

  await Subscription.findOneAndUpdate(
    { tenantId: tenant._id, status: SubscriptionStatus.ACTIVE },
    { status: SubscriptionStatus.CANCELLED }
  );

  return { message: 'Subscription cancelled. You have been downgraded to the Starter plan.' };
}

// ─── Get Billing History ──────────────────────────────────────

export async function getBillingHistory(orgId: string) {
  const tenant = await Tenant.findOne({ orgId });
  if (!tenant) throw new AppError('Tenant not found', 404, 'NOT_FOUND');

  return Subscription.find({ tenantId: tenant._id }).sort({ createdAt: -1 }).limit(24);
}

// ─── Update Business Settings ─────────────────────────────────

export async function updateBusinessSettings(
  orgId: string,
  settings: Partial<{
    currency: string;
    taxRate: number;
    businessType: string;
    timezone: string;
    address: string;
    phone: string;
    logo: { fileId: string; filePath: string };
  }>
) {
  const updateFields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(settings)) {
    updateFields[`settings.${key}`] = value;
  }

  const tenant = await Tenant.findOneAndUpdate({ orgId }, { $set: updateFields }, { new: true });

  if (!tenant) throw new AppError('Tenant not found', 404, 'NOT_FOUND');
  return tenant;
}
