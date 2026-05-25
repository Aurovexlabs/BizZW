import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { AlertTriangle, ArrowRight, Mail } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button, Card } from '../components/ui';
import { api } from '../lib/api';

const verifyEmailSearchSchema = z.object({
  orgId: z.string().optional(),
  email: z.string().email().optional(),
});

export const Route = createFileRoute('/verify-email/$token')({
  validateSearch: verifyEmailSearchSchema,
  component: VerifyEmailLegacyLinkPage,
});

function VerifyEmailLegacyLinkPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [isResending, setIsResending] = useState(false);

  async function resendVerification() {
    if (!search.email) {
      toast.error(
        'Email is missing in this link. Go to login and request a new verification code.'
      );
      return;
    }

    setIsResending(true);
    try {
      await api.post('/auth/resend-verification', {
        email: search.email,
        orgId: search.orgId,
      });
      toast.success('If your account exists, a new verification code has been sent.');
    } catch {
      toast.error('Unable to resend verification code now. Please try again shortly.');
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-100 via-primary-100 to-slate-200 px-4 py-12 text-slate-900 dark:from-slate-950 dark:via-primary-950 dark:to-slate-900 dark:text-slate-100">
      <div className="mx-auto max-w-xl">
        <Card
          className="border border-amber-200 bg-amber-50 text-amber-900 shadow-xl dark:border-amber-900/40 dark:bg-amber-900/15 dark:text-amber-200"
          padding={false}
        >
          <div className="space-y-4 p-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide dark:bg-slate-900/60">
              <AlertTriangle className="h-3.5 w-3.5" />
              Link Verification Disabled
            </div>

            <h1 className="text-2xl font-black tracking-tight">Email Verification</h1>
            <p className="text-sm leading-6">
              Email verification links are no longer supported. Continue with the secure OTP
              verification flow.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button
                size="md"
                icon={<ArrowRight className="h-4 w-4" />}
                onClick={() => {
                  void navigate({
                    to: '/verify-email',
                    search: {
                      email: search.email,
                      orgId: search.orgId,
                    },
                  });
                }}
              >
                Continue with OTP
              </Button>

              <Button
                variant="outline"
                size="md"
                loading={isResending}
                icon={<Mail className="h-4 w-4" />}
                onClick={() => {
                  void resendVerification();
                }}
              >
                Resend Code
              </Button>

              <Link to="/login">
                <Button variant="ghost" size="md">
                  Back to Login
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
