import * as Sentry from '@sentry/node';

let sentryEnabled = false;

export function initializeSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.SENTRY_RELEASE,
    tracesSampleRate: Number(
      process.env.SENTRY_TRACES_SAMPLE_RATE || (process.env.NODE_ENV === 'production' ? '0.1' : '1')
    ),
  });

  sentryEnabled = true;
}

export function captureException(error: unknown, extra?: Record<string, unknown>): void {
  if (!sentryEnabled) {
    return;
  }

  if (!extra) {
    Sentry.captureException(error);
    return;
  }

  Sentry.withScope((scope) => {
    Object.entries(extra).forEach(([key, value]) => {
      scope.setExtra(key, value);
    });
    Sentry.captureException(error);
  });
}
