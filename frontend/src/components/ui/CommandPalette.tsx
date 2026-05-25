import { useNavigate } from '@tanstack/react-router';
import {
  ArrowRight,
  BarChart3,
  Brain,
  FileText,
  Package,
  Search,
  Settings,
  ShoppingCart,
  Users,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useCustomers, useInvoices, useProducts } from '../../hooks/useApi';
import { cn } from '../../lib/cn';
import { Currency, ICustomer, IInvoice, IProduct } from '../../shared/types';
import { formatCurrency } from '../../shared/utils';
import { useAuthStore } from '../../store/auth.store';

// ─── Static navigation commands ───────────────────────────────

const NAV_COMMANDS = [
  { label: 'Go to Dashboard', icon: BarChart3, path: '/dashboard', group: 'Navigation' },
  { label: 'Open POS', icon: ShoppingCart, path: '/pos', group: 'Navigation' },
  { label: 'New Invoice', icon: FileText, path: '/invoices/new', group: 'Navigation' },
  { label: 'Add Product', icon: Package, path: '/inventory/new', group: 'Navigation' },
  { label: 'View Reports', icon: BarChart3, path: '/reports', group: 'Navigation' },
  { label: 'AI Insights', icon: Brain, path: '/ai', group: 'Navigation' },
  { label: 'Profile Settings', icon: Settings, path: '/settings/profile', group: 'Navigation' },
  { label: 'Business Settings', icon: Settings, path: '/settings/business', group: 'Navigation' },
  { label: 'Team Members', icon: Users, path: '/settings/team', group: 'Navigation' },
  { label: 'Billing & Plans', icon: Settings, path: '/settings/billing', group: 'Navigation' },
];

interface CommandItem {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ElementType;
  path: string;
  group: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { tenant } = useAuthStore();
  const currency = (tenant?.settings?.currency as Currency) || Currency.USD;

  // Fetch matching data
  const { data: productData } = useProducts({ search: query || undefined, limit: 5 });
  const { data: customerData } = useCustomers({ search: query || undefined, limit: 5 });
  const { data: invoiceData } = useInvoices({ limit: 5 });

  const products = (productData?.data || []) as IProduct[];
  const customers = (customerData?.data || []) as ICustomer[];
  const invoices = (invoiceData?.data || []) as IInvoice[];

  // Build command list
  const commands: CommandItem[] = [
    // Nav commands (filtered by query)
    ...NAV_COMMANDS.filter(
      (c) => !query || c.label.toLowerCase().includes(query.toLowerCase())
    ).map((c) => ({ ...c, id: `nav-${c.path}` })),
    // Products
    ...products.map((p) => ({
      id: `product-${p._id}`,
      label: p.name,
      sublabel: `${p.sku} · ${formatCurrency(p.sellPrice, currency)}`,
      icon: Package,
      path: `/inventory/${p._id}`,
      group: 'Products',
    })),
    // Customers
    ...customers.map((c) => ({
      id: `customer-${c._id}`,
      label: c.name,
      sublabel: c.email || c.phone || 'No contact',
      icon: Users,
      path: `/customers/${c._id}`,
      group: 'Customers',
    })),
    // Invoices (only when searching)
    ...(query
      ? invoices
          .filter((i) => i.invoiceNumber.toLowerCase().includes(query.toLowerCase()))
          .map((i) => ({
            id: `invoice-${i._id}`,
            label: i.invoiceNumber,
            sublabel: `${i.status} · ${formatCurrency(i.total, i.currency as Currency)}`,
            icon: FileText,
            path: `/invoices/${i._id}`,
            group: 'Invoices',
          }))
      : []),
  ];

  // Group commands
  const grouped = commands.reduce(
    (acc, cmd) => {
      if (!acc[cmd.group]) acc[cmd.group] = [];
      acc[cmd.group].push(cmd);
      return acc;
    },
    {} as Record<string, CommandItem[]>
  );

  const flatList = Object.values(grouped).flat();

  const handleSelect = useCallback(
    (item: CommandItem) => {
      navigate({ to: item.path as never });
      onClose();
      setQuery('');
    },
    [navigate, onClose]
  );

  useEffect(() => {
    if (open) {
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [open]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, flatList.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (flatList[selected]) handleSelect(flatList[selected]);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, flatList, selected, handleSelect, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selected}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  if (!open) return null;

  let globalIdx = 0;

  return (
    <div className="fixed inset-0 z-100 flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm dark:bg-slate-950/70"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800">
          <Search className="h-5 w-5 shrink-0 text-slate-400 dark:text-slate-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, customers, invoices, or navigate…"
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden items-center gap-1 rounded border border-slate-200 px-1.5 py-0.5 text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500 sm:flex">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-2">
          {flatList.length === 0 && (
            <div className="py-10 text-center text-slate-400 dark:text-slate-500">
              <Search className="mx-auto mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm">No results found</p>
            </div>
          )}

          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <div className="px-4 py-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {group}
                </p>
              </div>
              {items.map((item) => {
                const idx = globalIdx++;
                const isSelected = idx === selected;
                return (
                  <button
                    key={item.id || item.path}
                    data-idx={idx}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelected(idx)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                      isSelected
                        ? 'bg-primary-50 dark:bg-primary-900/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    )}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                        isSelected
                          ? 'bg-primary-100 dark:bg-primary-900/50'
                          : 'bg-slate-100 dark:bg-slate-800'
                      )}
                    >
                      <item.icon
                        className={cn(
                          'h-4 w-4',
                          isSelected
                            ? 'text-primary-700 dark:text-primary-200'
                            : 'text-slate-500 dark:text-slate-400'
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'truncate text-sm font-medium',
                          isSelected
                            ? 'text-primary-900 dark:text-primary-200'
                            : 'text-slate-900 dark:text-slate-100'
                        )}
                      >
                        {item.label}
                      </p>
                      {item.sublabel && (
                        <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                          {item.sublabel}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <ArrowRight className="h-4 w-4 shrink-0 text-primary-500 dark:text-primary-300" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer hints */}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
          <div className="flex gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-slate-200 px-1 dark:border-slate-700">↑↓</kbd>{' '}
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-slate-200 px-1 dark:border-slate-700">↵</kbd>{' '}
              select
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-slate-200 px-1 dark:border-slate-700">⌘K</kbd> to
            open
          </span>
        </div>
      </div>
    </div>
  );
}
