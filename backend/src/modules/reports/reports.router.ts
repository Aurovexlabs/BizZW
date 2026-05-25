import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { UserRole } from '../../shared/types';
import * as reportsService from './reports.service';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { asyncHandler, sendSuccess } from '../../middleware/error.middleware';

export const reportsRouter = Router();
reportsRouter.use(authenticate);
reportsRouter.use(authorize(UserRole.ORG_OWNER, UserRole.ORG_ADMIN, UserRole.ACCOUNTANT));

const dateRangeSchema = z.object({
  startDate: z.string().default(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  }),
  endDate: z.string().default(() => new Date().toISOString().split('T')[0]),
});

function parseDateRange(query: Record<string, unknown>) {
  const { startDate, endDate } = dateRangeSchema.parse(query);
  return {
    startDate: new Date(startDate),
    endDate: new Date(endDate + 'T23:59:59.999Z'),
  };
}

reportsRouter.get('/dashboard', asyncHandler(async (req: Request, res: Response) => {
  const kpis = await reportsService.getDashboardKPIs(req.user!.orgId!);
  sendSuccess(res, kpis, 'Dashboard KPIs retrieved');
}));

reportsRouter.get('/revenue', asyncHandler(async (req: Request, res: Response) => {
  const range = parseDateRange(req.query as Record<string, unknown>);
  const report = await reportsService.getRevenueReport(req.user!.orgId!, range);
  sendSuccess(res, report, 'Revenue report retrieved');
}));

reportsRouter.get('/profit-loss', asyncHandler(async (req: Request, res: Response) => {
  const range = parseDateRange(req.query as Record<string, unknown>);
  const report = await reportsService.getProfitLossReport(req.user!.orgId!, range);
  sendSuccess(res, report, 'Profit & Loss report retrieved');
}));

reportsRouter.get('/top-products', asyncHandler(async (req: Request, res: Response) => {
  const range = parseDateRange(req.query as Record<string, unknown>);
  const { limit } = z.object({ limit: z.coerce.number().default(10) }).parse(req.query);
  const report = await reportsService.getTopSellingProducts(req.user!.orgId!, range, limit);
  sendSuccess(res, report, 'Top products retrieved');
}));

reportsRouter.get('/inventory-valuation', asyncHandler(async (req: Request, res: Response) => {
  const report = await reportsService.getInventoryValuation(req.user!.orgId!);
  sendSuccess(res, report, 'Inventory valuation retrieved');
}));

reportsRouter.get('/customer-ltv', asyncHandler(async (req: Request, res: Response) => {
  const { limit } = z.object({ limit: z.coerce.number().default(10) }).parse(req.query);
  const report = await reportsService.getCustomerLTV(req.user!.orgId!, limit);
  sendSuccess(res, report, 'Customer LTV retrieved');
}));

reportsRouter.get('/tax-summary', asyncHandler(async (req: Request, res: Response) => {
  const range = parseDateRange(req.query as Record<string, unknown>);
  const report = await reportsService.getTaxSummary(req.user!.orgId!, range);
  sendSuccess(res, report, 'Tax summary retrieved');
}));
