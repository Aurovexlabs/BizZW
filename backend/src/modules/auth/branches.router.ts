import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { UserRole, PLAN_LIMITS } from '../../shared/types';
import { getTenantDB } from '../../lib/db';
import { getBranchModel } from '../auth/branch.model';
import { Tenant } from '../auth/tenant.model';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { asyncHandler, sendSuccess, AppError } from '../../middleware/error.middleware';

const branchSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().min(1),
  managerId: z.string().optional(),
});

export const branchesRouter = Router();
branchesRouter.use(authenticate);

branchesRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  const db = await getTenantDB(req.user!.orgId!);
  const Branch = getBranchModel(db);
  const branches = await Branch.find({}).sort({ createdAt: -1 });
  sendSuccess(res, branches, 'Branches retrieved');
}));

branchesRouter.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const db = await getTenantDB(req.user!.orgId!);
  const Branch = getBranchModel(db);
  const branch = await Branch.findById(req.params.id);
  if (!branch) throw new AppError('Branch not found', 404, 'NOT_FOUND');
  sendSuccess(res, branch, 'Branch retrieved');
}));

branchesRouter.post(
  '/',
  authorize(UserRole.ORG_OWNER, UserRole.ORG_ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const validated = branchSchema.parse(req.body);
    const orgId = req.user!.orgId!;

    // Check branch limit via plan
    const db = await getTenantDB(orgId);
    const Branch = getBranchModel(db);
    const tenant = await Tenant.findOne({ orgId });

    if (tenant) {
      const limits = PLAN_LIMITS[tenant.plan];
      if (limits.maxBranches !== -1) {
        const count = await Branch.countDocuments({ isActive: true });
        if (count >= limits.maxBranches) {
          throw new AppError(
            `Branch limit reached for your ${tenant.plan} plan (${limits.maxBranches} branches). Please upgrade.`,
            402,
            'BRANCH_LIMIT_REACHED'
          );
        }
      }
    }

    const branch = await Branch.create(validated);
    sendSuccess(res, branch, 'Branch created', 201);
  })
);

branchesRouter.patch(
  '/:id',
  authorize(UserRole.ORG_OWNER, UserRole.ORG_ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const validated = branchSchema.partial().parse(req.body);
    const db = await getTenantDB(req.user!.orgId!);
    const Branch = getBranchModel(db);
    const branch = await Branch.findByIdAndUpdate(req.params.id, validated, { new: true });
    if (!branch) throw new AppError('Branch not found', 404, 'NOT_FOUND');
    sendSuccess(res, branch, 'Branch updated');
  })
);

branchesRouter.delete(
  '/:id',
  authorize(UserRole.ORG_OWNER),
  asyncHandler(async (req: Request, res: Response) => {
    const db = await getTenantDB(req.user!.orgId!);
    const Branch = getBranchModel(db);
    const branch = await Branch.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!branch) throw new AppError('Branch not found', 404, 'NOT_FOUND');
    sendSuccess(res, null, 'Branch deactivated');
  })
);
