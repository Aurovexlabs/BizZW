import { createFileRoute } from '@tanstack/react-router';
import { BadgeCheck, Building2, Globe2, Rocket, ShieldCheck, Users } from 'lucide-react';
import { MarketingShell } from '../components/marketing/MarketingShell';

export const Route = createFileRoute('/about')({
  component: AboutPage,
});

const VALUES = [
  {
    title: 'Customer Obsession',
    description:
      'We prioritize measurable outcomes for businesses and keep product decisions grounded in real-world operational pain points.',
    icon: Users,
  },
  {
    title: 'Trust by Design',
    description:
      'Security, data isolation, and resilient systems are core architecture constraints, not afterthoughts.',
    icon: ShieldCheck,
  },
  {
    title: 'High Velocity Execution',
    description:
      'We combine rapid iteration with engineering discipline to ship meaningful improvements continuously.',
    icon: Rocket,
  },
];

const MILESTONES = [
  {
    year: '2023',
    heading: 'Platform foundation',
    detail:
      'Built multi-tenant core with inventory, invoicing, and operational dashboards for SMEs.',
  },
  {
    year: '2024',
    heading: 'Intelligence layer',
    detail: 'Introduced AI business insights, advanced reporting, and category-level forecasting.',
  },
  {
    year: '2025',
    heading: 'Reliability upgrade',
    detail: 'Deployed incident monitoring, offline action queue, and background job telemetry.',
  },
  {
    year: '2026+',
    heading: 'Global scale architecture',
    detail:
      'Executing distributed systems roadmap for extreme growth, observability, and regional expansion.',
  },
];

const PLATFORM_SCOPE = [
  {
    title: 'Operational core',
    detail:
      'Inventory, POS, invoices, customers, and expense workflows aligned in one execution layer.',
  },
  {
    title: 'Control and compliance',
    detail:
      'Role-based access, auditability, and structured process visibility for disciplined operations.',
  },
  {
    title: 'Insight and improvement',
    detail:
      'Dashboards, financial reports, and AI guidance to convert data into practical decisions.',
  },
];

const DELIVERY_PRINCIPLES = [
  'Product decisions are validated against operator workflows before release.',
  'Security and reliability constraints are defined at architecture level, not patched later.',
  'UX clarity is treated as a core requirement, especially for high-frequency tasks.',
  'Roadmap priorities balance scale-readiness with immediate customer value.',
];

function AboutPage() {
  return (
    <MarketingShell
      title="About BizZW"
      subtitle="We build mission-critical business infrastructure that helps companies run with precision, speed, and confidence."
    >
      <section className="max-w-6xl px-6 py-16 mx-auto space-y-16">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-800 dark:bg-primary-900/30 dark:text-primary-300">
              <Building2 className="h-3.5 w-3.5" /> Company Story
            </p>
            <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">
              From local pain points to enterprise-grade infrastructure
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
              BizZW started with one goal: remove operational friction from growing businesses.
              Teams were juggling spreadsheets, fragmented tools, and manual reconciliations. We
              built a single platform to unify execution across inventory, sales, invoicing,
              analytics, and automation.
            </p>
            <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
              Today, we continue to push toward a global-grade platform with stronger reliability,
              richer intelligence, and deliberate product craft in every interaction.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary-700 dark:bg-white/10 dark:text-slate-100">
              <Globe2 className="h-3.5 w-3.5" /> Mission and Vision
            </p>
            <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">
              Build the operating system for high-performance businesses
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
              <p>
                <strong className="text-slate-900 dark:text-white">Mission:</strong> Deliver
                software that compounds execution quality, decision speed, and operational
                resilience for every team.
              </p>
              <p>
                <strong className="text-slate-900 dark:text-white">Vision:</strong> Become the most
                trusted business operations platform across emerging and global markets.
              </p>
            </div>
          </div>
        </div>

        <section>
          <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">Our Values</h3>
          <div className="grid gap-4 mt-6 md:grid-cols-3">
            {VALUES.map((value) => (
              <article
                key={value.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                  <value.icon className="w-5 h-5" />
                </div>
                <h4 className="mt-4 text-base font-bold text-slate-900 dark:text-slate-100">
                  {value.title}
                </h4>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {value.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">Milestones</h3>
          <div className="mt-6 space-y-4">
            {MILESTONES.map((milestone) => (
              <article
                key={milestone.year}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-800 dark:bg-primary-900/30 dark:text-primary-300">
                    {milestone.year}
                  </span>
                  <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {milestone.heading}
                  </h4>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {milestone.detail}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">Platform Scope</h3>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
            BizZW is designed as a practical system of execution, not just a reporting layer. The
            platform combines operational transactions, management controls, and strategic insights
            in one connected environment.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {PLATFORM_SCOPE.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
              >
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {item.title}
                </h4>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {item.detail}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">
            How we deliver quality
          </h3>
          <ul className="mt-4 space-y-2">
            {DELIVERY_PRINCIPLES.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 text-sm leading-7 text-slate-600 dark:text-slate-300"
              >
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-700" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900/40 dark:bg-emerald-900/15">
          <p className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800 dark:text-emerald-300">
            <BadgeCheck className="w-4 h-4" /> Built for reliability, security, and intentional
            product quality.
          </p>
        </section>
      </section>
    </MarketingShell>
  );
}
