import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  BarChart3,
  BookOpenText,
  Brain,
  Building2,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Receipt,
  Search,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Users,
  X,
  Zap,
} from 'lucide-react';
import React, { useState } from 'react';

import { useCommandPalette } from '../../hooks/useCommandPalette';
import { useSystemStatus } from '../../hooks/useSystemStatus';
import { api } from '../../lib/api';
import { cn } from '../../lib/cn';
import { useAuthStore } from '../../store/auth.store';
import { getSurfaceMotionProfile, m } from '../motion/AppMotion';
import { NotificationBell } from '../NotificationBell';
import { Avatar } from '../ui';
import { CommandPalette } from '../ui/CommandPalette';
import { IncidentPanel } from './IncidentPanel';
import { PageGuidePanel } from './PageGuidePanel';
import { SystemStatusIndicator } from './SystemStatusIndicator';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Inventory', icon: Package, path: '/inventory' },
  { label: 'Purchase Orders', icon: ShoppingBag, path: '/purchase-orders' },
  { label: 'Invoices', icon: FileText, path: '/invoices' },
  { label: 'Point of Sale', icon: ShoppingCart, path: '/pos' },
  { label: 'Sales History', icon: Receipt, path: '/sales' },
  { label: 'Customers', icon: Users, path: '/customers' },
  { label: 'Expenses', icon: BarChart3, path: '/expenses' },
  { label: 'Reports', icon: BarChart3, path: '/reports' },
  { label: 'Help Center', icon: BookOpenText, path: '/help' },
  { label: 'AI Insights', icon: Brain, path: '/ai', badge: 'AI' },
];

