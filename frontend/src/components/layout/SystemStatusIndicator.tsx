import { Activity, ServerCrash, Wifi, WifiOff } from 'lucide-react';
import { SystemStatus } from '../../hooks/useSystemStatus';
import { cn } from '../../lib/cn';

interface SystemStatusIndicatorProps {
  status: SystemStatus;
}

export function SystemStatusIndicator({ status }: SystemStatusIndicatorProps) {
  const config = {
    healthy: {
      label: 'System healthy',
      icon: Wifi,
      className:
        'border-emerald-200 bg-emerald-50/85 text-emerald-700 dark:border-emerald-500/55 dark:bg-emerald-500/15 dark:text-emerald-200',
    },
    degraded: {
      label: 'Backend degraded',
      icon: ServerCrash,
      className:
        'border-amber-200 bg-amber-50/85 text-amber-700 dark:border-amber-500/55 dark:bg-amber-500/15 dark:text-amber-200',
    },
    offline: {
      label: 'Offline',
      icon: WifiOff,
      className:
        'border-rose-200 bg-rose-50/85 text-rose-700 dark:border-rose-500/55 dark:bg-rose-500/15 dark:text-rose-200',
    },
    checking: {
      label: 'Checking',
      icon: Activity,
      className:
        'border-slate-200 bg-slate-100/85 text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300',
    },
  } as const;

  const current = config[status.status];
  const Icon = current.icon;

  const titleParts: string[] = [current.label];
  if (status.latencyMs !== null) titleParts.push(`Latency ${status.latencyMs}ms`);
  if (status.backend?.database) titleParts.push(`DB ${status.backend.database}`);
  if (status.lastCheckedAt) titleParts.push(`Updated ${status.lastCheckedAt.toLocaleTimeString()}`);

  return (
    <div
      className={cn(
        'hidden md:inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold shadow-sm',
        current.className
      )}
      title={titleParts.join(' • ')}
      aria-live="polite"
    >
      <Icon className={cn('h-3.5 w-3.5', status.isChecking && 'animate-pulse')} />
      <span>{current.label}</span>
      {status.latencyMs !== null && status.status !== 'offline' && (
        <span className="font-normal opacity-80">{status.latencyMs}ms</span>
      )}
    </div>
  );
}
