import { Building2, Mail, Phone, Send, ShieldCheck } from 'lucide-react';

import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { MarketingShell } from '../components/marketing/MarketingShell';
import { useSubmitContactMessage } from '../hooks/useApi';

export const Route = createFileRoute('/contact')({
  component: ContactPage,
});

const schema = z.object({
  name: z.string().min(2, 'Please enter your full name').max(120),
  email: z.string().email('Please enter a valid email address').max(180),
  company: z.string().max(160).optional(),
  phone: z.string().max(60).optional(),
  topic: z.enum(['sales', 'support', 'partnership', 'security', 'billing', 'general']),
  message: z.string().min(12, 'Please provide more detail').max(2500),
  hp: z.string().max(0).optional(),
});

type FormData = z.infer<typeof schema>;

const TOPIC_LABELS: Record<FormData['topic'], string> = {
  sales: 'Sales',
  support: 'Support',
  partnership: 'Partnership',
  security: 'Security',
  billing: 'Billing',
  general: 'General inquiry',
};

function ContactPage() {
  const submitContact = useSubmitContactMessage();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      topic: 'general',
      hp: '',
    },
  });

  async function onSubmit(data: FormData) {
    await submitContact.mutateAsync(data);
    reset({
      name: '',
      email: '',
      company: '',
      phone: '',
      topic: 'general',
      message: '',
      hp: '',
    });
  }

  return (
    <MarketingShell
      title="Contact Us"
      subtitle="Tell us what you are building and we will connect you with the right product or engineering specialist."
    >
      <section className="mx-auto grid max-w-6xl gap-6 px-6 py-16 lg:grid-cols-[1fr_1.2fr]">
        <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
            Business Support Desk
          </h2>
          <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
            We provide structured support for onboarding, technical escalations, enterprise
            architecture, and partnership requests.
          </p>

          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary-700" /> support@bizzw.co.zw
            </p>
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary-700" /> +263 78 991 1535
            </p>
            <p className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary-700" /> Harare, Zimbabwe
            </p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/15 dark:text-emerald-300">
            <p className="flex items-center gap-1.5 font-semibold">
              <ShieldCheck className="h-4 w-4" /> Security-first communication
            </p>
            <p className="mt-1 leading-6">
              All requests are logged with reference IDs and routed through monitored support
              workflows.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <h3 className="font-bold text-slate-900 dark:text-slate-100">
              What to include for faster help
            </h3>
            <ul className="mt-2 space-y-2 text-xs leading-6">
              <li className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary-700" />
                Your business size and number of branches
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary-700" />
                Feature area and expected outcome
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary-700" />
                Timeline, integrations, or blockers
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-primary-200 bg-primary-50 p-4 text-xs leading-6 text-primary-900 dark:border-primary-800 dark:bg-primary-900/20 dark:text-primary-200">
            <p className="font-semibold">Typical response expectations</p>
            <p className="mt-1">General inquiries: within 1 business day</p>
            <p>Technical escalations: same-day triage during business hours</p>
            <p>Enterprise requests: coordinated discovery response</p>
          </div>
        </aside>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Full name</span>
              <input
                {...register('name')}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-primary-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                placeholder="Your full name"
              />
              {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Email</span>
              <input
                type="email"
                {...register('email')}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-primary-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                placeholder="you@company.com"
              />
              {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Company</span>
              <input
                {...register('company')}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-primary-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                placeholder="Company name"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Phone</span>
              <input
                {...register('phone')}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-primary-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                placeholder="Optional"
              />
            </label>
          </div>

          <label className="mt-4 block space-y-1 text-sm">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Topic</span>
            <select
              {...register('topic')}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-primary-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              {Object.entries(TOPIC_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-4 block space-y-1 text-sm">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Message</span>
            <textarea
              {...register('message')}
              rows={6}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-primary-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              placeholder="Share your goals, current stack, and timeline so we can respond with useful guidance."
            />
            {errors.message && <p className="text-xs text-red-600">{errors.message.message}</p>}
          </label>

          <input
            type="text"
            {...register('hp')}
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
          />

          <button
            type="submit"
            disabled={submitContact.isPending}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary-800 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {submitContact.isPending ? 'Sending...' : 'Send message'}
          </button>
        </form>
      </section>
    </MarketingShell>
  );
}
