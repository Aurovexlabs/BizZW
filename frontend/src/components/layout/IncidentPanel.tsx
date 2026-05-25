import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  RotateCcw,
  ServerCrash,
  Trash2,
  WifiOff,
} from 'lucide-react';
import { useOfflineQueueStatus } from '../../hooks/useOfflineQueue';
import { SystemStatus } from '../../hooks/useSystemStatus';
import { triggerOfflineQueueSync } from '../../lib/api';
import { cn } from '../../lib/cn';

interface IncidentPanelProps {
  status: SystemStatus;
}

function formatTime(value: Date | string | null | undefined): string {
  if (!value) {
    return 'Never';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  return date.toLocaleString();
}

export function IncidentPanel({ status }: IncidentPanelProps) {
  const queue = useOfflineQueueStatus();
  const backendQueueDepth = status.backend?.backgroundJobs?.scheduler.queueDepth ?? 0;

  const overdueSweep = status.backend?.backgroundJobs?.jobs?.overdueInvoiceSweep;
  const overdueSweepLastSuccess = overdueSweep?.lastSuccessAt || null;

  const hasIncident =
    !status.backendHealthy ||
    !status.isOnline ||
    queue.pendingCount > 0 ||
    Boolean(queue.lastFailureAt);

  if (!hasIncident) {
    return null;
  }

  const incidentTone = hasIncident
    ? 'border-amber-200/80 bg-amber-50/75 text-amber-900 dark:border-amber-500/45 dark:bg-amber-500/12 dark:text-amber-100'
    : 'border-emerald-200/80 bg-emerald-50/75 text-emerald-900 dark:border-emerald-500/45 dark:bg-emerald-500/12 dark:text-emerald-100';

  const controlButtonBase =
    'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors';

  const visibleQueueItems = queue.items.slice(0, 4);

  const canSync = status.isOnline && !queue.isFlushing && !queue.isPaused;

  return (
    <div className={cn('border-b px-4 py-3 backdrop-blur-[1px]', incidentTone)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {hasIncident ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          <span>{hasIncident ? 'Incident and Sync Monitor' : 'All systems operational'}</span>
        </div>

        <div className="grid gap-2 text-xs text-slate-700 dark:text-slate-300 sm:grid-cols-2 xl:grid-cols-3">
          <div className="flex items-center gap-1.5">
            {!status.isOnline ? (
              <WifiOff className="h-3.5 w-3.5" />
            ) : (
              <ServerCrash className="h-3.5 w-3.5" />
            )}
            <span>
              Backend:{' '}
              {status.status === 'healthy'
                ? 'Healthy'
                : status.status === 'degraded'
                  ? 'Degraded'
                  : status.status}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5" />
            <span>Last backend sync: {formatTime(status.lastSuccessfulSyncAt)}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Pending offline actions: {queue.pendingCount}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5" />
            <span>Last queue sync: {formatTime(queue.lastFlushAt)}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Backend job queue depth: {backendQueueDepth}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5" />
            <span>Last overdue sweep: {formatTime(overdueSweepLastSuccess)}</span>
          </div>
        </div>

        {(queue.pendingCount > 0 || status.isOnline) && (
          <div className="flex items-center gap-2">
            {queue.lastFailureAt && queue.lastFailureMessage && (
              <span
                className="hidden xl:block text-xs text-amber-800 dark:text-amber-300 max-w-sm truncate"
                title={queue.lastFailureMessage}
              >
                {queue.lastFailureMessage}
              </span>
            )}

            <button
              onClick={() => {
                if (queue.isPaused) {
                  queue.resume();
                  void triggerOfflineQueueSync();
                  return;
                }

                queue.pause();
              }}
              className={cn(
                controlButtonBase,
                queue.isPaused
                  ? 'border-emerald-200 bg-white/95 text-emerald-700 hover:bg-white dark:border-emerald-500/50 dark:bg-slate-900 dark:text-emerald-200 dark:hover:bg-slate-800'
                  : 'border-amber-200 bg-white/95 text-amber-700 hover:bg-white dark:border-amber-500/50 dark:bg-slate-900 dark:text-amber-200 dark:hover:bg-slate-800'
              )}
            >
              {queue.isPaused ? (
                <PlayCircle className="h-3.5 w-3.5" />
              ) : (
                <PauseCircle className="h-3.5 w-3.5" />
              )}
              {queue.isPaused ? 'Resume queue' : 'Pause queue'}
            </button>

            <button
              onClick={() => {
                void triggerOfflineQueueSync();
              }}
              disabled={!canSync}
              className={cn(
                controlButtonBase,
                !canSync
                  ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500'
                  : 'border-primary-200 bg-white/95 text-primary-700 hover:bg-white dark:border-primary-500/55 dark:bg-slate-900 dark:text-primary-200 dark:hover:bg-slate-800'
              )}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', queue.isFlushing && 'animate-spin')} />
              {queue.isFlushing ? 'Syncing…' : 'Sync now'}
            </button>
          </div>
        )}
      </div>

      {(queue.pendingCount > 0 || queue.lastFailureMessage) && (
        <div className="mt-3 space-y-2 rounded-lg border border-amber-200/80 bg-white/82 p-3 shadow-sm dark:border-amber-500/45 dark:bg-slate-900/85">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Queue policy: max attempts {queue.policy.maxAttempts}, base delay{' '}
              {Math.round(queue.policy.baseDelayMs / 1000)}s
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <label className="flex items-center gap-1">
                <span className="text-slate-600 dark:text-slate-300">Attempts</span>
                <select
                  value={queue.policy.maxAttempts}
                  onChange={(event) => queue.setPolicy({ maxAttempts: Number(event.target.value) })}
                  className="rounded border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {[3, 5, 8, 10].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-1">
                <span className="text-slate-600 dark:text-slate-300">Base delay</span>
                <select
                  value={queue.policy.baseDelayMs}
                  onChange={(event) => queue.setPolicy({ baseDelayMs: Number(event.target.value) })}
                  className="rounded border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {[
                    { label: '1s', value: 1000 },
                    { label: '2.5s', value: 2500 },
                    { label: '5s', value: 5000 },
                    { label: '10s', value: 10000 },
                  ].map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {visibleQueueItems.length > 0 && (
            <div className="space-y-2">
              {visibleQueueItems.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-700 dark:text-slate-200">
                      {item.label}
                    </p>
                    <p className="truncate text-slate-500 dark:text-slate-400">
                      Attempts {item.attempts}/{queue.policy.maxAttempts}
                      {item.nextRetryAt ? ` • Next retry ${formatTime(item.nextRetryAt)}` : ''}
                      {item.lastErrorMessage ? ` • ${item.lastErrorMessage}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        queue.retryNow(item.id);
                        void triggerOfflineQueueSync();
                      }}
                      disabled={!status.isOnline || queue.isPaused}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-lg border px-2 py-1 font-semibold transition-colors',
                        !status.isOnline || queue.isPaused
                          ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500'
                          : 'border-primary-200 bg-white text-primary-700 hover:bg-primary-50 dark:border-primary-500/55 dark:bg-slate-900 dark:text-primary-200 dark:hover:bg-primary-500/18'
                      )}
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Retry
                    </button>

                    <button
                      onClick={() => queue.removeItem(item.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2 py-1 font-semibold text-rose-700 transition-colors hover:bg-rose-50 dark:border-rose-500/55 dark:bg-slate-900 dark:text-rose-200 dark:hover:bg-rose-500/18"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
