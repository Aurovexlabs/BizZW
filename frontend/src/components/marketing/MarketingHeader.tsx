import { Link } from '@tanstack/react-router';
import { ArrowRight, BookOpenText } from 'lucide-react';
import { fastMotionTransition, m } from '../motion/AppMotion';

type InternalNavLink = {
  label: string;
  to: '/pricing' | '/about' | '/contact';
};

type ExternalNavLink = {
  label: string;
  href: string;
};

const NAV_LINKS: Array<InternalNavLink | ExternalNavLink> = [
  { label: 'Features', href: '/?section=features' },
  { label: 'How It Works', href: '/?section=how-it-works' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'User Guide', href: '/faq?section=user-guide' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
];

export function MarketingHeader() {
  return (
    <m.header
      className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/88 backdrop-blur-xl supports-[backdrop-filter]:bg-white/78 dark:border-slate-800 dark:bg-slate-950/86 dark:supports-[backdrop-filter]:bg-slate-950/72"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={fastMotionTransition}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-primary-700 to-primary-500 shadow-md">
            <span className="text-xs font-black text-white">ZW</span>
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">BizZW</p>
            <p className="-mt-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Business Operations Platform
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((item) =>
            'href' in item ? (
              <a
                key={item.label}
                href={item.href}
                className="text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={item.label}
                to={item.to}
                className="text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                {item.label}
              </Link>
            )
          )}
        </nav>

        <div className="flex items-center gap-2">
          <m.div
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            transition={fastMotionTransition}
          >
            <a
              href="/faq?section=user-guide"
              className="hidden items-center gap-1 rounded-lg border border-slate-200/80 bg-slate-50/60 px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-white hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-100 sm:inline-flex"
            >
              <BookOpenText className="h-4 w-4" />
              Guide
            </a>
          </m.div>
          <m.div
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            transition={fastMotionTransition}
          >
            <Link
              to="/login"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              Sign in
            </Link>
          </m.div>
          <m.div
            whileHover={{ y: -1, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            transition={fastMotionTransition}
          >
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-700 px-3.5 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-primary-600"
            >
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
          </m.div>
        </div>
      </div>
    </m.header>
  );
}
