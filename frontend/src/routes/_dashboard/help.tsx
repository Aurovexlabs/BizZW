import { createFileRoute, Link } from '@tanstack/react-router';
import { BookOpenText, CircleHelp, ExternalLink, Search, Sparkles, Workflow } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge, Button, Card, Input } from '../../components/ui';

export const Route = createFileRoute('/_dashboard/help')({
  component: DashboardHelpPage,
});

type HelpTopic = {
  id: string;
  module: 'Inventory' | 'Invoices' | 'POS' | 'Reports';
  title: string;
  summary: string;
  steps: string[];
  quickActions: { label: string; to: string }[];
  keywords: string[];
  snapshot: {
    title: string;
    description: string;
  };
};

const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'inventory-control-loop',
    module: 'Inventory',
    title: 'Daily Inventory Control Loop',
    summary:
      'Use a fixed routine to prevent stockouts, remove stale SKUs, and keep pricing aligned with current margin targets.',
    steps: [
      'Filter low-stock items and export a list for the operations lead.',
      'Review top movers and verify low-stock thresholds for each fast-selling SKU.',
      'Create purchase orders directly from critical items and assign expected delivery dates.',
      'Run an end-of-day recount for high-risk SKUs and document adjustments.',
    ],
    quickActions: [
      { label: 'Open Inventory', to: '/inventory' },
      { label: 'Add Product', to: '/inventory/new' },
      { label: 'Create Purchase Order', to: '/purchase-orders' },
      { label: 'View Reports', to: '/reports' },
    ],
    keywords: ['stock', 'sku', 'restock', 'purchase order', 'threshold', 'recount'],
    snapshot: {
      title: 'Low-stock triage board',
      description:
        'A focused board showing risk-ranked SKUs, reorder quantity, and next delivery date.',
    },
  },
  {
    id: 'invoice-collections-rhythm',
    module: 'Invoices',
    title: 'Weekly Receivables and Collections Rhythm',
    summary:
      'Keep cash flow predictable by reviewing due invoices, triggering reminders, and escalating overdue balances quickly.',
    steps: [
      'Filter invoices by SENT, PARTIALLY_PAID, and OVERDUE statuses.',
      'Send reminders with clear due amounts and payment instructions.',
      'Mark payments the same day they are received to keep balances accurate.',
      'Escalate accounts older than your policy threshold to the account owner.',
    ],
    quickActions: [
      { label: 'Open Invoices', to: '/invoices' },
      { label: 'Create Invoice', to: '/invoices/new' },
      { label: 'Open Customers', to: '/customers' },
      { label: 'Review Sales', to: '/sales' },
    ],
    keywords: ['receivables', 'cash flow', 'overdue', 'collections', 'reminder'],
    snapshot: {
      title: 'Receivables tracker',
      description: 'A timeline view of due dates, payment progress, and owner assignments.',
    },
  },
  {
    id: 'checkout-quality-routine',
    module: 'POS',
    title: 'Checkout Quality and Shift Close Routine',
    summary:
      'Run fast checkouts while protecting margin by verifying discounts, payment methods, and cashier consistency.',
    steps: [
      'Search or scan products, then validate quantities before charging the customer.',
      'Attach customer profiles for repeat buyers to preserve purchase history.',
      'Confirm amount received and change amount with customer before completion.',
      'At shift close, review voids, discounts, and unusual quantity edits.',
    ],
    quickActions: [
      { label: 'Open POS', to: '/pos' },
      { label: 'Sales History', to: '/sales' },
      { label: 'Customer Directory', to: '/customers' },
      { label: 'Open Reports', to: '/reports' },
    ],
    keywords: ['cashier', 'checkout', 'discount', 'change', 'shift close'],
    snapshot: {
      title: 'Cashier shift summary',
      description: 'A shift board with completed tickets, discount usage, and exception flags.',
    },
  },
  {
    id: 'management-review-cadence',
    module: 'Reports',
    title: 'Monthly Management Review Cadence',
    summary:
      'Turn report tabs into decisions by reviewing revenue, margin pressure, inventory risk, and customer value in sequence.',
    steps: [
      'Set your date range and compare total revenue against the previous period.',
      'Review P and L margin trends and identify top expense categories to optimize.',
      'Check inventory value mix and category-level profit exposure.',
      'Use customer value and top-product data to define next-month priorities.',
    ],
    quickActions: [
      { label: 'Open Reports', to: '/reports' },
      { label: 'Open Dashboard', to: '/dashboard' },
      { label: 'Review Inventory', to: '/inventory' },
      { label: 'Review Invoices', to: '/invoices' },
    ],
    keywords: ['kpi', 'profit', 'margin', 'revenue', 'decision', 'review'],
    snapshot: {
      title: 'Decision review board',
      description: 'A monthly board that links each metric trend to an owner and action item.',
    },
  },
];

