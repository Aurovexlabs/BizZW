import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: (failureCount, error: unknown) => {
        const axiosError = error as { response?: { status: number } };
        // Don't retry 401, 403, 404 errors
        if ([401, 403, 404].includes(axiosError?.response?.status ?? 0)) return false;
        return failureCount < 2;
      },
    },
  },
});

// ─── Centralized Query Keys ───────────────────────────────────

export const queryKeys = {
  // Auth
  me: ['auth', 'me'] as const,
  team: ['auth', 'team'] as const,

  // Inventory
  products: (filters?: Record<string, unknown>) => ['inventory', 'products', filters] as const,
  product: (id: string) => ['inventory', 'product', id] as const,
  categories: ['inventory', 'categories'] as const,
  lowStock: ['inventory', 'low-stock'] as const,

  // Invoices
  invoices: (filters?: Record<string, unknown>) => ['invoices', filters] as const,
  invoice: (id: string) => ['invoices', id] as const,

  // Sales
  sales: (filters?: Record<string, unknown>) => ['sales', filters] as const,
  sale: (id: string) => ['sales', id] as const,
  todaySales: ['sales', 'today'] as const,

  // Customers
  customers: (filters?: Record<string, unknown>) => ['customers', filters] as const,
  customer: (id: string) => ['customers', id] as const,

  // Expenses
  expenses: (filters?: Record<string, unknown>) => ['expenses', filters] as const,
  expenseSummary: (month?: number, year?: number) => ['expenses', 'summary', month, year] as const,

  // Reports
  dashboardKPIs: ['reports', 'dashboard'] as const,
  revenueReport: (range?: Record<string, string>) => ['reports', 'revenue', range] as const,
  profitLoss: (range?: Record<string, string>) => ['reports', 'profit-loss', range] as const,
  topProducts: (range?: Record<string, string>) => ['reports', 'top-products', range] as const,
  inventoryValuation: ['reports', 'inventory-valuation'] as const,
  customerLTV: ['reports', 'customer-ltv'] as const,
  taxSummary: (range?: Record<string, string>) => ['reports', 'tax-summary', range] as const,

  // Subscriptions
  subscription: ['subscriptions'] as const,
  usage: ['subscriptions', 'usage'] as const,
  billing: ['subscriptions', 'billing'] as const,

  // Branches
  branches: ['branches'] as const,
  branch: (id: string) => ['branches', id] as const,
} as const;
