import { Link, createFileRoute } from '@tanstack/react-router';
import {
  ArrowRight,
  BarChart3,
  BookOpenText,
  Brain,
  CheckCircle,
  CircleGauge,
  FileText,
  Handshake,
  Package,
  ShieldCheck,
  ShoppingCart,
  UserCheck,
  Users,
  Workflow,
} from 'lucide-react';
import { fadeUp, m, staggerContainer } from '../components/motion/AppMotion';

import { useEffect } from 'react';
import { MarketingFooter } from '../components/marketing/MarketingFooter';
import { MarketingHeader } from '../components/marketing/MarketingHeader';

type LandingSearch = {
  section?: string;
};

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): LandingSearch => ({
    section: typeof search.section === 'string' ? search.section : undefined,
  }),
  component: LandingPage,
});

const FEATURES = [
  {
    icon: Package,
    title: 'Inventory Intelligence',
    desc: 'Track stock in real time, automate low-stock alerts, and keep branch-level visibility without spreadsheet drift.',
    highlights: ['Live stock tracking', 'Barcode and SKU search', 'Low-stock thresholds'],
  },
  {
    icon: FileText,
    title: 'Invoice Lifecycle Control',
    desc: 'Create, send, and track invoices with payment status, branded PDFs, and clear customer follow-up trails.',
    highlights: ['Auto numbering', 'PDF and email workflow', 'Overdue tracking'],
  },
  {
    icon: ShoppingCart,
    title: 'High-Speed POS',
    desc: 'Complete sales quickly with reliable checkout flows across cash and digital payment methods.',
    highlights: ['Cash and card support', 'EcoCash and Paynow', 'Receipt records'],
  },
  {
    icon: Users,
    title: 'Customer Relationship Insights',
    desc: 'Understand customer behavior and outstanding balances so your team can make faster commercial decisions.',
    highlights: ['Customer history', 'Balance visibility', 'LTV-friendly records'],
  },
  {
    icon: BarChart3,
    title: 'Executive Reporting',
    desc: 'Use dashboards and operational reports to monitor revenue, margins, tax position, and execution quality.',
    highlights: ['Revenue and P&L', 'Top product analysis', 'Dashboard KPIs'],
  },
  {
    icon: Brain,
    title: 'AI Decision Support',
    desc: 'Generate practical recommendations for restocking, demand planning, and anomaly review.',
    highlights: ['Trend-aware suggestions', 'Restock guidance', 'Operational prompts'],
  },
];

const TRUST_PILLARS = [
  'Tenant-isolated architecture',
  'Operational telemetry and status monitoring',
  'Offline-safe queue with synchronization',
  'Branded customer communication workflows',
];

const HOW_IT_WORKS = [
  {
    icon: Handshake,
    title: '1. Onboard your workspace',
    description:
      'Create your organization, set up users and branches, and configure business settings in one guided flow.',
  },
  {
    icon: Workflow,
    title: '2. Run daily operations',
    description:
      'Use inventory, invoicing, POS, and customer modules as your central source of operational truth.',
  },
  {
    icon: CircleGauge,
    title: '3. Monitor performance',
    description:
      'Track KPIs and financial signals through dashboards and reports designed for quick action.',
  },
  {
    icon: UserCheck,
    title: '4. Improve continuously',
    description:
      'Apply AI recommendations, optimize workflows, and align teams with clear roles and accountability.',
  },
];

const BENEFITS = [
  {
    metric: 'Faster Decision Cycles',
    detail:
      'Leaders and operators can move from data gathering to action faster because insights are available in one platform.',
  },
  {
    metric: 'Reduced Operational Risk',
    detail:
      'Built-in controls, permissions, and monitoring reduce manual errors and improve process reliability.',
  },
  {
    metric: 'Higher Team Productivity',
    detail:
      'Unified workflows reduce app switching and duplicated work so teams can execute with focus.',
  },
];

