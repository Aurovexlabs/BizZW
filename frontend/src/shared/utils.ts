import { Currency, InvoiceStatus, PLAN_LIMITS, PlanType } from './types';

// ─── Currency ─────────────────────────────────────────────────

export function formatCurrency(amount: number, currency: Currency = Currency.USD): string {
  if (currency === Currency.USD) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  }
  // Zimbabwe Gold (ZiG)
  return `ZiG ${new Intl.NumberFormat('en-ZW', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

export function parseCurrency(value: string): number {
  return parseFloat(value.replace(/[^0-9.-]/g, '')) || 0;
}

export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency,
  zigToUsdRate: number = 13.5
): number {
  if (from === to) return amount;
  if (from === Currency.USD && to === Currency.ZIG) return amount * zigToUsdRate;
  if (from === Currency.ZIG && to === Currency.USD) return amount / zigToUsdRate;
  return amount;
}

// ─── Date Formatting ──────────────────────────────────────────

export function formatDate(date: string | Date, format: 'short' | 'long' | 'iso' = 'short'): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid date';

  if (format === 'iso') return d.toISOString().split('T')[0];
  if (format === 'long') {
    return d.toLocaleDateString('en-ZW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  return d.toLocaleDateString('en-ZW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleString('en-ZW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getRelativeTime(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

export function isOverdue(dueDate: string | Date): boolean {
  return new Date(dueDate) < new Date();
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function startOfMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function getDateRange(period: 'today' | 'week' | 'month' | 'year'): {
  startDate: Date;
  endDate: Date;
} {
  const now = new Date();
  const endDate = new Date(now);

  switch (period) {
    case 'today':
      return {
        startDate: new Date(now.setHours(0, 0, 0, 0)),
        endDate: new Date(endDate.setHours(23, 59, 59, 999)),
      };
    case 'week': {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      return { startDate: weekStart, endDate };
    }
    case 'month':
      return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
    case 'year':
      return {
        startDate: new Date(now.getFullYear(), 0, 1),
        endDate: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
      };
    default:
      return { startDate: startOfMonth(now), endDate };
  }
}

// ─── Number Formatting ────────────────────────────────────────

export function formatNumber(num: number, decimals: number = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function calculateGrowth(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

// ─── String Helpers ───────────────────────────────────────────

export function generateOrgId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function truncate(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── Invoice Helpers ──────────────────────────────────────────

export function generateInvoiceNumber(sequence: number, year: number = new Date().getFullYear()): string {
  return `INV-${year}-${String(sequence).padStart(4, '0')}`;
}

export function generateSaleNumber(sequence: number): string {
  return `SALE-${String(sequence).padStart(6, '0')}`;
}

export function generateReceiptNumber(): string {
  return `RCP-${Date.now()}`;
}

export function getInvoiceStatusColor(status: InvoiceStatus): string {
  const colors: Record<InvoiceStatus, string> = {
    [InvoiceStatus.DRAFT]: 'gray',
    [InvoiceStatus.SENT]: 'blue',
    [InvoiceStatus.PARTIALLY_PAID]: 'yellow',
    [InvoiceStatus.PAID]: 'green',
    [InvoiceStatus.OVERDUE]: 'red',
    [InvoiceStatus.CANCELLED]: 'gray',
  };
  return colors[status];
}

// ─── Plan Helpers ─────────────────────────────────────────────

export function getPlanDisplayName(plan: PlanType): string {
  return capitalize(plan);
}

export function isFeatureAllowed(plan: PlanType, feature: 'aiFeatures' | 'advancedReports' | 'apiAccess'): boolean {
  return PLAN_LIMITS[plan][feature];
}

// ─── Validation Helpers ───────────────────────────────────────

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone: string): boolean {
  // Zimbabwe phone number format
  return /^(\+263|0)[0-9]{9}$/.test(phone.replace(/\s/g, ''));
}

export function isValidSKU(sku: string): boolean {
  return /^[A-Z0-9-_]{3,20}$/.test(sku);
}
