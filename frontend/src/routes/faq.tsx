import { ChevronDown, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  exitMotionTransition,
  fadeUp,
  fastMotionTransition,
  getSurfaceMotionProfile,
  m,
  staggerContainer,
} from '../components/motion/AppMotion';

import { createFileRoute } from '@tanstack/react-router';
import { AnimatePresence } from 'framer-motion';
import { MarketingShell } from '../components/marketing/MarketingShell';
import { cn } from '../lib/cn';

type FAQSearch = {
  section?: string;
};

export const Route = createFileRoute('/faq')({
  validateSearch: (search: Record<string, unknown>): FAQSearch => ({
    section: typeof search.section === 'string' ? search.section : undefined,
  }),
  component: FAQPage,
});

type FAQCategory = 'platform' | 'billing' | 'security' | 'integrations' | 'support';

interface FAQItem {
  id: string;
  category: FAQCategory;
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    id: 'p1',
    category: 'platform',
    question: 'Can BizZW support multi-branch operations?',
    answer:
      'Yes. BizZW supports branch-level operations, inventory visibility, and role-based access so teams can operate independently while leadership retains centralized oversight.',
  },
  {
    id: 'p2',
    category: 'platform',
    question: 'Does BizZW support offline workflows?',
    answer:
      'Core create actions can be queued while offline and automatically synchronized when connectivity returns. This keeps operations moving even during unstable network conditions.',
  },
  {
    id: 'b1',
    category: 'billing',
    question: 'How are subscriptions billed?',
    answer:
      'Plans are billed on a recurring cycle based on your selected tier. You can upgrade anytime, and changes are reflected in your next billing cycle unless otherwise stated.',
  },
  {
    id: 'b2',
    category: 'billing',
    question: 'Can we start with a trial before paying?',
    answer:
      'Yes. New organizations can start on a trial plan and evaluate features before committing to a paid tier.',
  },
  {
    id: 's1',
    category: 'security',
    question: 'How is customer data protected?',
    answer:
      'BizZW uses tenant-isolated data models, secure authentication, request controls, and operational monitoring. Sensitive flows are protected with enterprise-oriented security practices.',
  },
  {
    id: 's2',
    category: 'security',
    question: 'Do you provide incident monitoring and reliability telemetry?',
    answer:
      'Yes. The platform includes system health telemetry, queue monitoring, and operational status indicators designed for production reliability and rapid issue detection.',
  },
  {
    id: 'i1',
    category: 'integrations',
    question: 'Can we integrate with third-party systems?',
    answer:
      'Yes. API access is available on higher plans and can be used for ERP, accounting, and custom workflow integrations.',
  },
  {
    id: 'i2',
    category: 'integrations',
    question: 'Do emails and notifications support brand consistency?',
    answer:
      'Yes. BizZW uses structured and branded email templates for key workflows including onboarding, password reset, and operational notifications.',
  },
  {
    id: 'sp1',
    category: 'support',
    question: 'How quickly can we expect support responses?',
    answer:
      'Support requests are typically acknowledged within one business day. Priority response windows are available for qualifying plans.',
  },
  {
    id: 'sp2',
    category: 'support',
    question: 'How do we contact the team for enterprise discussions?',
    answer:
      'Use the contact page and choose Sales or Partnership. Include your use case, scale targets, and integration requirements for a faster technical response.',
  },
];

const CATEGORY_LABELS: Record<FAQCategory, string> = {
  platform: 'Platform',
  billing: 'Billing',
  security: 'Security',
  integrations: 'Integrations',
  support: 'Support',
};

const USER_GUIDE_STEPS = [
  {
    title: '1. Set up your organization profile',
    detail:
      'Complete business settings, currency, and branch structure first. This ensures reports and financial workflows use accurate defaults from day one.',
    example:
      'Example: Configure branches for Harare and Bulawayo before adding branch-specific users.',
  },
  {
    title: '2. Add inventory and pricing data',
    detail:
      'Create products with SKU, cost, sell price, and stock thresholds. This enables cleaner POS transactions and trustworthy margin analytics.',
    example:
      'Example: Set low-stock threshold for top sellers so purchasing teams receive alerts before stockouts.',
  },
  {
    title: '3. Run sales and invoicing workflows',
    detail:
      'Use POS for immediate checkout and invoices for receivables. Keep payment methods and customer assignments consistent for reliable reporting.',
    example:
      'Example: Use invoice notes for payment instructions and follow up overdue balances through customer history.',
  },
  {
    title: '4. Review dashboard and reports weekly',
    detail:
      'Track monthly revenue, expenses, low-stock products, and overdue invoices. Use the same cadence for leadership and operations meetings.',
    example:
      'Example: Compare top products and gross margin trend before planning promotions or reorder volume.',
  },
  {
    title: '5. Improve with AI and team controls',
    detail:
      'Use AI recommendations to identify demand patterns, then assign role-appropriate access to maintain process quality and accountability.',
    example:
      'Example: Restrict sensitive settings to admins while cashiers operate POS-only flows.',
  },
];

