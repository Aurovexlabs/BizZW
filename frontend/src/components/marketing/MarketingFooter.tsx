import { Link } from '@tanstack/react-router';
import { Building2, Globe2, Mail, MapPin, Phone } from 'lucide-react';

const companyLinks = [
  { label: 'About', to: '/about' as const },
  { label: 'Pricing', to: '/pricing' as const },
  { label: 'FAQ', to: '/faq' as const },
  { label: 'Contact', to: '/contact' as const },
];

const resourceLinks = [
  { label: 'User Guide', href: '/faq?section=user-guide' },
  { label: 'How It Works', href: '/?section=how-it-works' },
  { label: 'Platform Benefits', href: '/?section=benefits' },
  { label: 'Terms and Conditions', to: '/terms' as const },
];

const socialLinks = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/bizzw' },
  { label: 'X', href: 'https://x.com/bizzw' },
  { label: 'YouTube', href: 'https://www.youtube.com/@bizzw' },
];

export function MarketingFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-slate-200 bg-white px-6 py-14 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
      <div className="marketing-footer-glow pointer-events-none absolute inset-0" />

      <div className="relative mx-auto grid max-w-7xl gap-10 md:grid-cols-4">
        <section>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-primary-700 to-primary-500 shadow-md">
              <span className="text-xs font-black text-white">ZW</span>
            </div>
            <div>
              <p className="text-base font-black text-slate-900 dark:text-white">BizZW</p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-500">
                Enterprise-ready operations
              </p>
            </div>
          </div>
          <p className="text-sm leading-7 text-slate-600 dark:text-slate-400">
            BizZW helps teams unify inventory, invoicing, sales, reporting, and operational
            decision-making in one reliable platform.
          </p>
        </section>

        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
            Company
          </p>
          <div className="space-y-2 text-sm">
            {companyLinks.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className="block transition-colors hover:text-slate-900 dark:hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </section>

        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
            Resources
          </p>
          <div className="space-y-2 text-sm">
            {resourceLinks.map((item) =>
              item.href ? (
                <a
                  key={item.label}
                  href={item.href}
                  className="block transition-colors hover:text-slate-900 dark:hover:text-white"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.label}
                  to={item.to!}
                  className="block transition-colors hover:text-slate-900 dark:hover:text-white"
                >
                  {item.label}
                </Link>
              )
            )}
          </div>
        </section>

        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
            Contact and Legal
          </p>
          <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4" /> support@bizzw.co.zw
            </p>
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4" /> +263 78 991 1535
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Harare, Zimbabwe
            </p>
            <p className="flex items-center gap-2">
              <Building2 className="h-4 w-4" /> BizZW Technologies
            </p>
            <p className="flex items-center gap-2">
              <Globe2 className="h-4 w-4" /> Operated globally
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {socialLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-slate-900 dark:hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </div>
        </section>
      </div>

      <div className="relative mx-auto mt-10 max-w-7xl border-t border-slate-200 pt-5 text-xs text-slate-500 dark:border-white/10 dark:text-slate-500">
        <p>
          © {new Date().getFullYear()} BizZW Technologies. All rights reserved. Built for
          operational excellence.
        </p>
      </div>
    </footer>
  );
}
