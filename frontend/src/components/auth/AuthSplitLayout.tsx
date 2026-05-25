import { ArrowRight, BarChart3, ShieldCheck, Sparkles, WalletCards, Workflow } from 'lucide-react';
import { fadeUp, getSurfaceMotionProfile, m, staggerContainer } from '../motion/AppMotion';

import { Link } from '@tanstack/react-router';
import { useReducedMotion } from 'framer-motion';
import React from 'react';
import { cn } from '../../lib/cn';

interface AuthSplitLayoutProps {
  mode: 'login' | 'register';
  formTitle: string;
  formDescription: string;
  children: React.ReactNode;
}

const VALUE_ITEMS = [
  {
    icon: Workflow,
    title: 'Unified operations',
    description: 'Inventory, invoicing, customers, and analytics in one fast workflow.',
  },
  {
    icon: ShieldCheck,
    title: 'Security by default',
    description: 'Tenant-aware architecture, controlled access, and reliable auditability.',
  },
  {
    icon: BarChart3,
    title: 'Live business visibility',
    description: 'Make confident decisions with performance telemetry and trend insights.',
  },
];

const TRUST_POINTS = [
  '99.99% target uptime posture',
  'Offline-safe mutation queue',
  'Enterprise incident telemetry',
];

export function AuthSplitLayout({
  mode,
  formTitle,
  formDescription,
  children,
}: AuthSplitLayoutProps) {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const authMotion = getSurfaceMotionProfile('auth');

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="relative grid min-h-screen w-full grid-cols-1 lg:grid-cols-2">
        <section className="order-1 min-w-0 bg-white text-slate-900 lg:order-2 lg:border-l lg:border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
          <div className="flex min-h-full w-full items-center justify-center px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
            <m.div
              className="auth-panel-enter w-full max-w-lg"
              initial="hidden"
              animate="visible"
              variants={fadeUp(14, 0, authMotion.enter)}
            >
              <nav
                className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1.5 dark:bg-slate-800/85"
                aria-label="Authentication mode"
              >
                <Link
                  to="/login"
                  className={cn(
                    'rounded-lg px-3 py-2 text-center text-sm font-semibold transition-colors',
                    mode === 'login'
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  )}
                  aria-current={mode === 'login' ? 'page' : undefined}
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className={cn(
                    'rounded-lg px-3 py-2 text-center text-sm font-semibold transition-colors',
                    mode === 'register'
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  )}
                  aria-current={mode === 'register' ? 'page' : undefined}
                >
                  Sign Up
                </Link>
              </nav>

              <header className="mt-6">
                <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                  {formTitle}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {formDescription}
                </p>
              </header>

              <m.div className="mt-6" variants={fadeUp(10, 0.08, authMotion.enter)}>
                {children}
              </m.div>

              <div className="mt-6 inline-flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <ArrowRight className="h-3.5 w-3.5 text-primary-700" />
                Enterprise-ready onboarding experience
              </div>
            </m.div>
          </div>
        </section>

        <aside className="relative order-2 min-w-0 overflow-hidden bg-primary-50/60 text-slate-900 lg:order-1 dark:bg-slate-950 dark:text-slate-100">
          <div className="auth-split-glow pointer-events-none absolute inset-0" />
          <div
            className={cn(
              'pointer-events-none absolute -left-24 top-24 h-64 w-64 rounded-full bg-primary-400/15 blur-3xl',
              !shouldReduceMotion && 'auth-orb-float'
            )}
          />
          <div
            className={cn(
              'pointer-events-none absolute right-0 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-accent-400/15 blur-3xl',
              !shouldReduceMotion && 'auth-orb-float'
            )}
            style={shouldReduceMotion ? undefined : { animationDelay: '-2.8s' }}
          />

          <div className="relative flex min-h-full w-full items-center px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
            <m.div
              className="auth-panel-enter w-full max-w-2xl"
              initial="hidden"
              animate="visible"
              variants={fadeUp(16, 0, authMotion.enter)}
            >
              <div className="flex items-center justify-between gap-4">
                <Link to="/" className="inline-flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-primary-500 to-accent-500 shadow-lg shadow-primary-900/40">
                    <span className="text-sm font-black tracking-wide text-white">ZW</span>
                  </div>
                  <div>
                    <p className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                      BizZW
                    </p>
                    <p className="text-xs text-primary-700 dark:text-primary-200">
                      Enterprise commerce infrastructure
                    </p>
                  </div>
                </Link>

                <div className="hidden rounded-full border border-primary-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-700 dark:border-white/20 dark:bg-white/10 dark:text-primary-100 sm:block">
                  Production-grade
                </div>
              </div>

              <m.div className="mt-8 max-w-xl" variants={fadeUp(12, 0.06, authMotion.enter)}>
                <p className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 dark:border-primary-200/30 dark:bg-primary-400/10 dark:text-primary-100">
                  <Sparkles className="h-3.5 w-3.5" />
                  Built for speed, trust, and scale
                </p>
                <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-slate-900 dark:text-white sm:text-4xl lg:text-[2.65rem]">
                  Run your operations on a platform designed for relentless execution.
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-7 text-slate-700 dark:text-slate-200 sm:text-base">
                  BizZW helps ambitious teams unify finance, inventory, and customer workflows with
                  enterprise-level reliability and elegant day-to-day experience.
                </p>
              </m.div>

              <m.div
                className="mt-8 grid gap-3 sm:grid-cols-3"
                variants={staggerContainer(0.08, 0.1)}
              >
                {TRUST_POINTS.map((point) => (
                  <m.div
                    key={point}
                    variants={fadeUp(8, 0, authMotion.enter)}
                    className="rounded-2xl border border-slate-200 bg-white/85 px-3 py-3 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-slate-950/55 dark:text-slate-100"
                  >
                    {point}
                  </m.div>
                ))}
              </m.div>

              <m.div className="mt-8 space-y-3" variants={staggerContainer(0.08, 0.15)}>
                {VALUE_ITEMS.map((item) => (
                  <m.article
                    key={item.title}
                    variants={fadeUp(10, 0, authMotion.enter)}
                    className="rounded-2xl border border-slate-200 bg-white/88 p-4 dark:border-white/12 dark:bg-white/4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-700 dark:bg-primary-400/20 dark:text-primary-100">
                        <item.icon className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                          {item.title}
                        </h2>
                        <p className="mt-1 text-xs leading-6 text-slate-600 dark:text-slate-300">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </m.article>
                ))}
              </m.div>

              <m.div
                className="mt-8 rounded-2xl border border-primary-200 bg-linear-to-r from-primary-100 to-accent-100 p-4 shadow-sm dark:border-white/15 dark:from-primary-900/80 dark:to-accent-900/80 dark:shadow-lg dark:shadow-primary-950/40"
                variants={fadeUp(10, 0.2, authMotion.enter)}
                transition={authMotion.enter}
              >
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary-700 dark:text-primary-100">
                  <WalletCards className="h-4 w-4" />
                  Fast onboarding
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                  Start with confidence. Go live without operational guesswork.
                </p>
                <p className="mt-1 text-xs leading-6 text-primary-700 dark:text-primary-100/90">
                  Clear setup flow, guided defaults, and resilient infrastructure from day one.
                </p>
              </m.div>
            </m.div>
          </div>
        </aside>
      </div>
    </div>
  );
}
