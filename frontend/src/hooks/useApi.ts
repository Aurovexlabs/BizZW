import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, extractData, postWithOfflineQueue, QueueableMutationResult } from '../lib/api';
import { createMutationIdempotencyKey } from '../lib/offlineQueue';
import { queryKeys } from '../lib/queryClient';
import {
  Currency,
  IApiKey,
  IAuditLog,
  ICustomer,
  IExpense,
  IInvoice,
  INotification,
  IProduct,
  IPurchaseOrder,
  ISale,
  ITenant,
  IUser,
  IWebhook,
  PaymentMethod,
  PlanType,
} from '../shared/types';

// ─── Auth / Profile ───────────────────────────────────────────

export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: () => api.get('/auth/me').then(extractData<{ user: IUser; tenant: ITenant }>),
    staleTime: 1000 * 60 * 5,
  });
}

export function useTeam() {
  return useQuery({
    queryKey: queryKeys.team,
    queryFn: () => api.get('/auth/team').then(extractData<IUser[]>),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string; avatar?: { fileId: string; filePath: string } }) =>
      api.patch('/auth/profile', data).then(extractData<IUser>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.me });
      toast.success('Profile updated');
    },
  });
}

export function useInviteTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; role: string }) => api.post('/auth/invite', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.team });
    },
  });
}

export function useSubmitContactMessage() {
  return useMutation({
    mutationFn: (data: {
      name: string;
      email: string;
      company?: string;
      phone?: string;
      topic?: 'sales' | 'support' | 'partnership' | 'security' | 'billing' | 'general';
      message: string;
      hp?: string;
    }) => {
      const idempotencyKey = createMutationIdempotencyKey();

      return api
        .post('/public/contact', data, {
          headers: {
            'x-idempotency-key': idempotencyKey,
          },
        })
        .then(
          extractData<{
            ticketId: string;
            expectedResponseWindow: string;
          }>
        );
    },
    onSuccess: (result) => {
      toast.success(`Message sent successfully. Ticket ${result.ticketId}`);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err?.response?.data?.message || 'Could not send message right now');
    },
  });
}

// ─── Inventory ────────────────────────────────────────────────

export function useProducts(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.products(filters),
    queryFn: () =>
      api
        .get('/inventory', { params: filters })
        .then((r) => r.data as { data: IProduct[]; meta: unknown }),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: queryKeys.product(id),
    queryFn: () => api.get(`/inventory/${id}`).then(extractData<IProduct>),
    enabled: !!id,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => api.get('/inventory/categories').then(extractData<string[]>),
  });
}

export function useLowStockProducts() {
  return useQuery({
    queryKey: queryKeys.lowStock,
    queryFn: () => api.get('/inventory/low-stock').then(extractData<IProduct[]>),
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<IProduct>) =>
      postWithOfflineQueue<IProduct>('/inventory', data, 'Create product'),
    onSuccess: (result: QueueableMutationResult<IProduct>) => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      if (result.queued) {
        if (result.deduplicated) {
          toast.info('Matching product action already queued offline');
          return;
        }
        toast.success('Product queued offline and will sync automatically');
        return;
      }
      toast.success('Product created');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err?.response?.data?.message || 'Failed to create product');
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<IProduct> }) =>
      api.patch(`/inventory/${id}`, data).then(extractData<IProduct>),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: queryKeys.product(id) });
      toast.success('Product updated');
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/inventory/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Product deleted');
    },
  });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      type: 'IN' | 'OUT' | 'ADJUSTMENT';
      quantity: number;
      reason: string;
    }) => api.post(`/inventory/${id}/stock-adjust`, data).then(extractData<IProduct>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Stock adjusted');
    },
  });
}

// ─── Invoices ─────────────────────────────────────────────────

