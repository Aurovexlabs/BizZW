import { Router, Request, Response, NextFunction } from 'express';
import { UserRole, PlanType } from '../../shared/types';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { aiRateLimiter } from '../../middleware/rateLimiter.middleware';
import { AppError } from '../../middleware/error.middleware';
import { Tenant } from '../auth/tenant.model';
import * as aiService from './ai.service';

export const aiRouter = Router();
aiRouter.use(authenticate);
aiRouter.use(aiRateLimiter);

// Plan gate — AI features require Growth plan or higher
async function requireAIPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  const tenant = await Tenant.findOne({ orgId: req.user!.orgId });
  const freePlans: string[] = [PlanType.STARTER];

  if (!tenant || freePlans.includes(tenant.plan)) {
    // For SSE endpoints, send error as SSE
    const isSSE = req.headers.accept === 'text/event-stream';
    if (isSSE) {
      aiService.initSSE(res);
      aiService.sendSSEError(res, 'AI features require the Growth plan or higher. Please upgrade your subscription.');
      return;
    }
    next(new AppError('AI features require Growth plan or higher', 402, 'PLAN_UPGRADE_REQUIRED'));
    return;
  }
  next();
}

// POST /api/v1/ai/forecast — 30-day revenue forecast via SSE
aiRouter.post(
  '/forecast',
  authorize(UserRole.ORG_OWNER, UserRole.ORG_ADMIN),
  requireAIPlan,
  async (req: Request, res: Response) => {
    aiService.initSSE(res);
    await aiService.streamRevenueForecast(req.user!.orgId!, res);
  }
);

// POST /api/v1/ai/restock — smart reorder recommendations via SSE
aiRouter.post(
  '/restock',
  authorize(UserRole.ORG_OWNER, UserRole.ORG_ADMIN),
  requireAIPlan,
  async (req: Request, res: Response) => {
    aiService.initSSE(res);
    await aiService.streamRestockRecommendations(req.user!.orgId!, res);
  }
);

// POST /api/v1/ai/insights — business health summary via SSE
aiRouter.post(
  '/insights',
  authorize(UserRole.ORG_OWNER, UserRole.ORG_ADMIN),
  requireAIPlan,
  async (req: Request, res: Response) => {
    aiService.initSSE(res);
    await aiService.streamBusinessInsights(req.user!.orgId!, res);
  }
);

// POST /api/v1/ai/anomalies — anomaly detection via SSE
aiRouter.post(
  '/anomalies',
  authorize(UserRole.ORG_OWNER, UserRole.ORG_ADMIN),
  requireAIPlan,
  async (req: Request, res: Response) => {
    aiService.initSSE(res);
    await aiService.streamAnomalyDetection(req.user!.orgId!, res);
  }
);
