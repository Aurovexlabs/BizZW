import '../index.css';

import { Outlet, createRootRouteWithContext, useRouterState } from '@tanstack/react-router';
import { AnimatePresence, useReducedMotion } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';

import { QueryClient } from '@tanstack/react-query';
import { m, pagePresenceVariants, type MotionSurface } from '../components/motion/AppMotion';
import { useThemeEffect } from '../store/theme.store';

interface RouterContext {
  queryClient: QueryClient;
}

function RootPendingComponent() {
  return (
    <div className="app-shell-bg flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-primary-700 to-primary-500 shadow-lg animate-pulse">
          <span className="text-white font-black text-sm">ZW</span>
        </div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading BizZW…</p>
      </div>
    </div>
  );
}

function RootErrorComponent({ error }: { error: Error }) {
  return (
    <div className="app-shell-bg flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-red-200/70 bg-white/96 p-8 text-center shadow-2xl backdrop-blur dark:border-red-900/40 dark:bg-slate-900/95">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/20">
          <AlertTriangle className="w-7 h-7 text-red-500" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-slate-100">
          Something went wrong
        </h2>
        <p className="mb-6 break-all rounded-lg border border-slate-200 bg-slate-50/85 p-3 text-left font-mono text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {error.message || 'An unexpected error occurred'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-700 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-primary-600"
        >
          <RefreshCw className="w-4 h-4" /> Reload page
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  pendingComponent: RootPendingComponent,
  errorComponent: ({ error }) => <RootErrorComponent error={error as Error} />,
});

const AUTH_ROUTE_PREFIXES = [
  '/login',
  '/register',
  '/forgot-password',
  '/verify-email',
  '/invite',
  '/reset-password',
];

function getRootAnimationKey(pathname: string, isDashboardRoute: boolean) {
  if (isDashboardRoute) {
    return '_dashboard';
  }

  return pathname || '/';
}

function getRootMotionSurface(pathname: string, isDashboardRoute: boolean): MotionSurface {
  if (isDashboardRoute) {
    return 'dashboard';
  }

  if (AUTH_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return 'auth';
  }

  return 'marketing';
}

function RootLayout() {
  useThemeEffect();
  const routerState = useRouterState();
  const shouldReduceMotion = useReducedMotion() ?? false;
  const pathname = routerState.location.pathname;
  const isDashboardRoute = routerState.matches.some((match) => {
    const routeId = match.routeId;
    return routeId === '/_dashboard' || routeId.startsWith('/_dashboard/');
  });
  const surface = getRootMotionSurface(pathname, isDashboardRoute);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <m.div
        key={getRootAnimationKey(pathname, isDashboardRoute)}
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={pagePresenceVariants(shouldReduceMotion, surface)}
      >
        <Outlet />
      </m.div>
    </AnimatePresence>
  );
}