const SETTINGS_ITEMS = [
  { label: 'Profile', icon: Settings, path: '/settings/profile' },
  { label: 'Business', icon: Building2, path: '/settings/business' },
  { label: 'Team', icon: Users, path: '/settings/team' },
  { label: 'Billing', icon: Zap, path: '/settings/billing' },
  { label: 'Webhooks', icon: Zap, path: '/settings/webhooks' },
  { label: 'API Keys', icon: Settings, path: '/settings/api-keys' },
  { label: 'Audit Log', icon: BarChart3, path: '/settings/audit' },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion() ?? false;
  const dashboardMotion = getSurfaceMotionProfile('dashboard');
  const { user, tenant, logout } = useAuthStore();
  const { open: cmdOpen, setOpen: setCmdOpen } = useCommandPalette();
  const systemStatus = useSystemStatus();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;

  async function handleLogout() {
    try {
      await api.post('/auth/logout');
    } catch {
      // Continue local logout even if the server request fails.
    }
    logout();
    navigate({ to: '/login' });
  }

  const Sidebar = () => (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-slate-200/80 bg-white/92 backdrop-blur-xl transition-all duration-300 dark:border-slate-800 dark:bg-slate-900/90',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex items-center gap-3 border-b border-slate-100 px-4 py-5 dark:border-slate-800',
          collapsed && 'justify-center px-2'
        )}
      >
        <div className="w-8 h-8 bg-linear-to-br from-primary-700 to-primary-500 rounded-lg flex items-center justify-center shrink-0 shadow-md">
          <span className="text-white font-black text-xs">ZW</span>
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm leading-tight font-bold text-slate-900 dark:text-slate-100">
              BizZW
            </p>
            <p className="max-w-30 truncate text-xs text-slate-400 dark:text-slate-500">
              {tenant?.name}
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
                active
                  ? 'bg-primary-50/80 text-primary-900 ring-1 ring-primary-200/70 dark:ring-primary-700/50'
                  : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/85 dark:hover:text-slate-100',
                collapsed && 'justify-center px-2'
              )}
              onClick={() => setMobileOpen(false)}
            >
              <item.icon
                className={cn(
                  'w-5 h-5 shrink-0',
                  active
                    ? 'text-primary-700 dark:text-primary-300'
                    : 'text-slate-400 group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:text-slate-200'
                )}
              />
              {!collapsed && <span className="flex-1">{item.label}</span>}
              {!collapsed && item.badge && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-primary-100 text-primary-700 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        <div className={cn('pt-4 pb-2', collapsed ? 'px-0' : 'px-1')}>
          <p
            className={cn(
              'text-[10px] font-semibold text-slate-400 uppercase tracking-widest',
              'dark:text-slate-500',
              collapsed && 'text-center'
            )}
          >
            {collapsed ? '···' : 'Settings'}
          </p>
        </div>

        {SETTINGS_ITEMS.map((item) => {
          const active = pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
                active
                  ? 'bg-primary-50/80 text-primary-900 ring-1 ring-primary-200/70 dark:ring-primary-700/50'
                  : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/85 dark:hover:text-slate-100',
                collapsed && 'justify-center px-2'
              )}
              onClick={() => setMobileOpen(false)}
            >
              <item.icon
                className={cn(
                  'w-5 h-5 shrink-0',
                  active
                    ? 'text-primary-700 dark:text-primary-300'
                    : 'text-slate-400 dark:text-slate-500'
                )}
              />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div
        className={cn(
          'border-t border-slate-100 p-3 dark:border-slate-800',
          collapsed && 'flex justify-center'
        )}
      >
        {collapsed ? (
          <Avatar name={user?.name || 'U'} size="sm" />
        ) : (
          <div className="flex items-center gap-3">
            <Avatar name={user?.name || 'U'} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                {user?.name}
              </p>
              <p className="truncate text-xs text-slate-400 dark:text-slate-500">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-slate-500 dark:hover:bg-rose-500/20 dark:hover:text-rose-300"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 hidden h-6 w-6 items-center justify-center rounded-full border border-slate-200/80 bg-white/95 text-slate-400 shadow-sm transition-all hover:text-slate-700 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500 dark:hover:text-slate-200 lg:flex"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  );

  return (
    <div className="app-shell-bg flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="relative hidden lg:flex shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence initial={false}>
        {mobileOpen && (
          <m.div
            className="fixed inset-0 z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={dashboardMotion.exit}
          >
            <m.button
              type="button"
              aria-label="Close navigation menu"
              className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/50"
              onClick={() => setMobileOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={dashboardMotion.exit}
            />
            <m.div
              className="relative w-60 h-full"
              initial={{ x: shouldReduceMotion ? 0 : -24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: shouldReduceMotion ? 0 : -24, opacity: 0 }}
              transition={dashboardMotion.enter}
            >
              <Sidebar />
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Command Palette */}
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex shrink-0 items-center gap-4 border-b border-slate-200/80 bg-white/88 px-4 py-3 backdrop-blur-xl supports-[backdrop-filter]:bg-white/78 dark:border-slate-800 dark:bg-slate-900/88 dark:supports-[backdrop-filter]:bg-slate-900/72">
          <button
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          {/* Search bar shortcut */}
          <button
            onClick={() => setCmdOpen(true)}
            className="hidden max-w-xs flex-1 items-center gap-2 rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-1.5 text-sm text-slate-500 transition-colors hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 sm:flex"
          >
            <Search className="w-4 h-4" />
            <span>Search…</span>
            <kbd className="ml-auto flex items-center gap-0.5 text-xs opacity-60">
              <span>⌘</span>
              <span>K</span>
            </kbd>
          </button>
          <div className="flex-1" />

          <SystemStatusIndicator status={systemStatus} />

          <NotificationBell />
          <div className="lg:hidden">
            <Avatar name={user?.name || 'U'} size="sm" />
          </div>
        </header>

        {!systemStatus.isOnline && (
          <div className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-800 dark:border-rose-500/45 dark:bg-rose-500/12 dark:text-rose-100">
            You are offline. Some server actions may fail until your connection is restored.
          </div>
        )}

        {systemStatus.isOnline && systemStatus.status === 'degraded' && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800 dark:border-amber-500/45 dark:bg-amber-500/12 dark:text-amber-100">
            Backend response is degraded. Retry-sensitive requests are running with resilience mode.
          </div>
        )}

        <IncidentPanel status={systemStatus} />
        <PageGuidePanel pathname={pathname} />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={pathname}
              className="page-enter"
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={
                shouldReduceMotion
                  ? { opacity: 0, transition: dashboardMotion.exit }
                  : { opacity: 0, y: -6, transition: dashboardMotion.exit }
              }
              transition={dashboardMotion.enter}
            >
              {children}
            </m.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