const PLANS = [
  {
    name: 'Starter',
    price: 0,
    users: 2,
    products: 50,
    features: ['Inventory & POS', 'Basic invoicing', 'Customer management', '1 Branch'],
  },
  {
    name: 'Growth',
    price: 9,
    users: 10,
    products: 500,
    features: [
      'Everything in Starter',
      'AI Insights',
      'Advanced reports',
      'Email invoices',
      '2 Branches',
    ],
    popular: true,
  },
  {
    name: 'Pro',
    price: 19,
    users: 50,
    products: 5000,
    features: [
      'Everything in Growth',
      'API access',
      'Tax summaries',
      'Priority support',
      '5 Branches',
    ],
  },
  {
    name: 'Enterprise',
    price: 49,
    users: -1,
    products: -1,
    features: [
      'Everything in Pro',
      'Unlimited users & products',
      'Unlimited branches',
      'Custom integrations',
      'Dedicated support',
    ],
  },
];

function LandingPage() {
  const { section } = Route.useSearch();

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

  function scrollToSection(sectionId: string) {
    const target = document.getElementById(sectionId);
    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <MarketingHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-white px-6 pb-24 pt-20 dark:bg-slate-950">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary-50 via-white to-accent-50 dark:from-primary-950/35 dark:via-slate-950 dark:to-accent-950/25" />
        <div className="pointer-events-none absolute top-20 right-0 h-96 w-96 rounded-full bg-primary-100 opacity-30 blur-3xl dark:bg-primary-700/30" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-accent-100 opacity-30 blur-3xl dark:bg-accent-700/30" />

        <m.div
          className="relative max-w-5xl mx-auto text-center"
          initial="hidden"
          animate="visible"
          variants={fadeUp(20)}
        >
          <h1 className="mb-6 text-5xl font-black leading-[1.05] tracking-tight text-slate-900 dark:text-slate-100 md:text-7xl">
            Build a complete,
            <br />
            <span className="bg-linear-to-r from-primary-800 to-accent-700 bg-clip-text text-transparent dark:from-primary-200 dark:to-accent-200">
              high-performance operating system
            </span>
            <br />
            for your business.
          </h1>
          <p className="mx-auto mb-10 max-w-3xl text-xl leading-relaxed text-slate-600 dark:text-slate-300">
            BizZW helps teams run inventory, sales, invoicing, customer management, and reporting in
            one connected platform designed for clarity, speed, and reliability.
          </p>

          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            {[
              'Centralized business workflows',
              'Role-based access and accountability',
              'Operational insights your team can act on',
            ].map((item) => (
              <div
                key={item}
                className="rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200"
              >
                {item}
              </div>
            ))}
          </div>

          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-primary-800 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-primary-700 transition-all hover:shadow-lg hover:shadow-primary-200 active:scale-[0.98]"
            >
              Start for free <ArrowRight className="w-5 h-5" />
            </Link>
            <button
              type="button"
              onClick={() => scrollToSection('how-it-works')}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-8 py-4 text-lg font-bold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
            >
              See how it works
            </button>
          </div>
          <p className="mt-6 text-sm text-slate-400 dark:text-slate-500">
            No credit card required · Guided onboarding · Starter plan available
          </p>

          <div className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST_PILLARS.map((pillar) => (
              <div
                key={pillar}
                className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-200"
              >
                {pillar}
              </div>
            ))}
          </div>
        </m.div>

        {/* Dashboard preview */}
        <m.div
          className="relative max-w-5xl mx-auto mt-20"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          variants={fadeUp(20, 0.08)}
        >
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center gap-2 bg-slate-100 px-4 py-3 dark:bg-slate-900">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <div className="flex-1 mx-4">
                <div className="rounded-md bg-slate-200 px-3 py-1 text-center text-xs text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                  app.bizzw.co.zw/dashboard
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4 bg-slate-50 p-6 dark:bg-slate-950">
              {[
                {
                  label: 'Monthly Revenue',
                  value: 'USD 14,280',
                  change: '+12.4%',
                  color: 'text-emerald-600 dark:text-emerald-300',
                },
                {
                  label: 'Total Sales',
                  value: '284 sales',
                  change: '+8.1%',
                  color: 'text-emerald-600 dark:text-emerald-300',
                },
                {
                  label: 'Overdue Invoices',
                  value: '3 invoices',
                  change: 'USD 1,450',
                  color: 'text-rose-600 dark:text-rose-300',
                },
                {
                  label: 'Low Stock',
                  value: '7 products',
                  change: 'Needs attention',
                  color: 'text-amber-600 dark:text-amber-300',
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
                  <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
                    {s.value}
                  </p>
                  <p className={`text-xs font-medium mt-1 ${s.color}`}>{s.change}</p>
                </div>
              ))}
            </div>
          </div>
        </m.div>
      </section>

      {/* Logos / social proof */}
      <m.section
        className="border-y border-slate-100 py-12 dark:border-slate-800 dark:bg-slate-950"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={fadeUp(16)}
      >
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="mb-6 text-sm text-slate-400 dark:text-slate-500">
            TRUSTED BY OPERATIONS-INTENSIVE TEAMS
          </p>
          <div className="flex flex-wrap justify-center gap-8 items-center opacity-40">
            {[
              'Retail',
              'Wholesale',
              'Distribution',
              'Manufacturing',
              'Restaurants',
              'E-commerce',
            ].map((b) => (
              <span key={b} className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                {b}
              </span>
            ))}
          </div>
        </div>
      </m.section>

      <m.section
        id="how-it-works"
        className="bg-white px-6 py-24 dark:bg-slate-950"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={fadeUp(20)}
      >
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-4xl font-black text-slate-900 dark:text-slate-100">
              How BizZW Works
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-lg text-slate-600 dark:text-slate-300">
              The platform is built around a practical execution loop: set up quickly, run core
              workflows, monitor results, and improve continuously.
            </p>
          </div>

          <m.div className="mt-10 grid gap-5 md:grid-cols-2" variants={staggerContainer(0.08, 0.1)}>
            {HOW_IT_WORKS.map((step) => (
              <m.article
                key={step.title}
                variants={fadeUp(12)}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-800 dark:bg-primary-700/30 dark:text-primary-200">
                  <step.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-slate-100">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {step.description}
                </p>
              </m.article>
            ))}
          </m.div>
        </div>
      </m.section>

      {/* Features */}
      <m.section
        id="features"
        className="bg-white px-6 py-24 dark:bg-slate-950"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={fadeUp(20)}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="mb-4 text-4xl font-black text-slate-900 dark:text-slate-100">
              Detailed platform capabilities
            </h2>
            <p className="mx-auto max-w-3xl text-lg text-slate-600 dark:text-slate-300">
              Every module is intentionally designed to give operational teams context, control, and
              confidence in daily execution.
            </p>
          </div>
          <m.div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={staggerContainer(0.08, 0.1)}
          >
            {FEATURES.map((f) => (
              <m.div
                key={f.title}
                variants={fadeUp(12)}
                className="rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-200 hover:border-primary-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-primary-500/55"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-700/30">
                  <f.icon className="h-5 w-5 text-primary-800 dark:text-primary-200" />
                </div>
                <h3 className="mb-2 font-bold text-slate-900 dark:text-slate-100">{f.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {f.desc}
                </p>
                <ul className="mt-4 space-y-1.5">
                  {f.highlights.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300"
                    >
                      <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-700 dark:text-primary-300" />
                      {item}
                    </li>
                  ))}
                </ul>
              </m.div>
            ))}
          </m.div>
        </div>
      </m.section>

      <m.section
        id="benefits"
        className="bg-slate-50 px-6 py-24 dark:bg-slate-900/70"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={fadeUp(18)}
      >
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-4xl font-black text-slate-900 dark:text-slate-100">
              Business outcomes you can measure
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-lg text-slate-600 dark:text-slate-300">
              BizZW is not only about features. It is designed to improve operating rhythm, reduce
              risk, and keep teams aligned around real performance signals.
            </p>
          </div>

          <m.div className="mt-10 grid gap-6 md:grid-cols-3" variants={staggerContainer(0.1, 0.08)}>
            {BENEFITS.map((benefit) => (
              <m.article
                key={benefit.metric}
                variants={fadeUp(10)}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900"
              >
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                  {benefit.metric}
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {benefit.detail}
                </p>
              </m.article>
            ))}
          </m.div>
        </div>
      </m.section>

      <m.section
        className="bg-slate-100 px-6 py-24 dark:bg-slate-900"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        variants={fadeUp(18)}
      >
        <m.div
          className="mx-auto max-w-6xl grid gap-6 lg:grid-cols-3"
          variants={staggerContainer(0.1, 0.08)}
        >
          <m.article
            variants={fadeUp(10)}
            className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-700/30 dark:text-primary-100">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-slate-100">
              Security and trust layer
            </h3>
            <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
              Hardened request controls, isolation-aware architecture, and observability-driven
              incident response.
            </p>
          </m.article>

          <m.article
            variants={fadeUp(10)}
            className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-100 text-accent-700 dark:bg-accent-700/30 dark:text-accent-100">
              <Brain className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-slate-100">
              Intelligent automation
            </h3>
            <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
              AI-assisted forecasting, stock recommendations, and anomaly guidance to improve
              execution quality.
            </p>
          </m.article>

          <m.article
            variants={fadeUp(10)}
            className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-700/30 dark:text-primary-100">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-slate-100">
              Operational visibility
            </h3>
            <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
              Live system status, offline queue control, and workflow-level telemetry for confident
              daily operations.
            </p>
          </m.article>
        </m.div>
      </m.section>

      {/* Pricing */}
      <m.section
        className="bg-slate-50 px-6 py-24 dark:bg-slate-950"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={fadeUp(18)}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="mb-4 text-4xl font-black text-slate-900 dark:text-slate-100">
              Simple, honest pricing
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Pay in USD. Cancel anytime. Start free today.
            </p>
          </div>
          <m.div
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={staggerContainer(0.08, 0.08)}
          >
            {PLANS.map((plan) => (
              <m.div
                key={plan.name}
                variants={fadeUp(10)}
                className={`relative rounded-2xl border-2 bg-white p-6 dark:bg-slate-900 ${plan.popular ? 'border-primary-800 shadow-xl shadow-primary-100 dark:border-primary-500 dark:shadow-primary-950/40' : 'border-slate-200 dark:border-slate-700'}`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary-800 px-3 py-1 text-xs font-bold text-white dark:bg-primary-600">
                    Most Popular
                  </span>
                )}
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{plan.name}</p>
                <div className="mb-6 mt-3">
                  <span className="text-4xl font-black text-slate-900 dark:text-slate-100">
                    ${plan.price}
                  </span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">/month</span>
                </div>
                <ul className="space-y-2 mb-8">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"
                    >
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary-700 dark:text-primary-300" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`block w-full rounded-lg py-2.5 text-center text-sm font-semibold transition-colors ${plan.popular ? 'bg-primary-800 text-white hover:bg-primary-700 dark:bg-primary-600 dark:hover:bg-primary-500' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'}`}
                >
                  Get started
                </Link>
              </m.div>
            ))}
          </m.div>

          <m.div
            className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900"
            variants={fadeUp(12, 0.15)}
          >
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
              Need implementation guidance before choosing a plan?
            </h3>
            <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
              Review the structured user guide, compare workflows, and talk to our support team for
              plan alignment based on your team size and operational complexity.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                to="/faq"
                search={{ section: 'user-guide' }}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <BookOpenText className="h-4 w-4" /> Open user guide
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-lg bg-primary-800 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
              >
                Talk to an expert <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </m.div>
        </div>
      </m.section>

      {/* CTA */}
      <m.section
        className="bg-linear-to-br from-primary-100 to-accent-100 px-6 py-24 dark:from-slate-900 dark:to-primary-900/80"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.35 }}
        variants={fadeUp(16)}
      >
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="mb-4 text-4xl font-black text-slate-900 dark:text-white">
            Ready to transform your business?
          </h2>
          <p className="mb-10 text-lg text-primary-700 dark:text-primary-200">
            Start with a guided setup, train your team with the built-in user guide, and scale with
            confidence.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-lg font-bold text-primary-900 transition-all hover:bg-primary-50"
            >
              Start for free <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/faq"
              search={{ section: 'user-guide' }}
              className="inline-flex items-center gap-2 rounded-xl border border-primary-300 px-8 py-4 text-lg font-bold text-primary-800 hover:bg-white/70 dark:border-primary-400/40 dark:text-white dark:hover:bg-primary-800/50"
            >
              Read the user guide
            </Link>
          </div>
        </div>
      </m.section>

      <MarketingFooter />
    </div>
  );
}