const BEST_PRACTICES = [
  'Maintain standardized product naming and SKU conventions across branches.',
  'Review low-stock and overdue invoice metrics at least once per week.',
  'Use role-based access to reduce accidental changes in critical modules.',
  'Document operational policies in your team onboarding checklist.',
  'Use audit and reporting views to validate process adherence monthly.',
];

function FAQPage() {
  const { section } = Route.useSearch();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<FAQCategory | 'all'>('all');
  const [openItemId, setOpenItemId] = useState<string | null>(FAQ_ITEMS[0]?.id || null);
  const marketingMotion = getSurfaceMotionProfile('marketing');

  useEffect(() => {
    if (typeof window === 'undefined' || !section) {
      return;
    }

    const target = document.getElementById(section);
    if (!target) {
      return;
    }

    const raf = window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    return () => window.cancelAnimationFrame(raf);
  }, [section]);

  const filteredItems = useMemo(() => {
    return FAQ_ITEMS.filter((item) => {
      const categoryMatch = category === 'all' || item.category === category;
      const searchTarget = `${item.question} ${item.answer}`.toLowerCase();
      const queryMatch = !query || searchTarget.includes(query.toLowerCase());
      return categoryMatch && queryMatch;
    });
  }, [category, query]);

  return (
    <MarketingShell
      title="Frequently Asked Questions"
      subtitle="Search by keyword and filter by category to quickly find practical answers."
    >
      <m.section
        className="mx-auto max-w-6xl px-6 py-16"
        initial="hidden"
        animate="visible"
        variants={staggerContainer(0.07)}
      >
        <m.section
          id="user-guide"
          className="mb-6 rounded-2xl border border-primary-200 bg-primary-50 p-6 shadow-sm scroll-mt-28"
          variants={fadeUp(10, 0, marketingMotion.enter)}
        >
          <h2 className="text-2xl font-black text-slate-900">User Guide and Best Practices</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            This guided sequence helps new teams adopt BizZW quickly and helps experienced teams run
            cleaner, more predictable workflows.
          </p>

          <m.div className="mt-5 grid gap-4 md:grid-cols-2" variants={staggerContainer(0.06, 0.06)}>
            {USER_GUIDE_STEPS.map((step) => (
              <m.article
                key={step.title}
                className="rounded-xl border border-primary-100 bg-white p-4"
                variants={fadeUp(8, 0, marketingMotion.enter)}
              >
                <h3 className="text-sm font-black text-slate-900 md:text-base">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.detail}</p>
                <p className="mt-2 text-xs font-semibold text-primary-800">{step.example}</p>
              </m.article>
            ))}
          </m.div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-black text-slate-900 md:text-base">
              Recommended operating cadence
            </h3>
            <ul className="mt-3 space-y-2">
              {BEST_PRACTICES.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-700" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </m.section>

        <m.div
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          variants={fadeUp(10, 0, marketingMotion.enter)}
        >
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search questions or answers"
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition-colors focus:border-primary-400"
              />
            </label>

            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as FAQCategory | 'all')}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-primary-400"
            >
              <option value="all">All categories</option>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={() => setCategory('all')}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                category === 'all'
                  ? 'border-primary-200 bg-primary-50 text-primary-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              )}
            >
              All
            </button>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
              const typedKey = key as FAQCategory;
              return (
                <button
                  key={key}
                  onClick={() => setCategory(typedKey)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                    category === typedKey
                      ? 'border-primary-200 bg-primary-50 text-primary-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </m.div>

        <m.div className="mt-6 space-y-3" variants={staggerContainer(0.05, 0.05)}>
          {filteredItems.map((item) => {
            const open = openItemId === item.id;
            return (
              <m.article
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white shadow-sm"
                variants={fadeUp(8, 0, marketingMotion.enter)}
              >
                <button
                  onClick={() => setOpenItemId((current) => (current === item.id ? null : item.id))}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
                      {CATEGORY_LABELS[item.category]}
                    </p>
                    <h3 className="mt-1 text-sm font-bold text-slate-900 md:text-base">
                      {item.question}
                    </h3>
                  </div>
                  <m.span animate={{ rotate: open ? 180 : 0 }} transition={fastMotionTransition}>
                    <ChevronDown className={cn('h-4 w-4 text-slate-400')} />
                  </m.span>
                </button>
                <AnimatePresence initial={false} mode="wait">
                  {open && (
                    <m.div
                      className="overflow-hidden"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={fastMotionTransition}
                    >
                      <m.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={exitMotionTransition}
                        className="border-t border-slate-100 px-5 py-4 text-sm leading-7 text-slate-600"
                      >
                        {item.answer}
                      </m.p>
                    </m.div>
                  )}
                </AnimatePresence>
              </m.article>
            );
          })}

          {filteredItems.length === 0 && (
            <m.div
              className="rounded-2xl border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500 shadow-sm"
              variants={fadeUp(6, 0, marketingMotion.enter)}
            >
              No FAQ entries match your current filters.
            </m.div>
          )}
        </m.div>
      </m.section>
    </MarketingShell>
  );
}
