import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { AlertTriangle, CheckCircle2, Mail, RefreshCw, ShieldCheck } from 'lucide-react';
import { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button, Card, Input } from '../components/ui';
import { api } from '../lib/api';

const OTP_LENGTH = 6;

const verifyEmailSearchSchema = z.object({
  email: z.string().email().optional(),
  orgId: z.string().optional(),
});

export const Route = createFileRoute('/verify-email')({
  validateSearch: verifyEmailSearchSchema,
  component: VerifyEmailOtpPage,
});

function normalizeDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function VerifyEmailOtpPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();

  const [email, setEmail] = useState(search.email || '');
  const [orgId] = useState(search.orgId || '');
  const [digits, setDigits] = useState<string[]>(() =>
    Array.from({ length: OTP_LENGTH }, () => '')
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<'neutral' | 'success' | 'error'>('neutral');

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const otpValue = useMemo(() => digits.join(''), [digits]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  function updateDigits(next: string[]) {
    setDigits(next);
    setStatusMessage(null);
    setStatusTone('neutral');
  }

  function handleDigitChange(index: number, rawValue: string) {
    const sanitized = normalizeDigits(rawValue);

    if (!sanitized) {
      const next = [...digits];
      next[index] = '';
      updateDigits(next);
      return;
    }

    if (sanitized.length > 1) {
      const next = [...digits];
      for (let i = 0; i < sanitized.length && index + i < OTP_LENGTH; i += 1) {
        next[index + i] = sanitized[i];
      }
      updateDigits(next);

      const nextFocusIndex = Math.min(index + sanitized.length, OTP_LENGTH - 1);
      inputRefs.current[nextFocusIndex]?.focus();
      return;
    }

    const next = [...digits];
    next[index] = sanitized;
    updateDigits(next);

    if (index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleDigitKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      return;
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      inputRefs.current[index - 1]?.focus();
      return;
    }

    if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      event.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpPaste(value: string) {
    const pasted = normalizeDigits(value).slice(0, OTP_LENGTH);
    if (!pasted) {
      return;
    }

    const next = Array.from({ length: OTP_LENGTH }, (_, index) => pasted[index] || '');
    updateDigits(next);
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  }

  function clearOtpInputs() {
    updateDigits(Array.from({ length: OTP_LENGTH }, () => ''));
    inputRefs.current[0]?.focus();
  }

  async function verifyOtp() {
    if (!email.includes('@')) {
      setStatusMessage('Enter the same email address used during registration.');
      setStatusTone('error');
      return;
    }

    if (otpValue.length !== OTP_LENGTH) {
      setStatusMessage(`Enter the full ${OTP_LENGTH}-digit verification code.`);
      setStatusTone('error');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      await api.post('/auth/verify-email-otp', {
        email,
        orgId: orgId || undefined,
        otp: otpValue,
      });

      setStatusTone('success');
      setStatusMessage('Email verified successfully. Redirecting to sign in...');
      toast.success('Email verified successfully. Sign in to continue.');

      setTimeout(() => {
        void navigate({ to: '/login' });
      }, 350);
    } catch (error: unknown) {
      const typedError = error as {
        response?: { data?: { message?: string; errorCode?: string } };
      };
      const errorCode = typedError.response?.data?.errorCode;

      if (errorCode === 'INVALID_OTP') {
        setStatusMessage('Invalid code. Double-check the digits and try again.');
      } else if (errorCode === 'EXPIRED_OTP') {
        setStatusMessage('This code has expired. Request a new code and try again.');
      } else if (errorCode === 'OTP_ATTEMPTS_EXCEEDED') {
        setStatusMessage('Too many incorrect attempts. Request a new code to continue.');
      } else {
        setStatusMessage(typedError.response?.data?.message || 'Unable to verify code right now.');
      }

      setStatusTone('error');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resendOtp() {
    if (!email.includes('@')) {
      setStatusTone('error');
      setStatusMessage('Enter your email first so we can send a new code.');
      return;
    }

    setIsResending(true);

    try {
      await api.post('/auth/resend-verification', {
        email,
        orgId: orgId || undefined,
      });

      clearOtpInputs();
      setStatusTone('success');
      setStatusMessage('If your account exists, a new verification code has been sent.');
      toast.success('If your account exists, a new verification code has been sent.');
    } catch {
      setStatusTone('error');
      setStatusMessage('Unable to resend a code right now. Please try again shortly.');
      toast.error('Unable to resend a code right now. Please try again shortly.');
    } finally {
      setIsResending(false);
    }
  }

  const toneClasses =
    statusTone === 'success'
      ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/15 dark:text-emerald-300'
      : statusTone === 'error'
        ? 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-900/40 dark:bg-rose-900/15 dark:text-rose-300'
        : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-100 via-primary-100 to-slate-200 px-4 py-12 text-slate-900 dark:from-slate-950 dark:via-primary-950 dark:to-slate-900 dark:text-slate-100">
      <div className="mx-auto max-w-xl">
        <Card
          className="border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          padding={false}
        >
          <div className="space-y-6 p-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              Secure Email Verification
            </div>

            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                Enter verification code
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                We sent a {OTP_LENGTH}-digit one-time code to your email. Enter it below to verify
                your account.
              </p>
            </div>

            <Input
              label="Email"
              type="email"
              value={email}
              autoComplete="email"
              leftIcon={<Mail className="h-4 w-4" />}
              placeholder="you@company.com"
              onChange={(event) => {
                setEmail(event.target.value.trim());
                setStatusMessage(null);
                setStatusTone('neutral');
              }}
            />

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                Verification code
              </p>
              <div className="flex gap-2 sm:gap-3">
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(node) => {
                      inputRefs.current[index] = node;
                    }}
                    value={digit}
                    onChange={(event) => {
                      handleDigitChange(index, event.target.value);
                    }}
                    onKeyDown={(event) => {
                      handleDigitKeyDown(index, event);
                    }}
                    onPaste={(event) => {
                      event.preventDefault();
                      handleOtpPaste(event.clipboardData.getData('text'));
                    }}
                    onFocus={(event) => {
                      event.target.select();
                    }}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    maxLength={1}
                    className="h-12 w-11 rounded-xl border border-slate-300 bg-white text-center text-xl font-bold tracking-wide text-slate-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 sm:h-14 sm:w-12"
                    aria-label={`OTP digit ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            {statusMessage && (
              <div className={`rounded-xl border px-3 py-2 text-sm ${toneClasses}`}>
                <div className="inline-flex items-center gap-2">
                  {statusTone === 'error' ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  <span>{statusMessage}</span>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                size="md"
                loading={isSubmitting}
                onClick={() => {
                  void verifyOtp();
                }}
                disabled={isSubmitting}
              >
                Verify Code
              </Button>

              <Button
                size="md"
                variant="outline"
                loading={isResending}
                icon={<RefreshCw className="h-4 w-4" />}
                onClick={() => {
                  void resendOtp();
                }}
                disabled={isSubmitting || isResending}
              >
                Resend Code
              </Button>

              <Link to="/login">
                <Button size="md" variant="ghost">
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
