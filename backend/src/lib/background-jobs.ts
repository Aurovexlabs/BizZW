import { sendEmail, systemAlertTemplate } from './resend';

import { Tenant } from '../modules/auth/tenant.model';
import { markOverdueInvoices } from '../modules/invoices/invoices.service';
import { TenantStatus } from '../shared/types';
import { logger } from './logger';
import { captureException } from './sentry';

const OVERDUE_SWEEP_INTERVAL_MS = 5 * 60 * 1000;
const MAX_FAILURE_MESSAGE_LENGTH = 240;
const MAX_JOB_HISTORY_ITEMS = 300;
const FAILURE_ALERT_MIN_FAILED_RUNS = 2;
const FAILURE_ALERT_COOLDOWN_MS = 30 * 60 * 1000;

export interface BackgroundJobHistoryItem {
  id: string;
  jobName: string;
  status: 'success' | 'failure';
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  queueDepthAtStart: number;
  processedTenants: number;
  updatedInvoices: number;
  errorMessage: string | null;
}

interface BackgroundJobState {
  name: string;
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

interface BackgroundJobHealthSnapshot {
  scheduler: {
    running: boolean;
    queueDepth: number;
    startedAt: string | null;
  };
  jobs: Record<string, Omit<BackgroundJobState, 'name'>>;
}

const jobs: Record<string, BackgroundJobState> = {
  overdueInvoiceSweep: {
    name: 'overdueInvoiceSweep',
    description: 'Marks SENT and PARTIALLY_PAID invoices as OVERDUE across active tenants',
    intervalMs: OVERDUE_SWEEP_INTERVAL_MS,
    isRunning: false,
    queueDepth: 0,
    lastQueueDepth: 0,
    totalRuns: 0,
    failedRuns: 0,
    lastStartedAt: null,
    lastFinishedAt: null,
    lastSuccessAt: null,
    lastFailureAt: null,
    lastDurationMs: null,
    lastErrorMessage: null,
  },
};

const jobHistory: BackgroundJobHistoryItem[] = [];

let schedulerStartedAt: string | null = null;
let overdueSweepTimer: NodeJS.Timeout | null = null;
let lastFailureAlertAt: string | null = null;

function truncateErrorMessage(message: string): string {
  if (message.length <= MAX_FAILURE_MESSAGE_LENGTH) {
    return message;
  }
  return `${message.slice(0, MAX_FAILURE_MESSAGE_LENGTH)}...`;
}

async function maybeSendBackgroundFailureAlert(input: {
  jobName: string;
  failedRuns: number;
  queueDepthAtStart: number;
  processedTenants: number;
  updatedInvoices: number;
  errorMessage: string;
}) {
  if (input.failedRuns < FAILURE_ALERT_MIN_FAILED_RUNS) {
    return;
  }

  const nowMs = Date.now();
  if (lastFailureAlertAt) {
    const lastAlertMs = new Date(lastFailureAlertAt).getTime();
    if (Number.isFinite(lastAlertMs) && nowMs - lastAlertMs < FAILURE_ALERT_COOLDOWN_MS) {
      return;
    }
  }

  const supportInbox = process.env.SUPPORT_EMAIL || 'support@bizzw.dev';
  const incidentId = `JOB-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;
  const occurredAtIso = new Date().toISOString();

  try {
    await sendEmail({
      to: supportInbox,
      subject: `[BizZW Alert][${input.jobName}] repeated background failures`,
      html: systemAlertTemplate({
        incidentId,
        title: 'Background Job Reliability Alert',
        severity: 'high',
        summary:
          'A scheduled background workflow has failed repeatedly and may impact automated invoice status hygiene.',
        occurredAtIso,
        details: [
          { label: 'Job', value: input.jobName },
          { label: 'Consecutive failed runs', value: String(input.failedRuns) },
          { label: 'Queue depth at start', value: String(input.queueDepthAtStart) },
          { label: 'Processed tenants', value: String(input.processedTenants) },
          { label: 'Updated invoices', value: String(input.updatedInvoices) },
          { label: 'Last error', value: input.errorMessage },
        ],
        recommendedActions: [
          'Inspect the background scheduler telemetry endpoint and error traces.',
          'Verify database connectivity and tenant query performance.',
          'Run manual overdue sweep for critical tenants if needed.',
        ],
      }),
    });

    lastFailureAlertAt = occurredAtIso;
  } catch (alertError) {
    logger.error(
      {
        err: alertError,
        job: input.jobName,
      },
      'Failed to send background job alert email'
    );
  }
}

async function runOverdueInvoiceSweep() {
  const job = jobs.overdueInvoiceSweep;

  if (job.isRunning) {
    logger.warn('Skipping overdue invoice sweep because the previous run is still active');
    return;
  }

  job.isRunning = true;
  job.lastStartedAt = new Date().toISOString();
  const startedAtMs = Date.now();
  let queueDepthAtStart = 0;
  let processedTenants = 0;
  let updatedInvoices = 0;
  let failedTenants = 0;

  try {
    const tenants = await Tenant.find(
      { status: { $in: [TenantStatus.ACTIVE, TenantStatus.TRIAL] } },
      { orgId: 1, _id: 0 }
    ).lean();

    queueDepthAtStart = tenants.length;
    job.queueDepth = tenants.length;
    job.lastQueueDepth = tenants.length;

    for (const tenant of tenants) {
      if (!tenant.orgId) {
        continue;
      }

      try {
        const updatedCount = await markOverdueInvoices(tenant.orgId);
        updatedInvoices += updatedCount;
      } catch (tenantError) {
        failedTenants += 1;
        captureException(tenantError, {
          job: job.name,
          orgId: tenant.orgId,
        });
        logger.warn(
          {
            err: tenantError,
            job: job.name,
            orgId: tenant.orgId,
          },
          'Skipping tenant due to overdue sweep error'
        );
      } finally {
        processedTenants += 1;
        job.queueDepth = Math.max(0, tenants.length - processedTenants);
      }
    }

    job.totalRuns += 1;
    job.lastSuccessAt = new Date().toISOString();
    job.lastErrorMessage = null;
    job.lastDurationMs = Date.now() - startedAtMs;

    logger.info(
      {
        job: job.name,
        processedTenants,
        failedTenants,
        updatedInvoices,
        durationMs: job.lastDurationMs,
      },
      'Background job completed'
    );

    const finishedAt = new Date().toISOString();
    const historyItem: BackgroundJobHistoryItem = {
      id: `${job.name}-${Date.now()}`,
      jobName: job.name,
      status: 'success',
      startedAt: job.lastStartedAt || finishedAt,
      finishedAt,
      durationMs: job.lastDurationMs || 0,
      queueDepthAtStart,
      processedTenants,
      updatedInvoices,
      errorMessage: null,
    };

    jobHistory.unshift(historyItem);
    if (jobHistory.length > MAX_JOB_HISTORY_ITEMS) {
      jobHistory.length = MAX_JOB_HISTORY_ITEMS;
    }
  } catch (error) {
    job.totalRuns += 1;
    job.failedRuns += 1;
    job.lastFailureAt = new Date().toISOString();
    job.lastDurationMs = Date.now() - startedAtMs;
    job.lastErrorMessage = truncateErrorMessage(
      error instanceof Error ? error.message : 'Unknown background job failure'
    );

    captureException(error, { job: job.name });
    logger.error({ err: error, job: job.name }, 'Background job failed');

    const finishedAt = new Date().toISOString();
    const historyItem: BackgroundJobHistoryItem = {
      id: `${job.name}-${Date.now()}`,
      jobName: job.name,
      status: 'failure',
      startedAt: job.lastStartedAt || finishedAt,
      finishedAt,
      durationMs: job.lastDurationMs || 0,
      queueDepthAtStart,
      processedTenants,
      updatedInvoices,
      errorMessage: job.lastErrorMessage,
    };

    jobHistory.unshift(historyItem);
    if (jobHistory.length > MAX_JOB_HISTORY_ITEMS) {
      jobHistory.length = MAX_JOB_HISTORY_ITEMS;
    }

    await maybeSendBackgroundFailureAlert({
      jobName: job.name,
      failedRuns: job.failedRuns,
      queueDepthAtStart,
      processedTenants,
      updatedInvoices,
      errorMessage: job.lastErrorMessage || 'Unknown error',
    });
  } finally {
    job.isRunning = false;
    job.queueDepth = 0;
    job.lastFinishedAt = new Date().toISOString();
  }
}

export function getBackgroundJobHistory(limit = 20): BackgroundJobHistoryItem[] {
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(100, Math.floor(limit))) : 20;
  return jobHistory.slice(0, safeLimit);
}

export function startBackgroundJobs() {
  if (overdueSweepTimer) {
    return;
  }

  schedulerStartedAt = new Date().toISOString();

  void runOverdueInvoiceSweep();
  overdueSweepTimer = setInterval(() => {
    void runOverdueInvoiceSweep();
  }, OVERDUE_SWEEP_INTERVAL_MS);

  logger.info({ intervalMs: OVERDUE_SWEEP_INTERVAL_MS }, 'Background scheduler started');
}

export function stopBackgroundJobs() {
  if (!overdueSweepTimer) {
    return;
  }

  clearInterval(overdueSweepTimer);
  overdueSweepTimer = null;
  logger.info('Background scheduler stopped');
}

export function getBackgroundJobHealth(): BackgroundJobHealthSnapshot {
  const jobsSnapshot = Object.fromEntries(
    Object.entries(jobs).map(([jobName, job]) => {
      const { name: _name, ...rest } = job;
      return [jobName, rest];
    })
  ) as Record<string, Omit<BackgroundJobState, 'name'>>;

  const totalQueueDepth = Object.values(jobs).reduce((sum, job) => sum + job.queueDepth, 0);

  return {
    scheduler: {
      running: Boolean(overdueSweepTimer),
      queueDepth: totalQueueDepth,
      startedAt: schedulerStartedAt,
    },
    jobs: jobsSnapshot,
  };
}
