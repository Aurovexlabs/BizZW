import { createFileRoute } from '@tanstack/react-router';
import { MarketingShell } from '../components/marketing/MarketingShell';

export const Route = createFileRoute('/terms')({
  component: TermsPage,
});

const SECTIONS = [
  {
    id: 'acceptance',
    title: '1. Acceptance of Terms',
    body: 'By accessing or using BizZW, you agree to these Terms and Conditions and all applicable laws and regulations. If you do not agree, you must discontinue use of the platform.',
  },
  {
    id: 'accounts',
    title: '2. Accounts and Access',
    body: 'You are responsible for safeguarding your account credentials, ensuring data accuracy, and controlling user permissions within your organization. Account sharing that compromises security is prohibited.',
  },
  {
    id: 'billing',
    title: '3. Billing and Subscription',
    body: 'Paid plans are billed according to your selected subscription cycle. Fees are non-refundable except where required by law or stated in your service agreement. We reserve the right to adjust pricing with prior notice.',
  },
  {
    id: 'data',
    title: '4. Data Ownership and Processing',
    body: 'You retain ownership of your business data. BizZW processes data solely to deliver platform functionality, security, analytics, and support. Data handling practices are governed by applicable privacy laws.',
  },
  {
    id: 'acceptable-use',
    title: '5. Acceptable Use Policy',
    body: 'You agree not to use BizZW for illegal activities, malicious automation, unauthorized access, reverse engineering, or distribution of harmful content. Violations may result in account suspension or termination.',
  },
  {
    id: 'security',
    title: '6. Security and Incident Response',
    body: 'BizZW applies enterprise-level security controls. While we maintain strong safeguards, no system is completely risk-free. Users must report suspected breaches promptly so incidents can be investigated and mitigated.',
  },
  {
    id: 'availability',
    title: '7. Service Availability',
    body: 'We strive for high availability and operational reliability. Planned maintenance and unforeseen outages may occur. We will use commercially reasonable efforts to restore service quickly and communicate major incidents.',
  },
  {
    id: 'liability',
    title: '8. Limitation of Liability',
    body: 'To the maximum extent permitted by law, BizZW is not liable for indirect, incidental, or consequential damages. Total liability is limited to fees paid for the service in the preceding twelve months.',
  },
  {
    id: 'termination',
    title: '9. Termination',
    body: 'You may stop using the service at any time. We may suspend or terminate accounts that violate these terms, compromise platform security, or fail to meet payment obligations.',
  },
  {
    id: 'changes',
    title: '10. Changes to Terms',
    body: 'We may revise these terms periodically. Updated terms become effective upon publication. Continued use of the service after changes indicates acceptance of the revised terms.',
  },
];

function TermsPage() {
  function scrollToTermsSection(sectionId: string) {
    const target = document.getElementById(sectionId);
    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <MarketingShell
      title="Terms and Conditions"
      subtitle="These terms define your rights, responsibilities, and usage boundaries while using BizZW services."
    >
      <section className="max-w-5xl px-6 py-16 mx-auto">
        <div className="p-8 bg-white border shadow-sm rounded-2xl border-slate-200">
          <p className="text-sm text-slate-500">Effective Date: April 10, 2026</p>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            This document is intended as a general terms framework. For regulated industries or
            enterprise engagements, your organization may require an additional signed agreement,
            data processing addendum, or negotiated SLA.
          </p>

          <section className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h2 className="text-sm font-black text-slate-900">Quick summary</h2>
            <ul className="mt-2 space-y-1.5 text-sm leading-6 text-slate-600">
              <li className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary-700" />
                You keep ownership of your business data.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary-700" />
                You are responsible for account security and user access control.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary-700" />
                Billing follows your selected subscription terms.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary-700" />
                Misuse or illegal use can result in account termination.
              </li>
            </ul>
          </section>

          <section className="mt-6 rounded-xl border border-primary-100 bg-primary-50 p-4">
            <h2 className="text-sm font-black text-slate-900">Jump to a section</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {SECTIONS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => scrollToTermsSection(section.id)}
                  className="rounded-lg border border-primary-100 bg-white px-3 py-2 text-xs font-semibold text-primary-800 hover:bg-primary-100"
                >
                  {section.title}
                </button>
              ))}
            </div>
          </section>

          <div className="mt-8 space-y-6">
            {SECTIONS.map((section) => (
              <article key={section.id} id={section.id} className="scroll-mt-28">
                <h2 className="text-lg font-bold text-slate-900">{section.title}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">{section.body}</p>
              </article>
            ))}
          </div>

          <div className="p-4 mt-10 text-sm border rounded-xl border-slate-200 bg-slate-50 text-slate-600">
            Questions regarding these terms can be sent to support@bizzw.co.zw.
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
