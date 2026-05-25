import { getBackgroundJobHealth, getBackgroundJobHistory } from './lib/background-jobs';
import { getCacheHealth } from './lib/cache';

import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import mongoSanitize from 'express-mongo-sanitize';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { getIdempotencyStoreHealth } from './lib/idempotency-store';
import { requestLogger } from './lib/logger';
import { arcjetMiddleware } from './middleware/arcjet.middleware';
import { errorHandler } from './middleware/error.middleware';
import { tenantCacheInvalidationMiddleware } from './middleware/tenant-cache.middleware';
import { aiRouter } from './modules/ai/ai.router';
import { apiKeysRouter } from './modules/api-keys/api-keys.router';
import { auditRouter } from './modules/audit/audit.router';
import { authRouter } from './modules/auth/auth.router';
import { branchesRouter } from './modules/auth/branches.router';
import { customersRouter } from './modules/customers/customers.router';
import { expensesRouter } from './modules/expenses/expenses.router';
import { inventoryRouter } from './modules/inventory/inventory.router';
import { invoicesRouter } from './modules/invoices/invoices.router';
import { mediaRouter } from './modules/media/media.router';
import { notificationsRouter } from './modules/notifications/notifications.router';
import { publicRouter } from './modules/public/public.router';
import { purchaseOrdersRouter } from './modules/purchase-orders/purchase-orders.router';
import { reportsRouter } from './modules/reports/reports.router';
import { salesRouter } from './modules/sales/sales.router';
import { subscriptionsRouter } from './modules/subscriptions/subscriptions.router';
import { webhooksRouter } from './modules/webhooks/webhooks.router';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

const DEFAULT_GENERAL_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_GENERAL_RATE_LIMIT_MAX = process.env.NODE_ENV === 'production' ? 1200 : 3000;

const DB_READY_STATE: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

function getDbStatusLabel(state: number): string {
  return DB_READY_STATE[state] || 'unknown';
}

function toPositiveInt(rawValue: string | undefined, fallback: number): number {
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

function isSystemStatusRoute(pathname: string): boolean {
  return pathname.endsWith('/system/status') || pathname.endsWith('/system/jobs/history');
}

const configuredOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const defaultDevOrigins =
  process.env.NODE_ENV === 'production'
    ? []
    : [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:4173',
        'http://127.0.0.1:4173',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
      ];

const allowedOrigins = [...new Set([...defaultDevOrigins, ...configuredOrigins])];

// ─── Security Middleware ───────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false, // Configured per-route as needed
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('CORS origin denied'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-idempotency-key',
      'x-bizzw-offline-replay',
      'x-bizzw-health-check',
    ],
    exposedHeaders: ['x-idempotency-replayed'],
  })
);

app.use(mongoSanitize());
app.use(cookieParser());

if (process.env.NODE_ENV !== 'test') {
  app.use(requestLogger);
}

app.use('/api', arcjetMiddleware);

// ─── General Rate Limiting ─────────────────────────────────────
const generalRateLimitWindowMs = toPositiveInt(
  process.env.API_RATE_LIMIT_WINDOW_MS,
  DEFAULT_GENERAL_RATE_LIMIT_WINDOW_MS
);
const generalRateLimitMax = toPositiveInt(
  process.env.API_RATE_LIMIT_MAX,
  DEFAULT_GENERAL_RATE_LIMIT_MAX
);

const generalLimiter = rateLimit({
  windowMs: generalRateLimitWindowMs,
  max: generalRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const requestPath = req.originalUrl.split('?')[0] || req.url.split('?')[0] || req.path;
    return req.method === 'GET' && isSystemStatusRoute(requestPath);
  },
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    errorCode: 'RATE_LIMITED',
  },
});

app.use('/api', generalLimiter);

// ─── Body Parsing ─────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
app.use('/api/v1', tenantCacheInvalidationMiddleware);

// ─── Health Check ────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'BizZW API is healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: process.uptime(),
  });
});

// ─── API Routes ───────────────────────────────────────────────
const API_V1 = '/api/v1';

app.get(`${API_V1}/system/status`, (_req, res) => {
  const dbReadyState = mongoose.connection.readyState;
  const jobs = getBackgroundJobHealth();
  const idempotency = getIdempotencyStoreHealth();
  const cache = getCacheHealth();

  res.json({
    success: true,
    data: {
      api: 'ok',
      database: getDbStatusLabel(dbReadyState),
      dbReadyState,
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || 'unknown',
      backgroundJobs: jobs,
      idempotency,
      cache,
    },
    message: 'System status fetched successfully',
  });
});

app.get(`${API_V1}/system/jobs/history`, (req, res) => {
  const rawLimit = typeof req.query.limit === 'string' ? Number(req.query.limit) : 20;
  const history = getBackgroundJobHistory(rawLimit);

  res.json({
    success: true,
    data: {
      items: history,
      count: history.length,
    },
    message: 'Background job history fetched successfully',
  });
});

app.use(`${API_V1}/public`, publicRouter);

app.use(`${API_V1}/auth`, authRouter);
app.use(`${API_V1}/media`, mediaRouter);
app.use(`${API_V1}/inventory`, inventoryRouter);
app.use(`${API_V1}/invoices`, invoicesRouter);
app.use(`${API_V1}/sales`, salesRouter);
app.use(`${API_V1}/customers`, customersRouter);
app.use(`${API_V1}/expenses`, expensesRouter);
app.use(`${API_V1}/reports`, reportsRouter);
app.use(`${API_V1}/ai`, aiRouter);
app.use(`${API_V1}/subscriptions`, subscriptionsRouter);
app.use(`${API_V1}/branches`, branchesRouter);
app.use(`${API_V1}/notifications`, notificationsRouter);
app.use(`${API_V1}/audit`, auditRouter);
app.use(`${API_V1}/purchase-orders`, purchaseOrdersRouter);
app.use(`${API_V1}/webhooks`, webhooksRouter);
app.use(`${API_V1}/api-keys`, apiKeysRouter);

// ─── 404 Handler ──────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Global Error Handler ─────────────────────────────────────
app.use(errorHandler);

export default app;