export function useInvoices(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.invoices(filters),
    queryFn: () =>
      api
        .get('/invoices', { params: filters })
        .then((r) => r.data as { data: IInvoice[]; meta: unknown }),
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: queryKeys.invoice(id),
    queryFn: () => api.get(`/invoices/${id}`).then(extractData<IInvoice>),
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<IInvoice>) =>
      postWithOfflineQueue<IInvoice>('/invoices', data, 'Create invoice'),
    onSuccess: (result: QueueableMutationResult<IInvoice>) => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      if (result.queued) {
        if (result.deduplicated) {
          toast.info('Matching invoice action already queued offline');
          return;
        }
        toast.success('Invoice queued offline and will sync automatically');
        return;
      }
      toast.success('Invoice created');
    },
  });
}

export function useSendInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/invoices/${id}/send`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice sent via email');
    },
  });
}

export function useMarkInvoicePaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, paynowRef }: { id: string; paynowRef?: string }) =>
      api.post(`/invoices/${id}/mark-paid`, { paynowRef }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice marked as paid');
    },
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/invoices/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice deleted');
    },
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<IInvoice> }) =>
      api.patch(`/invoices/${id}`, data).then(extractData<IInvoice>),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: queryKeys.invoice(id) });
      toast.success('Invoice updated');
    },
  });
}

// ─── Sales ────────────────────────────────────────────────────

export function useSales(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.sales(filters),
    queryFn: () =>
      api
        .get('/sales', { params: filters })
        .then((r) => r.data as { data: ISale[]; meta: unknown }),
  });
}

export function useSale(id: string) {
  return useQuery({
    queryKey: queryKeys.sale(id),
    queryFn: () => api.get(`/sales/${id}`).then(extractData<ISale>),
    enabled: !!id,
  });
}

export function useTodaySales() {
  return useQuery({
    queryKey: queryKeys.todaySales,
    queryFn: () =>
      api.get('/sales/today').then(
        extractData<{
          totalRevenue: number;
          totalTransactions: number;
          byMethod: Record<string, number>;
          sales: ISale[];
        }>
      ),
    refetchInterval: 60_000, // refresh every minute
  });
}

export function useSearchProducts(query: string) {
  return useQuery({
    queryKey: ['pos-search', query],
    queryFn: () =>
      api.get('/sales/search-products', { params: { q: query } }).then(extractData<IProduct[]>),
    enabled: query.length >= 2,
    staleTime: 30_000,
  });
}

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      items: { productId: string; quantity: number }[];
      discount: number;
      currency: Currency;
      paymentMethod: PaymentMethod;
      amountPaid: number;
      customerId?: string;
      notes?: string;
    }) => api.post('/sales', data).then(extractData<ISale>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: queryKeys.todaySales });
    },
  });
}

// ─── Customers ────────────────────────────────────────────────

export function useCustomers(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.customers(filters),
    queryFn: () =>
      api
        .get('/customers', { params: filters })
        .then((r) => r.data as { data: ICustomer[]; meta: unknown }),
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: queryKeys.customer(id),
    queryFn: () =>
      api
        .get(`/customers/${id}`)
        .then(extractData<{ customer: ICustomer; invoices: IInvoice[]; sales: ISale[] }>),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ICustomer>) =>
      postWithOfflineQueue<ICustomer>('/customers', data, 'Create customer'),
    onSuccess: (result: QueueableMutationResult<ICustomer>) => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      if (result.queued) {
        if (result.deduplicated) {
          toast.info('Matching customer action already queued offline');
          return;
        }
        toast.success('Customer queued offline and will sync automatically');
        return;
      }
      toast.success('Customer created');
    },
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ICustomer> }) =>
      api.patch(`/customers/${id}`, data).then(extractData<ICustomer>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer updated');
    },
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/customers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer deleted');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err?.response?.data?.message || 'Failed to delete customer');
    },
  });
}

// ─── Expenses ─────────────────────────────────────────────────

export function useExpenses(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.expenses(filters),
    queryFn: () =>
      api
        .get('/expenses', { params: filters })
        .then((r) => r.data as { data: IExpense[]; meta: unknown }),
  });
}

export function useExpenseSummary(month?: number, year?: number) {
  return useQuery({
    queryKey: queryKeys.expenseSummary(month, year),
    queryFn: () =>
      api
        .get('/expenses/summary', { params: { month, year } })
        .then(
          extractData<{ totalAmount: number; byCategory: Record<string, number>; count: number }>
        ),
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<IExpense>) =>
      postWithOfflineQueue<IExpense>('/expenses', data, 'Log expense'),
    onSuccess: (result: QueueableMutationResult<IExpense>) => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      if (result.queued) {
        if (result.deduplicated) {
          toast.info('Matching expense action already queued offline');
          return;
        }
        toast.success('Expense queued offline and will sync automatically');
        return;
      }
      toast.success('Expense logged');
    },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/expenses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense deleted');
    },
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<IExpense> }) =>
      api.patch(`/expenses/${id}`, data).then(extractData<IExpense>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense updated');
    },
  });
}

// ─── Reports ──────────────────────────────────────────────────

export function useDashboardKPIs() {
  return useQuery({
    queryKey: queryKeys.dashboardKPIs,
    queryFn: () =>
      api.get('/reports/dashboard').then(
        extractData<{
          monthlyRevenue: number;
          revenueGrowth: number;
          monthlySalesCount: number;
          overdueInvoices: number;
          totalCustomers: number;
          lowStockCount: number;
          monthlyExpenses: number;
        }>
      ),
    staleTime: 1000 * 60 * 5,
  });
}

export function useRevenueReport(range?: { startDate: string; endDate: string }) {
  return useQuery({
    queryKey: queryKeys.revenueReport(range),
    queryFn: () => api.get('/reports/revenue', { params: range }).then(extractData),
  });
}

export function useProfitLoss(range?: { startDate: string; endDate: string }) {
  return useQuery({
    queryKey: queryKeys.profitLoss(range),
    queryFn: () => api.get('/reports/profit-loss', { params: range }).then(extractData),
  });
}

export function useTopProducts(range?: { startDate: string; endDate: string }) {
  return useQuery({
    queryKey: queryKeys.topProducts(range),
    queryFn: () => api.get('/reports/top-products', { params: range }).then(extractData),
  });
}

export function useInventoryValuation() {
  return useQuery({
    queryKey: queryKeys.inventoryValuation,
    queryFn: () => api.get('/reports/inventory-valuation').then(extractData),
  });
}

export function useCustomerLTV() {
  return useQuery({
    queryKey: queryKeys.customerLTV,
    queryFn: () => api.get('/reports/customer-ltv').then(extractData<ICustomer[]>),
  });
}

// ─── Subscriptions ────────────────────────────────────────────

export function useSubscription() {
  return useQuery({
    queryKey: queryKeys.subscription,
    queryFn: () => api.get('/subscriptions').then(extractData),
  });
}

export function useUsageLimits() {
  return useQuery({
    queryKey: queryKeys.usage,
    queryFn: () => api.get('/subscriptions/usage').then(extractData),
  });
}

export function useBillingHistory() {
  return useQuery({
    queryKey: queryKeys.billing,
    queryFn: () => api.get('/subscriptions/billing').then(extractData),
  });
}

export function useUpgradePlan() {
  return useMutation({
    mutationFn: (plan: PlanType) =>
      api
        .post('/subscriptions/upgrade', { plan })
        .then(extractData<{ redirectUrl: string; reference: string }>),
    onSuccess: (data) => {
      window.location.href = data.redirectUrl;
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err?.response?.data?.message || 'Payment initiation failed');
    },
  });
}

export function useUpdateBusinessSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      data: Partial<ITenant['settings']> & { logo?: { fileId: string; filePath: string } }
    ) => api.patch('/subscriptions/settings', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.me });
      toast.success('Business settings updated');
    },
  });
}

// ─── Branches ─────────────────────────────────────────────────

export function useBranches() {
  return useQuery({
    queryKey: queryKeys.branches,
    queryFn: () => api.get('/branches').then(extractData),
  });
}

export function useCreateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; address: string; managerId?: string }) =>
      api.post('/branches', data).then(extractData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.branches });
      toast.success('Branch created');
    },
  });
}

export function useDeleteBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/branches/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.branches });
      toast.success('Branch deactivated');
    },
  });
}

// ─── CSV Downloads ────────────────────────────────────────────

export function downloadCSV(url: string, filename: string): void {
  api
    .get(url, { responseType: 'blob' })
    .then((response) => {
      const blob = new Blob([response.data as BlobPart], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    })
    .catch(() => toast.error('Export failed'));
}

export function useExportInventoryCSV() {
  return () =>
    downloadCSV('/inventory/export.csv', `inventory-${new Date().toISOString().split('T')[0]}.csv`);
}

export function useExportSalesCSV() {
  return (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const query = params.toString();
    downloadCSV(
      `/sales/export.csv${query ? '?' + query : ''}`,
      `sales-${new Date().toISOString().split('T')[0]}.csv`
    );
  };
}

// ─── Notifications ────────────────────────────────────────────

export function useNotifications(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['notifications', filters],
    queryFn: () =>
      api
        .get('/notifications', { params: filters })
        .then(
          (r) => r.data as { data: INotification[]; meta: { unreadCount: number; total: number } }
        ),
    refetchInterval: 30000, // poll every 30s
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get('/notifications/unread-count').then((r) => r.data.data.count as number),
    refetchInterval: 30000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

// ─── Audit Log ────────────────────────────────────────────────

export function useAuditLogs(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['audit', filters],
    queryFn: () =>
      api
        .get('/audit', { params: filters })
        .then((r) => r.data as { data: IAuditLog[]; meta: { total: number } }),
  });
}

export function useAuditStats() {
  return useQuery({
    queryKey: ['audit', 'stats'],
    queryFn: () =>
      api
        .get('/audit/stats')
        .then(extractData<{ byAction: unknown[]; byUser: unknown[]; timeline: unknown[] }>),
  });
}

// ─── Purchase Orders ──────────────────────────────────────────

export function usePurchaseOrders(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['purchase-orders', filters],
    queryFn: () =>
      api
        .get('/purchase-orders', { params: filters })
        .then((r) => r.data as { data: IPurchaseOrder[]; meta: unknown }),
  });
}

export function usePurchaseOrder(id: string) {
  return useQuery({
    queryKey: ['purchase-orders', id],
    queryFn: () => api.get(`/purchase-orders/${id}`).then(extractData<IPurchaseOrder>),
    enabled: !!id,
  });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) =>
      api.post('/purchase-orders', data).then(extractData<IPurchaseOrder>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('Purchase order created');
    },
    onError: () => toast.error('Failed to create purchase order'),
  });
}

export function useUpdatePOStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/purchase-orders/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('Status updated');
    },
  });
}

export function useReceivePO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      items,
    }: {
      id: string;
      items: { productId: string; receivedQuantity: number }[];
    }) => api.post(`/purchase-orders/${id}/receive`, { items }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Stock updated from purchase order');
    },
  });
}

// ─── Webhooks ─────────────────────────────────────────────────

export function useWebhooks() {
  return useQuery({
    queryKey: ['webhooks'],
    queryFn: () => api.get('/webhooks').then(extractData<IWebhook[]>),
  });
}

export function useCreateWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { url: string; events: string[] }) =>
      api.post('/webhooks', data).then(extractData<IWebhook>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success('Webhook created');
    },
  });
}

export function useDeleteWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/webhooks/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success('Webhook deleted');
    },
  });
}

export function useTestWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post(`/webhooks/${id}/test`).then(extractData<{ event: string }>),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success(`Test webhook sent (${result.event})`);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err?.response?.data?.message || 'Failed to send test webhook');
    },
  });
}

// ─── API Keys ─────────────────────────────────────────────────

export function useApiKeys() {
  return useQuery({
    queryKey: ['api-keys'],
    queryFn: () => api.get('/api-keys').then(extractData<IApiKey[]>),
  });
}

export function useCreateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; permissions: string[]; expiresInDays?: number }) =>
      api.post('/api-keys', data).then(extractData<IApiKey & { key: string }>),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['api-keys'] }),
  });
}

export function useDeactivateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/api-keys/${id}/deactivate`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('API key deactivated');
    },
  });
}

export function useDeleteApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api-keys/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('API key deleted');
    },
  });
}
