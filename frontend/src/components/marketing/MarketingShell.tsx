import { useReducedMotion } from 'framer-motion';
import React from 'react';
import { m, staggerContainer, surfaceRevealVariants } from '../motion/AppMotion';
import { MarketingFooter } from './MarketingFooter';
import { MarketingHeader } from './MarketingHeader';

interface MarketingShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function MarketingShell({ title, subtitle, children }: MarketingShellProps) {
  const shouldReduceMotion = useReducedMotion() ?? false;

  return (
    <m.div
      className="min-h-screen bg-slate-50/40 text-slate-900 dark:bg-slate-950 dark:text-slate-100"
      initial="hidden"
      animate="visible"
      variants={staggerContainer(0.08)}
    >
      <MarketingHeader />

      <main>
        <m.section
          className="relative overflow-hidden border-b border-slate-200/80 bg-white px-6 py-16 dark:border-slate-800 dark:bg-slate-900"
          variants={surfaceRevealVariants(shouldReduceMotion, 12, 'marketing')}
        >
          <div className="marketing-hero-glow pointer-events-none absolute inset-0" />
          <m.div
            className="relative mx-auto max-w-5xl text-center"
            variants={surfaceRevealVariants(shouldReduceMotion, 8, 'marketing')}
          >
            <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-slate-100 md:text-5xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mx-auto mt-4 max-w-3xl text-base text-slate-600 dark:text-slate-300 md:text-lg">
                {subtitle}
              </p>
            )}
          </m.div>
        </m.section>

        <m.div variants={surfaceRevealVariants(shouldReduceMotion, 8, 'marketing')}>
          {children}
        </m.div>
      </main>

      <MarketingFooter />
    </m.div>
  );
}
