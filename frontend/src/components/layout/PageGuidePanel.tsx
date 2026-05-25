import { Link } from '@tanstack/react-router';
import { BookOpenText, ChevronDown, ChevronUp, Lightbulb, ListChecks } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { cn } from '../../lib/cn';

interface PageGuide {
  title: string;
  summary: string;
  steps: string[];
  bestPractices: string[];
}

const DEFAULT_GUIDE: PageGuide = {
  title: 'Operational Workspace',
  summary:
    'Use this workspace to run day-to-day operations with clear ownership, reliable records, and actionable insights.',
  steps: [
    'Validate your role permissions before starting a sensitive workflow.',
    'Complete transactions using standardized naming and structured notes.',
    'Review dashboards and reports to confirm process quality.',
  ],
  bestPractices: [
    'Keep product, customer, and invoice data consistent across teams.',
    'Treat reports as a weekly operating ritual, not a month-end task.',
  ],
};

function resolveGuide(pathname: string): PageGuide {
  if (pathname.startsWith('/dashboard')) {
    return {
      title: 'Executive Dashboard',
      summary:
        'Track your current business pulse, identify risk early, and align the team around priority metrics.',
      steps: [
        'Review period KPIs and compare with previous performance.',
        'Check low-stock and overdue invoice indicators for immediate actions.',
        'Use trend sections to validate whether current decisions are working.',
      ],
      bestPractices: [
        'Run a weekly 15-minute KPI review with operations and finance leads.',
        'Capture follow-up actions directly from dashboard findings.',
      ],
    };
  }

  if (pathname.startsWith('/inventory')) {
    return {
      title: 'Inventory Management',
      summary:
        'Maintain stock accuracy, pricing discipline, and reorder readiness across your catalog and branches.',
      steps: [
        'Keep SKU, barcode, and category fields standardized for search reliability.',
        'Set realistic low-stock thresholds for high-velocity products.',
        'Review stock adjustments with reasons to preserve audit clarity.',
      ],
      bestPractices: [
        'Use weekly cycle counts for top-selling products.',
        'Avoid manual inventory edits without reason notes.',
      ],
    };
  }

  if (pathname.startsWith('/purchase-orders')) {
    return {
      title: 'Purchase Orders',
      summary:
        'Plan supplier purchases with clear quantity rationale and track fulfillment status to avoid stock disruption.',
      steps: [
        'Create orders from low-stock and forecast signals.',
        'Confirm supplier terms and expected delivery dates before approval.',
        'Mark receipts immediately when inventory lands.',
      ],
      bestPractices: [
        'Tie purchase decisions to documented demand signals.',
        'Keep supplier communication details in notes for handover continuity.',
      ],
    };
  }

  if (pathname.startsWith('/invoices')) {
    return {
      title: 'Invoicing Workflows',
      summary:
        'Manage receivables with consistent invoice creation, payment tracking, and follow-up execution.',
      steps: [
        'Use clear line-item descriptions and due dates.',
        'Send invoices promptly and monitor overdue status daily.',
        'Capture payment updates immediately to keep customer balances accurate.',
      ],
      bestPractices: [
        'Run a weekly overdue review and assign collection owners.',
        'Use invoice notes for payment terms and reference context.',
      ],
    };
  }

  if (pathname.startsWith('/pos')) {
    return {
      title: 'Point of Sale',
      summary:
        'Complete transactions quickly while preserving clean revenue, stock, and payment records.',
      steps: [
        'Verify product and quantity before charging customers.',
        'Select the correct payment method for accurate reporting.',
        'Confirm amount received and change before completing sale.',
      ],
      bestPractices: [
        'Train cashiers on discount and refund policy boundaries.',
        'Monitor unusual quantity overrides as part of shift reviews.',
      ],
    };
  }

  if (pathname.startsWith('/sales')) {
    return {
      title: 'Sales History',
      summary:
        'Use historical sales data to validate performance trends, staff productivity, and product demand patterns.',
      steps: [
        'Filter by period, cashier, and payment method for focused analysis.',
        'Investigate unusual transaction spikes or dips quickly.',
        'Use sales history to support forecasting and restock decisions.',
      ],
      bestPractices: [
        'Compare weekly sales trends against inventory turnover.',
        'Document anomalies with clear context for finance reviews.',
      ],
    };
  }

  if (pathname.startsWith('/customers')) {
    return {
      title: 'Customer Management',
      summary:
        'Build stronger customer visibility with accurate profiles, purchase history, and receivable context.',
      steps: [
        'Capture complete customer contact information where available.',
        'Track outstanding balances and recent interaction context.',
        'Use customer history to prioritize follow-up and retention actions.',
      ],
      bestPractices: [
        'Use consistent naming conventions to reduce duplicate profiles.',
        'Review high-value accounts and overdue balances weekly.',
      ],
    };
  }

  if (pathname.startsWith('/expenses')) {
    return {
      title: 'Expense Tracking',
      summary:
        'Categorize costs accurately so profitability, margin analysis, and planning remain reliable.',
      steps: [
        'Log expenses with clear category and date information.',
        'Use notes for unusual or one-time costs.',
        'Review category distribution before month-end reporting.',
      ],
      bestPractices: [
        'Avoid uncategorized spending wherever possible.',
        'Align category naming with your accounting process.',
      ],
    };
  }

  if (pathname.startsWith('/reports')) {
    return {
      title: 'Reporting and Analytics',
      summary:
        'Translate operational data into decisions using revenue, margin, inventory, and customer performance views.',
      steps: [
        'Set an analysis period and review each report tab in sequence.',
        'Compare revenue and P&L before making growth decisions.',
        'Use top-product and customer insights to adjust priorities.',
      ],
      bestPractices: [
        'Run monthly management reviews using a fixed report cadence.',
        'Capture decisions and owners directly from report findings.',
      ],
    };
  }

  if (pathname.startsWith('/help')) {
    return {
      title: 'Help Center and Playbooks',
      summary:
        'Use this help center to train new team members, standardize execution routines, and accelerate daily operations.',
      steps: [
        'Search by module or keyword to find the right workflow playbook.',
        'Open quick actions from each topic to execute tasks immediately.',
        'Review walkthrough snapshots with your team during onboarding and shift handovers.',
      ],
      bestPractices: [
        'Update operational SOPs based on insights discovered in weekly reviews.',
        'Use the same playbooks across branches to keep execution consistent.',
      ],
    };
  }

  if (pathname.startsWith('/ai')) {
    return {
      title: 'AI Insights',
      summary:
        'Generate structured recommendations for forecasting, restocking, and anomaly review based on current business activity.',
      steps: [
        'Choose the AI mode that matches your immediate decision need.',
        'Review generated output and validate against dashboard metrics.',
        'Convert insights into concrete tasks with owners and deadlines.',
      ],
      bestPractices: [
        'Treat AI output as decision support, not an automatic decision.',
        'Record actions taken so you can evaluate insight quality over time.',
      ],
    };
  }

  if (pathname.startsWith('/settings/')) {
    return {
      title: 'Settings and Governance',
      summary:
        'Configure profile, team, billing, webhooks, and security controls to keep your workspace stable and compliant.',
      steps: [
        'Update business and profile settings before inviting new users.',
        'Use role-based access for least-privilege account control.',
        'Review API keys, audit logs, and billing status regularly.',
      ],
      bestPractices: [
        'Rotate credentials and API keys on a fixed schedule.',
        'Use audit history during incident and change reviews.',
      ],
    };
  }

  return DEFAULT_GUIDE;
}

