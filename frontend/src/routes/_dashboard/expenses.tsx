import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute } from '@tanstack/react-router';
import { Plus, Receipt, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { z } from 'zod';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Input,
  Modal,
  Select,
  Skeleton,
} from '../../components/ui';
import {
  useCreateExpense,
  useDeleteExpense,
  useExpenses,
  useExpenseSummary,
} from '../../hooks/useApi';
import { CHART_LEGEND_STYLE, CHART_SERIES_EXTENDED, CHART_TOOLTIP } from '../../lib/chartTheme';
import { Currency, ExpenseCategory, IExpense } from '../../shared/types';
import { formatCurrency, formatDate } from '../../shared/utils';
import { useAuthStore } from '../../store/auth.store';

export const Route = createFileRoute('/_dashboard/expenses')({
  component: ExpensesPage,
});

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  category: z.nativeEnum(ExpenseCategory),
  amount: z.coerce.number().positive('Amount must be positive'),
  currency: z.nativeEnum(Currency),
  date: z.string().min(1, 'Date is required'),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const COLORS = CHART_SERIES_EXTENDED;

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  [ExpenseCategory.RENT]: 'Rent',
  [ExpenseCategory.UTILITIES]: 'Utilities',
  [ExpenseCategory.SALARIES]: 'Salaries',
  [ExpenseCategory.SUPPLIES]: 'Supplies',
  [ExpenseCategory.TRANSPORT]: 'Transport',
  [ExpenseCategory.MARKETING]: 'Marketing',
  [ExpenseCategory.MAINTENANCE]: 'Maintenance',
  [ExpenseCategory.OTHER]: 'Other',
};

function ExpensesPage() {
  const { tenant } = useAuthStore();
  const currency = (tenant?.settings?.currency as Currency) || Currency.USD;

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endOfMonth = new Date(year, month, 0);
  const endDate = `${year}-${String(month).padStart(2, '0')}-${endOfMonth.getDate()}`;

  const { data, isLoading } = useExpenses({ page, limit: 20, startDate, endDate });
  const { data: summary } = useExpenseSummary(month, year);
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();

  const expenses = (data?.data || []) as IExpense[];
  const meta = data?.meta as { total: number; totalPages: number } | undefined;
  const sum = summary as { totalAmount: number; byCategory: Record<string, number> } | undefined;

  const pieData = sum?.byCategory
    ? Object.entries(sum.byCategory).map(([name, value]) => ({
        name: CATEGORY_LABELS[name as ExpenseCategory] || name,
        value,
      }))
    : [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      currency,
      date: new Date().toISOString().split('T')[0],
      category: ExpenseCategory.OTHER,
    },
  });

  function onSubmit(data: FormData) {
    createExpense.mutate(data, {
      onSuccess: () => {
        setShowAdd(false);
        reset();
      },
    });
  }

  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Expenses</h1>
          <p className="text-sm text-slate-500">Track and categorize your business expenses</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>
          Log Expense
        </Button>
      </div>

      {/* Month picker */}
      <div className="flex gap-3 items-center">
        <select
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={month}
          onChange={(e) => {
            setMonth(Number(e.target.value));
            setPage(1);
          }}
        >
          {months.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <select
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={year}
          onChange={(e) => {
            setYear(Number(e.target.value));
            setPage(1);
          }}
        >
          {[2023, 2024, 2025, 2026].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Summary + chart */}
        <div className="space-y-4">
          <Card>
            <p className="text-sm text-slate-500">Total this month</p>
            <p className="text-3xl font-black text-slate-900 mt-1">
              {formatCurrency(sum?.totalAmount || 0, currency)}
            </p>
          </Card>

          {pieData.length > 0 && (
            <Card>
              <h3 className="font-semibold text-slate-900 mb-3 text-sm">By Category</h3>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={60} dataKey="value">
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      {...CHART_TOOLTIP}
                      formatter={(v: number) => formatCurrency(v, currency)}
                    />
                    <Legend iconSize={8} wrapperStyle={CHART_LEGEND_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-2">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: COLORS[i % COLORS.length] }}
                      />
                      <span className="text-slate-600">{d.name}</span>
                    </div>
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(d.value, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Expense list */}
        <div className="lg:col-span-2">
          <Card padding={false}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    {['Title', 'Category', 'Date', 'Amount', ''].map((h) => (
                      <th
                        key={h}
                        className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading &&
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 5 }).map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <Skeleton className="h-4 w-full" />
                          </td>
                        ))}
                      </tr>
                    ))}
                  {!isLoading &&
                    expenses.map((e) => (
                      <tr key={e._id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-900">{e.title}</p>
                          {e.notes && (
                            <p className="text-xs text-slate-400 truncate max-w-[160px]">
                              {e.notes}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="default">{CATEGORY_LABELS[e.category]}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{formatDate(e.date)}</td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-900">
                          {formatCurrency(e.amount, e.currency as Currency)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setDeleteId(e._id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>

              {!isLoading && expenses.length === 0 && (
                <EmptyState
                  icon={<Receipt className="w-8 h-8" />}
                  title="No expenses recorded"
                  description="Start logging expenses to track your business costs."
                  action={
                    <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>
                      Log Expense
                    </Button>
                  }
                />
              )}
            </div>

            {meta && meta.totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Page {page} of {meta.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= meta.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Add expense modal */}
      <Modal
        open={showAdd}
        onClose={() => {
          setShowAdd(false);
          reset();
        }}
        title="Log Expense"
        size="md"
        footer={
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowAdd(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button form="add-expense-form" type="submit" loading={createExpense.isPending}>
              Save Expense
            </Button>
          </div>
        }
      >
        <form id="add-expense-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Title"
            placeholder="e.g. Office rent payment"
            required
            error={errors.title?.message}
            {...register('title')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Category"
              required
              options={Object.values(ExpenseCategory).map((c) => ({
                value: c,
                label: CATEGORY_LABELS[c],
              }))}
              error={errors.category?.message}
              {...register('category')}
            />
            <Select
              label="Currency"
              options={Object.values(Currency).map((c) => ({ value: c, label: c }))}
              {...register('currency')}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              required
              error={errors.amount?.message}
              {...register('amount')}
            />
            <Input
              label="Date"
              type="date"
              required
              error={errors.date?.message}
              {...register('date')}
            />
          </div>
          <Input label="Notes" placeholder="Optional notes" {...register('notes')} />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) deleteExpense.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
        }}
        title="Delete Expense"
        description="Delete this expense record? This cannot be undone."
        loading={deleteExpense.isPending}
      />
    </div>
  );
}
