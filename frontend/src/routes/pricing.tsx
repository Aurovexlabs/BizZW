import { createFileRoute, Link } from '@tanstack/react-router';
import { CheckCircle } from 'lucide-react';
import { MarketingShell } from '../components/marketing/MarketingShell';
import { PlanType } from '../shared/types';

export const Route = createFileRoute('/pricing')({
  component: PricingPage,
});

const PLANS = [
  {
    name: PlanType.STARTER,
    price: 0,
    description: 'Perfect for micro businesses just getting started',
    features: [
      '2 user accounts',
      '50 products',
      '1 branch',
      'POS & invoicing',
      'Customer management',
      'Basic analytics',
    ],
    cta: 'Start for free',
  },
  {
    name: PlanType.GROWTH,
    price: 9,
    description: 'For growing businesses that need more power',
    popular: true,
    features: [
      '10 user accounts',
      '500 products',
      '2 branches',
      'AI-powered insights',
      'Advanced reports',
      'Email invoices with PDF',
      'EcoCash & Paynow',
    ],
    cta: 'Get Growth',
  },
  {
    name: PlanType.PRO,
    price: 19,
    description: 'For established businesses scaling operations',
    features: [
      '50 user accounts',
      '5,000 products',
      '5 branches',
      'API access',
      'Tax & P&L reports',
      'Priority support',
      'All payment methods',
    ],
    cta: 'Get Pro',
  },
  {
    name: PlanType.ENTERPRISE,
    price: 49,
    description: 'For large enterprises with complex needs',
    features: [
      'Unlimited users',
      'Unlimited products',
      'Unlimited branches',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantee',
      'White-label option',
    ],
    cta: 'Get Enterprise',
  },
];

function PricingPage() {
  return (
    <MarketingShell
      title="Pricing and Plan Guidance"
      subtitle="Choose a plan based on your team size, workflow complexity, and operational goals. Start simple and scale without migration pain."
    >
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">
            Billing transparency
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
            Pricing is monthly in USD with no hidden setup fees. You can start with the free Starter
            tier, move up when limits are reached, and keep data continuity across every plan.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              'Monthly billing with clear plan limits',
              'Upgrade without data migration',
              'Paynow-friendly payment workflows',
            ].map((item) => (
              <div
                key={item}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <article
              key={plan.name}
              className={`relative rounded-2xl border-2 p-6 ${plan.popular ? 'scale-[1.02] border-primary-800 shadow-xl shadow-primary-100 dark:shadow-primary-950/40' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'}`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary-800 px-4 py-1 text-xs font-bold text-white">
                  Most Popular
                </div>
              )}
              <p className="mb-1 text-xl font-black text-slate-900 dark:text-slate-100">
                {plan.name}
              </p>
              <p className="mb-4 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {plan.description}
              </p>
              <div className="mb-5">
                <span className="text-4xl font-black text-slate-900 dark:text-slate-100">
                  ${plan.price}
                </span>
                <span className="text-slate-400 dark:text-slate-500">/month</span>
              </div>
              <ul className="mb-7 space-y-2.5">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"
                  >
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className={`block rounded-xl py-3 text-center text-sm font-bold transition-all ${plan.popular ? 'bg-primary-800 text-white hover:bg-primary-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'}`}
              >
                {plan.cta}
              </Link>
            </article>
          ))}
        </div>

        <section className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">
            Plan comparison at a glance
          </h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Use this quick matrix to align plan choice with your operational footprint.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400">
                  <th className="px-3 py-2 font-semibold">Capability</th>
                  <th className="px-3 py-2 font-semibold">Starter</th>
                  <th className="px-3 py-2 font-semibold">Growth</th>
                  <th className="px-3 py-2 font-semibold">Pro</th>
                  <th className="px-3 py-2 font-semibold">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['User accounts', '2', '10', '50', 'Unlimited'],
                  ['Products', '50', '500', '5,000', 'Unlimited'],
                  ['Branches', '1', '2', '5', 'Unlimited'],
                  ['AI insights', 'No', 'Yes', 'Yes', 'Yes'],
                  ['API access', 'No', 'No', 'Yes', 'Yes'],
                  ['Support level', 'Standard', 'Priority queue', 'Priority', 'Dedicated'],
                ].map((row) => (
                  <tr
                    key={row[0]}
                    className="rounded-xl bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {row.map((cell) => (
                      <td key={cell} className="px-3 py-2 first:font-semibold">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">
            Frequently asked pricing questions
          </h3>
          <div className="mt-4 space-y-5">
            {[
              {
                q: 'Can I pay in ZiG?',
                a: 'Billing is currently structured in USD with Paynow-compatible payment methods including EcoCash, VISA, and bank transfer flows.',
              },
              {
                q: 'Can I switch plans as my team grows?',
                a: 'Yes. Upgrades can be applied as operational needs increase, and your existing data and workflows remain intact.',
              },
              {
                q: 'What happens if we hit a plan limit?',
                a: 'The platform surfaces limit guidance and clear upgrade paths so your team can continue without disruption.',
              },
              {
                q: 'How do we choose the right tier?',
                a: 'Use your current number of users, branches, and reporting needs as the baseline. For complex operations, use the contact page for plan consultation.',
              },
            ].map((entry) => (
              <article
                key={entry.q}
                className="border-b border-slate-200 pb-4 last:border-b-0 dark:border-slate-700"
              >
                <h4 className="font-bold text-slate-900 dark:text-slate-100">{entry.q}</h4>
                <p className="mt-1 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {entry.a}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/faq"
              search={{ section: 'user-guide' }}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Read user guide first
            </Link>
            <Link
              to="/contact"
              className="rounded-lg bg-primary-800 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
            >
              Request plan consultation
            </Link>
          </div>
        </section>
      </section>
    </MarketingShell>
  );
}