function DashboardHelpPage() {
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState<'All' | HelpTopic['module']>('All');

  const moduleOptions = useMemo(() => {
    return ['All', ...new Set(HELP_TOPICS.map((topic) => topic.module))] as const;
  }, []);

  const filteredTopics = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return HELP_TOPICS.filter((topic) => {
      const moduleMatch = moduleFilter === 'All' || topic.module === moduleFilter;
      if (!moduleMatch) return false;

      if (!normalizedSearch) return true;

      const searchable = [
        topic.title,
        topic.module,
        topic.summary,
        ...topic.steps,
        ...topic.keywords,
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(normalizedSearch);
    });
  }, [moduleFilter, search]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 text-slate-900 dark:text-slate-100">
      <header className="rounded-2xl border border-primary-100 bg-linear-to-r from-primary-50 via-white to-accent-50 p-6 dark:border-primary-500/40 dark:from-primary-900/45 dark:via-slate-900 dark:to-accent-900/35">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary-800 dark:border-primary-500/55 dark:bg-slate-900/80 dark:text-primary-200">
              <BookOpenText className="h-3.5 w-3.5" /> In-dashboard Help Center
            </p>
            <h1 className="mt-3 text-2xl font-black text-slate-900 dark:text-slate-100">
              Operational playbooks and walkthroughs
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Search proven workflows for inventory, invoicing, point of sale, and executive
              reporting. Use these playbooks during onboarding and weekly execution reviews.
            </p>
          </div>

          <a
            href="/faq?section=user-guide"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Public user guide <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <Input
            placeholder="Search playbooks, workflows, or keywords..."
            leftIcon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <div className="flex flex-wrap items-center gap-2">
            {moduleOptions.map((option) => {
              const active = moduleFilter === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setModuleFilter(option)}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
                    active
                      ? 'border-primary-300 bg-primary-100 text-primary-800 dark:border-primary-500/55 dark:bg-primary-500/15 dark:text-primary-200'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <span>{filteredTopics.length} playbooks found</span>
        <span>Filter: {moduleFilter}</span>
      </div>

      {filteredTopics.length === 0 && (
        <Card className="border-dashed border-slate-300 text-center">
          <CircleHelp className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
          <h2 className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
            No playbooks match that search
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Try a broader keyword or change the module filter.
          </p>
        </Card>
      )}

      <div className="space-y-5">
        {filteredTopics.map((topic) => (
          <Card key={topic.id} className="border-slate-200 dark:border-slate-700">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-300">
                  {topic.module}
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
                  {topic.title}
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{topic.summary}</p>
              </div>
              <Badge variant="info">Execution Guide</Badge>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <article className="rounded-xl border border-primary-100 bg-primary-50/40 p-4 dark:border-primary-500/35 dark:bg-primary-500/12">
                <h3 className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary-800 dark:text-primary-200">
                  <Workflow className="h-3.5 w-3.5" /> Example workflow
                </h3>
                <ol className="mt-3 space-y-2">
                  {topic.steps.map((step, index) => (
                    <li
                      key={step}
                      className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"
                    >
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold text-primary-700 dark:bg-slate-900 dark:text-primary-200">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <h3 className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                  <Sparkles className="h-3.5 w-3.5" /> Quick actions
                </h3>
                <div className="mt-3 space-y-2">
                  {topic.quickActions.map((action) => (
                    <Link key={action.label} to={action.to} className="block">
                      <Button variant="outline" size="sm" className="w-full justify-between">
                        {action.label}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  ))}
                </div>
              </article>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/80">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                Walkthrough snapshot
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {topic.snapshot.title}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {topic.snapshot.description}
              </p>

              <div className="mt-3 rounded-lg border border-slate-200 bg-linear-to-br from-slate-100 via-white to-primary-50 p-3 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-primary-900/35">
                <div className="grid grid-cols-6 gap-2">
                  <div className="col-span-6 h-2 rounded bg-slate-300/80" />
                  <div className="col-span-2 h-16 rounded border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900" />
                  <div className="col-span-4 h-16 rounded border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900" />
                  <div className="col-span-3 h-8 rounded border border-slate-200 bg-white/90 dark:border-slate-700 dark:bg-slate-900/90" />
                  <div className="col-span-3 h-8 rounded border border-slate-200 bg-white/90 dark:border-slate-700 dark:bg-slate-900/90" />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