interface PageGuidePanelProps {
  pathname: string;
}

const GUIDE_PANEL_STORAGE_KEY = 'bizzw-guide-panel-open';

function readGuideOpenState(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(GUIDE_PANEL_STORAGE_KEY) === 'true';
}

export function PageGuidePanel({ pathname }: PageGuidePanelProps) {
  const guide = useMemo(() => resolveGuide(pathname), [pathname]);
  const [isOpen, setIsOpen] = useState<boolean>(readGuideOpenState);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(GUIDE_PANEL_STORAGE_KEY, String(isOpen));
  }, [isOpen]);

  return (
    <section className="border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl rounded-xl border border-primary-100 bg-primary-50/60 p-4 dark:border-primary-900/40 dark:bg-primary-950/20">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary-800 dark:border-primary-800 dark:bg-slate-900 dark:text-primary-300">
              <BookOpenText className="h-3.5 w-3.5" /> In-app guide
            </p>
            <h2 className="mt-2 text-base font-black text-slate-900 dark:text-slate-100">
              {guide.title}
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              {guide.summary}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen((current) => !current)}
            aria-expanded={isOpen}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {isOpen ? 'Hide details' : 'Open guide'}
            {isOpen ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        <div
          className={cn(
            'grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out',
            isOpen ? 'mt-4 grid-rows-[1fr] opacity-100' : 'mt-2 grid-rows-[0fr] opacity-0'
          )}
        >
          <div className={cn('overflow-hidden', !isOpen && 'pointer-events-none')}>
            <div className="grid gap-3 lg:grid-cols-2">
              <article className="rounded-lg border border-primary-100 bg-white p-3 dark:border-primary-900/40 dark:bg-slate-900">
                <h3 className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary-800 dark:text-primary-300">
                  <ListChecks className="h-3.5 w-3.5" /> Recommended steps
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {guide.steps.map((step) => (
                    <li
                      key={step}
                      className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"
                    >
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-700" />
                      {step}
                    </li>
                  ))}
                </ul>
              </article>

              <article className="rounded-lg border border-primary-100 bg-white p-3 dark:border-primary-900/40 dark:bg-slate-900">
                <h3 className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary-800 dark:text-primary-300">
                  <Lightbulb className="h-3.5 w-3.5" /> Best practices
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {guide.bestPractices.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"
                    >
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-700" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    to="/help"
                    className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    Open dashboard help center
                  </Link>
                  <a
                    href="/faq?section=user-guide"
                    className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    Open public user guide
                  </a>
                </div>
              </article>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
