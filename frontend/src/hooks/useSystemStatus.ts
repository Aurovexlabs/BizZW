import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const HEALTH_POLL_INTERVAL_MS = 30_000;
const HEALTH_CHECK_TIMEOUT_MS = 5_000;
const LAST_SUCCESSFUL_SYNC_KEY = 'bizzw-last-successful-sync-at';

interface BackgroundJobStatus {
  description: string;
  intervalMs: number;
  isRunning: boolean;
  queueDepth: number;
  lastQueueDepth: number;
  totalRuns: number;
  failedRuns: number;
  lastStartedAt: string | null;
  lastFinishedAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastDurationMs: number | null;
  lastErrorMessage: string | null;
}

interface BackgroundJobsSnapshot {
  scheduler: {
    running: boolean;
    queueDepth: number;
    startedAt: string | null;
  };
  jobs: Record<string, BackgroundJobStatus>;
}

interface SystemStatusPayload {
  api: string;
  database: string;
  dbReadyState: number;
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  version: string;
  backgroundJobs?: BackgroundJobsSnapshot;
}

export type PlatformStatus = 'healthy' | 'degraded' | 'offline' | 'checking';

export interface SystemStatus {
  status: PlatformStatus;
  isOnline: boolean;
  isChecking: boolean;
  backendHealthy: boolean;
  latencyMs: number | null;
  lastCheckedAt: Date | null;
  lastSuccessfulSyncAt: Date | null;
  backend: SystemStatusPayload | null;
}

async function fetchSystemStatus(): Promise<SystemStatusPayload & { latencyMs: number }> {
  const start = performance.now();

  const response = await api.get('/system/status', {
    timeout: HEALTH_CHECK_TIMEOUT_MS,
    // This header is useful for backend log filtering if needed.
    headers: { 'x-bizzw-health-check': '1' },
  });

  const payload = response.data?.data as SystemStatusPayload | undefined;

  if (!payload || payload.api !== 'ok') {
    throw new Error('Unexpected health response from backend');
  }

  return {
    ...payload,
    latencyMs: Math.round(performance.now() - start),
  };
}

export function useSystemStatus(): SystemStatus {
  const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine);
  const [lastSuccessfulSyncAt, setLastSuccessfulSyncAt] = useState<Date | null>(() => {
    const raw = localStorage.getItem(LAST_SUCCESSFUL_SYNC_KEY);
    return raw ? new Date(raw) : null;
  });

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const statusQuery = useQuery({
    queryKey: ['system', 'status'],
    queryFn: fetchSystemStatus,
    enabled: isOnline,
    refetchInterval: isOnline ? HEALTH_POLL_INTERVAL_MS : false,
    refetchIntervalInBackground: true,
    retry: 1,
  });

  const backendHealthy = isOnline && !!statusQuery.data && statusQuery.data.database === 'connected';

  useEffect(() => {
    if (!backendHealthy || !statusQuery.dataUpdatedAt) {
      return;
    }

    const successfulAt = new Date(statusQuery.dataUpdatedAt);
    setLastSuccessfulSyncAt(successfulAt);
    localStorage.setItem(LAST_SUCCESSFUL_SYNC_KEY, successfulAt.toISOString());
  }, [backendHealthy, statusQuery.dataUpdatedAt]);

  let status: PlatformStatus = 'checking';
  if (!isOnline) {
    status = 'offline';
  } else if (statusQuery.isPending || statusQuery.isFetching) {
    status = 'checking';
  } else if (backendHealthy) {
    status = 'healthy';
  } else {
    status = 'degraded';
  }

  return {
    status,
    isOnline,
    isChecking: statusQuery.isFetching,
    backendHealthy,
    latencyMs: statusQuery.data?.latencyMs ?? null,
    lastCheckedAt: statusQuery.dataUpdatedAt ? new Date(statusQuery.dataUpdatedAt) : null,
    lastSuccessfulSyncAt,
    backend: statusQuery.data || null,
  };
}
