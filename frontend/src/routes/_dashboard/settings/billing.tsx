import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useReducedMotion } from 'framer-motion';
import {
  AlertTriangle,
  Building2,
  CheckCircle,
  Clock3,
  ExternalLink,
  ListChecks,
  Package,
  RefreshCw,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { z } from 'zod';
import {
  getDashboardSettingsMotionTuning,
  m,
  staggerContainer,
  surfaceRevealVariants,
} from '../../../components/motion/AppMotion';
import { Badge, Button, Card } from '../../../components/ui';
import {
  useBillingHistory,
  useSubscription,
  useUpgradePlan,
  useUsageLimits,
} from '../../../hooks/useApi';
import { cn } from '../../../lib/cn';
import { hasAnyUsageLimitReached } from '../../../lib/settings-utils';
import { PLAN_PRICES, PlanType } from '../../../shared/types';
import { formatDate } from '../../../shared/utils';
import { useAuthStore } from '../../../store/auth.store';

const billingSearchSchema = z.object({
  status: z.string().optional(),
  reference: z.string().optional(),
});

export const Route = createFileRoute('/_dashboard/settings/billing')({
  validateSearch: billingSearchSchema,
  component: BillingPage,
});

interface SubscriptionPayload {
  plan: PlanType;
  subscription?: {
    endDate: string;
    status: string;
  };
}

interface UsagePayload {
  usage: {
    users: { current: number; limit: number; isAtLimit: boolean };
    products: { current: number; limit: number; isAtLimit: boolean };
    branches: { current: number; limit: number; isAtLimit: boolean };
  };
}

interface BillingHistoryEntry {
  _id: string;
  plan: string;
  amount: number;
  status: string;
  startDate: string;
  paynowRef?: string;
  paynowReference?: string;
}

const PLAN_FEATURES: Record<PlanType, string[]> = {
  [PlanType.STARTER]: ['2 users', '50 products', '1 branch', 'POS & invoicing', 'Basic reports'],
  [PlanType.GROWTH]: [
    '10 users',
    '500 products',
    '2 branches',
    'AI insights',
    'Advanced reports',
    'Email invoices',
  ],
  [PlanType.PRO]: [
    '50 users',
    '5,000 products',
    '5 branches',
    'API access',
    'Tax summaries',
    'Priority support',
  ],
  [PlanType.ENTERPRISE]: [
    'Unlimited users',
    'Unlimited products',
    'Unlimited branches',
    'All features',
    'Custom integrations',
    'Dedicated support',
  ],
};

const PLAN_ORDER: PlanType[] = [
  PlanType.STARTER,
  PlanType.GROWTH,
  PlanType.PRO,
  PlanType.ENTERPRISE,
];

function BillingPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const shouldReduceMotion = useReducedMotion() ?? false;
  const motionTuning = getDashboardSettingsMotionTuning('billing', shouldReduceMotion);
  const { tenant } = useAuthStore();
  const {
    data: subData,
    refetch: refetchSubscription,
    isFetching: isSubscriptionFetching,
  } = useSubscription();
  const { data: usageData } = useUsageLimits();
  const {
    data: billing,
    refetch: refetchBilling,
    isFetching: isBillingFetching,
  } = useBillingHistory();
  const upgradePlan = useUpgradePlan();

  const sub = subData as SubscriptionPayload | undefined;
  const usage = usageData as UsagePayload | undefined;
  const billingHistory = billing as BillingHistoryEntry[] | undefined;

  const hasPaynowReturn = (search.status || '').toLowerCase() === 'complete';
  const paynowReference = search.reference?.trim() || '';
  const isRefreshingPaymentState = isSubscriptionFetching || isBillingFetching;

  useEffect(() => {
    if (!hasPaynowReturn) {
      return;
    }

    // Trigger immediate refresh after returning from Paynow, then briefly poll.
    void refetchSubscription();
    void refetchBilling();

    let attempts = 0;
    const intervalId = window.setInterval(() => {
      attempts += 1;
      void refetchSubscription();
      void refetchBilling();

      if (attempts >= 6) {
        window.clearInterval(intervalId);
      }
    }, 5_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [hasPaynowReturn, refetchBilling, refetchSubscription]);

  const matchedPaynowPayment = useMemo(() => {
    if (!paynowReference || !billingHistory) {
      return undefined;
    }

    return billingHistory.find(
      (entry) => entry.paynowRef === paynowReference || entry.paynowReference === paynowReference
    );
  }, [billingHistory, paynowReference]);

  const paynowNotice = useMemo(() => {
    if (!hasPaynowReturn) {
      return null;
    }

    if (!paynowReference) {
      return {
        title: 'Returned From Paynow',
        description:
          'We are refreshing your billing state. You can manually refresh if confirmation takes longer than expected.',
        toneClassName: 'border-slate-200 bg-slate-50 text-slate-800',
        badgeVariant: 'info' as const,
        badgeLabel: 'Processing',
        Icon: Clock3,
      };
    }

    if (!matchedPaynowPayment) {
      return {
        title: 'Payment Confirmation In Progress',
        description:
          'Your payment callback is still being processed. Keep this page open or refresh status in a few seconds.',
        toneClassName: 'border-amber-200 bg-amber-50 text-amber-900',
        badgeVariant: 'warning' as const,
        badgeLabel: 'Pending',
        Icon: Clock3,
      };
    }

    const status = matchedPaynowPayment.status.toUpperCase();

    if (status === 'ACTIVE') {
      return {
        title: 'Payment Confirmed',
        description: `Your ${matchedPaynowPayment.plan} plan is active and ready to use.`,
        toneClassName: 'border-emerald-200 bg-emerald-50 text-emerald-900',
        badgeVariant: 'success' as const,
        badgeLabel: 'Confirmed',
        Icon: CheckCircle,
      };
    }

    if (status === 'CANCELLED') {
      return {
        title: 'Payment Not Completed',
        description:
          'Paynow reported that this transaction did not complete successfully. Please retry the upgrade if needed.',
        toneClassName: 'border-rose-200 bg-rose-50 text-rose-900',
        badgeVariant: 'danger' as const,
        badgeLabel: 'Not Completed',
        Icon: AlertTriangle,
      };
    }

    return {
      title: 'Payment Processing',
      description:
        'We received your return and are waiting for final settlement status from Paynow.',
      toneClassName: 'border-amber-200 bg-amber-50 text-amber-900',
      badgeVariant: 'warning' as const,
      badgeLabel: status,
      Icon: Clock3,
    };
  }, [hasPaynowReturn, matchedPaynowPayment, paynowReference]);

  function clearPaynowNotice() {
    void navigate({ to: '/settings/billing', replace: true });
  }

  function refreshPaynowState() {
    void refetchSubscription();
    void refetchBilling();
  }

  const currentPlan = tenant?.plan || PlanType.STARTER;
  const usageAtLimit = hasAnyUsageLimitReached(usage);
  const billingEntries = billingHistory || [];

  return (
    <m.div
      className="p-6 max-w-4xl mx-auto space-y-6"
      initial="hidden"
      animate="visible"
      variants={staggerContainer(motionTuning.staggerChildren, motionTuning.delayChildren)}
    >
      <m.div
        variants={surfaceRevealVariants(shouldReduceMotion, motionTuning.heroDistance, 'dashboard')}
      >
        <h1 className="text-2xl font-bold text-slate-900">Billing & Subscription</h1>
        <p className="text-sm text-slate-500">Manage your plan and billing history</p>
      </m.div>

      <m.div
        className="grid gap-4 lg:grid-cols-2"
        variants={surfaceRevealVariants(
          shouldReduceMotion,
          motionTuning.utilityDistance,
          'dashboard'
        )}
      >
        <Card className="border-primary-100 bg-primary-50/40">
          <h2 className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary-800">
            <Sparkles className="h-3.5 w-3.5" /> Quick actions
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Keep plan, seats, and operational modules aligned as usage grows.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Link to="/settings/team" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                Manage team seats
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link to="/settings/branches" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                Branch capacity
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link to="/settings/audit" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                Billing audit events
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link to="/help" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                Open billing guide
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </Card>

        <Card>
          <h2 className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-700">
            <ListChecks className="h-3.5 w-3.5" /> Example workflow
          </h2>
          <ol className="mt-3 space-y-2">
            {[
              'Check usage bars weekly and identify dimensions nearing plan limits.',
              'Upgrade ahead of peak growth windows to avoid operational lockouts.',
              'Confirm payment callbacks and status changes after each plan update.',
              'Review billing history and reconcile plan changes with approvals.',
            ].map((step, index) => (
              <li key={step} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </Card>
      </m.div>

      {paynowNotice && (
        <m.div
          variants={surfaceRevealVariants(
            shouldReduceMotion,
            motionTuning.contentDistance,
            'dashboard'
          )}
        >
          <Card className={cn('border p-4', paynowNotice.toneClassName)} padding={false}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <paynowNotice.Icon className="w-4 h-4" />
                  <p className="text-sm font-semibold">{paynowNotice.title}</p>
                  <Badge variant={paynowNotice.badgeVariant} size="sm">
                    {paynowNotice.badgeLabel}
                  </Badge>
                </div>
                <p className="text-xs md:text-sm">{paynowNotice.description}</p>
                {paynowReference && (
                  <p className="font-mono text-xs opacity-80">Reference: {paynowReference}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={refreshPaynowState}
                  loading={isRefreshingPaymentState}
                  icon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Refresh status
                </Button>
                <Button size="sm" variant="ghost" onClick={clearPaynowNotice}>
                  Dismiss
                </Button>
              </div>
            </div>
          </Card>
        </m.div>
      )}

      {/* Current Plan */}
      <m.div
        variants={surfaceRevealVariants(
          shouldReduceMotion,
          motionTuning.contentDistance,
          'dashboard'
        )}
      >
        <Card>
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-sm text-slate-500">Current Plan</p>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">{currentPlan}</h2>
              {sub?.subscription && (
                <p className="text-sm text-slate-500 mt-1">
                  Renews on {formatDate(sub.subscription.endDate)}
                </p>
              )}
            </div>
            <Badge variant={currentPlan === PlanType.STARTER ? 'default' : 'success'} size="md">
              {currentPlan === PlanType.STARTER ? 'Free' : 'Active'}
            </Badge>
          </div>

          {/* Usage */}
          {usage && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Users', icon: Users, data: usage.usage.users },
                { label: 'Products', icon: Package, data: usage.usage.products },
                { label: 'Branches', icon: Building2, data: usage.usage.branches },
              ].map(({ label, icon: Icon, data }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                  </div>
                  <p className="text-xl font-bold text-slate-900">
                    {data.current}
                    <span className="text-sm font-normal text-slate-400">
                      /
                      {data.isAtLimit && !('isUnlimited' in data)
                        ? data.limit
                        : data.limit === -1
                          ? '∞'
                          : data.limit}
                    </span>
                  </p>
                  <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        data.isAtLimit ? 'bg-red-500' : 'bg-primary-600'
                      )}
                      style={{
                        width:
                          data.limit === -1
                            ? '10%'
                            : `${Math.min(100, (data.current / data.limit) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {usageAtLimit && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              One or more usage limits are currently reached. Upgrade your plan to avoid blocking
              new users, products, or branches.
            </div>
          )}
        </Card>
      </m.div>

      {/* Plan cards */}
      <m.div
        variants={surfaceRevealVariants(
          shouldReduceMotion,
          motionTuning.contentDistance,
          'dashboard'
        )}
      >
        <h2 className="font-semibold text-slate-900 mb-4">Available Plans</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLAN_ORDER.map((plan) => {
            const isCurrent = plan === currentPlan;
            const isDowngrade = PLAN_PRICES[plan] < PLAN_PRICES[currentPlan];
            return (
              <div
                key={plan}
                className={cn(
                  'border-2 rounded-2xl p-5 transition-all',
                  isCurrent ? 'border-primary-700 bg-primary-50' : 'border-slate-200 bg-white'
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="font-bold text-slate-900">{plan}</p>
                  {isCurrent && (
                    <Badge variant="info" size="sm">
                      Current
                    </Badge>
                  )}
                </div>
                <p className="text-2xl font-black text-slate-900 mb-4">
                  ${PLAN_PRICES[plan]}
                  <span className="text-sm font-normal text-slate-400">/mo</span>
                </p>
                <ul className="space-y-1.5 mb-5">
                  {PLAN_FEATURES[plan].map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-xs text-slate-600">
                      <CheckCircle className="w-3.5 h-3.5 text-accent-600 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                {!isCurrent && !isDowngrade && (
                  <Button
                    size="sm"
                    className="w-full"
                    icon={<Zap className="w-3.5 h-3.5" />}
                    loading={upgradePlan.isPending}
                    onClick={() => upgradePlan.mutate(plan)}
                  >
                    Upgrade
                  </Button>
                )}
                {isCurrent && (
                  <div className="text-center text-xs text-primary-700 font-medium py-2">
                    ✓ Your current plan
                  </div>
                )}
                {!isCurrent && isDowngrade && (
                  <p className="text-xs text-center text-slate-400 py-2">
                    Contact support to downgrade
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </m.div>

      {/* Billing history */}
      <m.div
        variants={surfaceRevealVariants(
          shouldReduceMotion,
          motionTuning.deepContentDistance,
          'dashboard'
        )}
      >
        <Card>
          <h2 className="font-semibold text-slate-900 mb-4">Billing History</h2>
          {billingEntries.length > 0 ? (
            <div className="space-y-2">
              {billingEntries.map((b) => (
                <div
                  key={b._id}
                  className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{b.plan} Plan</p>
                    <p className="text-xs text-slate-400">{formatDate(b.startDate)}</p>
                    {b.paynowRef && (
                      <p className="font-mono text-[11px] text-slate-400">{b.paynowRef}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">${b.amount}/mo</p>
                    <Badge variant={b.status === 'ACTIVE' ? 'success' : 'default'} size="sm">
                      {b.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
              <p className="text-sm font-semibold text-slate-700">No billing entries yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Your billing timeline will appear here once a paid plan is activated.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={refreshPaynowState}
                  loading={isRefreshingPaymentState}
                  icon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Refresh status
                </Button>
                <Link to="/help">
                  <Button size="sm">Open billing guide</Button>
                </Link>
              </div>
            </div>
          )}
        </Card>
      </m.div>
    </m.div>
  );
}
