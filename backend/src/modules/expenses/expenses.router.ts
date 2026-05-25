import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { getTenantDB } from '../../lib/db';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { AppError, asyncHandler, sendSuccess } from '../../middleware/error.middleware';
import { idempotencyMiddleware } from '../../middleware/idempotency.middleware';
import { Currency, ExpenseCategory, UserRole } from '../../shared/types';
import { getExpenseModel } from './expense.model';

const expenseSchema = z.object({
  title: z.string().min(1).max(200),
  category: z.nativeEnum(ExpenseCategory),
  amount: z.number().positive(),
  currency: z.nativeEnum(Currency).default(Currency.USD),
  date: z.string().transform((d) => new Date(d)),
  notes: z.string().optional(),
  receipt: z
    .object({
      fileId: z.string(),
      filePath: z.string(),
    })
    .optional(),
});

export const expensesRouter = Router();
expensesRouter.use(authenticate);

expensesRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const query = z
      .object({
        page: z.coerce.number().default(1),
        limit: z.coerce.number().default(20),
        category: z.nativeEnum(ExpenseCategory).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
      .parse(req.query);

    const db = await getTenantDB(req.user!.orgId!);
    const Expense = getExpenseModel(db);

    const filter: Record<string, unknown> = {};
    if (query.category) filter.category = query.category;
    if (query.startDate || query.endDate) {
      filter.date = {};
      if (query.startDate)
        (filter.date as Record<string, unknown>).$gte = new Date(query.startDate);
      if (query.endDate) (filter.date as Record<string, unknown>).$lte = new Date(query.endDate);
    }

    const [expenses, total] = await Promise.all([
      Expense.find(filter)
        .sort({ date: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit),
      Expense.countDocuments(filter),
    ]);

    sendSuccess(res, expenses, 'Expenses retrieved', 200, {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
      hasNext: query.page * query.limit < total,
      hasPrev: query.page > 1,
    });
  })
);

expensesRouter.get(
  '/summary',
  asyncHandler(async (req: Request, res: Response) => {
    const { month, year } = z
      .object({
        month: z.coerce.number().min(1).max(12).optional(),
        year: z.coerce.number().optional(),
      })
      .parse(req.query);

    const db = await getTenantDB(req.user!.orgId!);
    const Expense = getExpenseModel(db);

    const now = new Date();
    const targetMonth = month ?? now.getMonth() + 1;
    const targetYear = year ?? now.getFullYear();

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    const expenses = await Expense.find({ date: { $gte: startDate, $lte: endDate } });
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

    const byCategory = expenses.reduce(
      (acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
      },
      {} as Record<string, number>
    );

    sendSuccess(
      res,
      { totalAmount, byCategory, count: expenses.length, month: targetMonth, year: targetYear },
      'Expense summary retrieved'
    );
  })
);

expensesRouter.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const db = await getTenantDB(req.user!.orgId!);
    const Expense = getExpenseModel(db);
    const expense = await Expense.findById(req.params.id);
    if (!expense) throw new AppError('Expense not found', 404, 'NOT_FOUND');
    sendSuccess(res, expense, 'Expense retrieved');
  })
);

expensesRouter.post(
  '/',
  authorize(UserRole.ORG_OWNER, UserRole.ORG_ADMIN, UserRole.ACCOUNTANT),
  idempotencyMiddleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const validated = expenseSchema.parse(req.body);
    const db = await getTenantDB(req.user!.orgId!);
    const Expense = getExpenseModel(db);
    const expense = await Expense.create({ ...validated, createdBy: req.user!.userId });
    sendSuccess(res, expense, 'Expense logged', 201);
  })
);

expensesRouter.patch(
  '/:id',
  authorize(UserRole.ORG_OWNER, UserRole.ORG_ADMIN, UserRole.ACCOUNTANT),
  asyncHandler(async (req: Request, res: Response) => {
    const validated = expenseSchema.partial().parse(req.body);
    const db = await getTenantDB(req.user!.orgId!);
    const Expense = getExpenseModel(db);
    const expense = await Expense.findByIdAndUpdate(req.params.id, validated, { new: true });
    if (!expense) throw new AppError('Expense not found', 404, 'NOT_FOUND');
    sendSuccess(res, expense, 'Expense updated');
  })
);

expensesRouter.delete(
  '/:id',
  authorize(UserRole.ORG_OWNER, UserRole.ORG_ADMIN, UserRole.ACCOUNTANT),
  asyncHandler(async (req: Request, res: Response) => {
    const db = await getTenantDB(req.user!.orgId!);
    const Expense = getExpenseModel(db);
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) throw new AppError('Expense not found', 404, 'NOT_FOUND');
    sendSuccess(res, null, 'Expense deleted');
  })
);
