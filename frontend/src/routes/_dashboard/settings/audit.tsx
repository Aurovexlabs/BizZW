import { createFileRoute, Link } from '@tanstack/react-router';
import { useReducedMotion } from 'framer-motion';
import {
  DollarSign,
  Download,
  ExternalLink,
  ListChecks,
  LogIn,
  Package,
  Settings,
  Shield,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import { useState } from 'react';
import {
  getDashboardSettingsMotionTuning,
  m,
  staggerContainer,
  surfaceRevealVariants,
} from '../../../components/motion/AppMotion';
import { Button, Card, Skeleton } from '../../../components/ui';
import { useAuditLogs, useAuditStats } from '../../../hooks/useApi';
import { AuditAction, IAuditLog } from '../../../shared/types';

export const Route = createFileRoute('/_dashboard/settings/audit')({
  component: AuditLogPage,
});

const ACTION_CONFIG: Record<
  string,
  { label: string; icon: typeof Shield; color: string; bg: string }
> = {
  [AuditAction.CREATE]: {
    label: 'Created',
    icon: Package,
    color: 'text-green-700',
    bg: 'bg-green-50',
  },
  [AuditAction.UPDATE]: {
    label: 'Updated',
    icon: Settings,
    color: 'text-blue-700',
    bg: 'bg-blue-50',
  },
  [AuditAction.DELETE]: { label: 'Deleted', icon: Package, color: 'text-red-700', bg: 'bg-red-50' },
  [AuditAction.LOGIN]: {
    label: 'Logged In',
    icon: LogIn,
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
  },
  [AuditAction.LOGOUT]: {
    label: 'Logged Out',
    icon: LogIn,
    color: 'text-slate-600',
    bg: 'bg-slate-100',
  },
  [AuditAction.EXPORT]: {
    label: 'Exported',
    icon: Download,
    color: 'text-amber-700',
    bg: 'bg-amber-50',
  },
  [AuditAction.PAYMENT]: {
    label: 'Payment',
    icon: DollarSign,
    color: 'text-green-700',
    bg: 'bg-green-50',
  },
  [AuditAction.PLAN_CHANGE]: {
    label: 'Plan Changed',
    icon: Settings,
    color: 'text-purple-700',
    bg: 'bg-purple-50',
  },
  [AuditAction.INVITE]: {
    label: 'Invited',
    icon: UserPlus,
    color: 'text-teal-700',
    bg: 'bg-teal-50',
  },
};

function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [resource, setResource] = useState('');
  const shouldReduceMotion = useReducedMotion() ?? false;
  const motionTuning = getDashboardSettingsMotionTuning('audit', shouldReduceMotion);
  const hasActiveFilters = Boolean(action || resource.trim());

  const { data, isLoading } = useAuditLogs({
    page,
    limit: 30,
    action: action || undefined,
    resource: resource || undefined,
  });
  const { data: stats } = useAuditStats();

  const logs = (data?.data || []) as IAuditLog[];
  const meta = data?.meta as { total: number; totalPages: number } | undefined;

  function timeAgo(date: string) {
    const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (secs < 60) return `${secs}s ago`;
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
    return new Date(date).toLocaleDateString();
  }

  function clearFilters() {
    setAction('');
    setResource('');
    setPage(1);
  }

  return (
    <m.div
      className="p-6 max-w-5xl mx-auto space-y-6"
      initial="hidden"
      animate="visible"
      variants={staggerContainer(motionTuning.staggerChildren, motionTuning.delayChildren)}
    >
      <m.div
        variants={surfaceRevealVariants(shouldReduceMotion, motionTuning.heroDistance, 'dashboard')}
      >
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-5 h-5 text-primary-700" />
          <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
        </div>
        <p className="text-sm text-slate-500">
          Complete history of all actions taken on this account
        </p>
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
            Trace operational changes and jump to their source modules quickly.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Link to="/settings/team" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                Team access events
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link to="/settings/api-keys" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                API key activity
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link to="/settings/webhooks" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                Webhook delivery events
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link to="/help" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                Audit interpretation guide
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
              'Filter by action to narrow the event class you are investigating.',
              'Filter by resource when triaging a specific record or module.',
              'Correlate spikes in actions with role assignments and deployment windows.',
              'Escalate unusual entries with timestamps and actor details for response.',
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

      {/* Stats */}
      {stats && (
        <m.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
          variants={surfaceRevealVariants(
            shouldReduceMotion,
            motionTuning.contentDistance,
            'dashboard'
          )}
        >
          {(stats as { byAction: { _id: string; count: number }[] }).byAction
            ?.slice(0, 4)
            .map(({ _id, count }) => {
              const cfg = ACTION_CONFIG[_id];
              if (!cfg) return null;
              const Icon = cfg.icon;
              return (
                <Card key={_id}>
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${cfg.bg}`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                    </div>
                    <p className="text-xs text-slate-500">{cfg.label}</p>
                  </div>
                  <p className="text-xl font-bold text-slate-900">{count}</p>
                  <p className="text-xs text-slate-400">Last 30 days</p>
                </Card>
              );
            })}
        </m.div>
      )}

      {/* Filters */}
      <m.div
        className="flex gap-3 flex-wrap"
        variants={surfaceRevealVariants(
          shouldReduceMotion,
          motionTuning.contentDistance,
          'dashboard'
        )}
      >
        <select
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        >
          <option value="">All Actions</option>
          {Object.entries(AuditAction).map(([k, v]) => (
            <option key={k} value={v}>
              {ACTION_CONFIG[v]?.label || v}
            </option>
          ))}
        </select>
        <input
          value={resource}
          onChange={(e) => {
            setResource(e.target.value);
            setPage(1);
          }}
          placeholder="Filter by resource..."
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        />
        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </m.div>

      {/* Timeline */}
      <m.div
        variants={surfaceRevealVariants(
          shouldReduceMotion,
          motionTuning.deepContentDistance,
          'dashboard'
        )}
      >
        <Card padding={false}>
          <div className="divide-y divide-slate-50">
            {isLoading &&
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex gap-4 p-4">
                  <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            {!isLoading &&
              logs.map((log) => {
                const cfg = ACTION_CONFIG[log.action] || {
                  label: log.action,
                  icon: Shield,
                  color: 'text-slate-600',
                  bg: 'bg-slate-100',
                };
                const Icon = cfg.icon;
                return (
                  <div
                    key={log._id}
                    className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors"
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg}`}
                    >
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-900">{log.userName}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.color}`}
                        >
                          {cfg.label}
                        </span>
                        <span className="text-sm text-slate-500">{log.description}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-slate-400">{log.resource}</span>
                        {log.resourceId && (
                          <span className="text-xs font-mono text-slate-300">
                            {log.resourceId.slice(-8)}
                          </span>
                        )}
                        {log.ipAddress && (
                          <span className="text-xs text-slate-300">{log.ipAddress}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0 mt-0.5">
                      {timeAgo(log.createdAt)}
                    </span>
                  </div>
                );
              })}
            {!isLoading && logs.length === 0 && (
              <div className="text-center py-16 px-4">
                <Shield className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p className="text-sm font-semibold text-slate-700">
                  {hasActiveFilters
                    ? 'No audit logs match these filters'
                    : 'No audit logs found yet'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {hasActiveFilters
                    ? 'Try broadening filters to include more actions or resources.'
                    : 'Activity will appear here as users, integrations, and settings change over time.'}
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  {hasActiveFilters && (
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  )}
                  <Link to="/settings/team">
                    <Button size="sm">Open team settings</Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
          {meta && meta.totalPages > 1 && (
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Page {page} of {meta.totalPages} ({meta.total} entries)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= meta.totalPages}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </Card>
      </m.div>
    </m.div>
  );
}
