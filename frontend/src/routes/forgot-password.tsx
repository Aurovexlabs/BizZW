import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, CheckCircle, Mail } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AuthSplitLayout } from '../components/auth/AuthSplitLayout';
import { Button, Input } from '../components/ui';
import { api } from '../lib/api';

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
});

const schema = z.object({ email: z.string().email('Enter a valid email') });
type ForgotPasswordForm = z.infer<typeof schema>;

function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting, isValid } } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit({ email }: ForgotPasswordForm) {
    await api.post('/auth/forgot-password', { email });
    setSent(true);
  }

  if (sent) {
    return (
      <AuthSplitLayout
        mode="login"
        formTitle="Check your inbox"
        formDescription="If an account exists for this email, a secure reset link is on its way."
      >
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle className="h-6 w-6 text-emerald-600" />
          </div>
          <p className="text-sm leading-7 text-emerald-900">
            If an account with that email exists, we have sent a password reset link. The link expires in one hour.
          </p>
        </div>

        <div className="mt-5">
          <Link to="/login" className="block">
            <Button variant="outline" className="w-full">
              Back to Sign In
            </Button>
          </Link>
        </div>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout
      mode="login"
      formTitle="Reset your password"
      formDescription="Enter your work email and we will send a secure password reset link."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Work email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.com"
          leftIcon={<Mail className="h-4 w-4" />}
          error={errors.email?.message as string | undefined}
          {...register('email')}
        />

        <Button
          type="submit"
          className="w-full"
          size="lg"
          loading={isSubmitting}
          disabled={!isValid || isSubmitting}
        >
          Send reset link
        </Button>
      </form>

      <div className="mt-4 text-center">
        <Link to="/login" className="inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:text-primary-800">
          <ArrowLeft className="h-3 w-3" />
          Back to sign in
        </Link>
      </div>
    </AuthSplitLayout>
  );
}
