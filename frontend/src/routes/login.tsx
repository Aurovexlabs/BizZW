import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { CheckCircle2, Lock, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { AuthSplitLayout } from '../components/auth/AuthSplitLayout';
import { Button, Input } from '../components/ui';
import { api, extractData } from '../lib/api';
import { useAuthStore } from '../store/auth.store';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type FormData = z.infer<typeof schema>;

function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty, isValid },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function resendVerification(email: string) {
    try {
      await api.post('/auth/resend-verification', { email });
      toast.success('If your account exists, a new verification code has been sent.');
    } catch {
      toast.error('Could not send a verification code right now. Please try again shortly.');
    }
  }

  async function onSubmit(data: FormData) {
    try {
      const result = await api.post('/auth/login', data).then(
        extractData<{
          user: Parameters<typeof setAuth>[0];
          tenant: Parameters<typeof setAuth>[1];
          accessToken: string;
        }>
      );
      setAuth(result.user, result.tenant, result.accessToken);
      navigate({ to: '/dashboard' });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; errorCode?: string } } };
      const errorCode = e?.response?.data?.errorCode;

      if (errorCode === 'EMAIL_NOT_VERIFIED') {
        await resendVerification(data.email);
        toast.error('Email not verified yet. Enter the verification code from your inbox.');
        navigate({
          to: '/verify-email',
          search: {
            email: data.email,
          },
        });
        return;
      }

      toast.error(e?.response?.data?.message || 'Login failed');
    }
  }

  return (
    <AuthSplitLayout
      mode="login"
      formTitle="Welcome back"
      formDescription="Sign in to continue managing operations, revenue workflows, and customer performance in one place."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Work email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          leftIcon={<Mail className="h-4 w-4" />}
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          leftIcon={<Lock className="h-4 w-4" />}
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="flex items-center justify-between gap-2">
          <p className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            {isDirty && isValid
              ? 'Looks good. Ready to sign in.'
              : 'Use your organization credentials.'}
          </p>

          <Link
            to="/forgot-password"
            className="text-xs font-semibold text-primary-700 hover:text-primary-800"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          className="mt-2 w-full"
          size="lg"
          loading={isSubmitting}
          disabled={!isValid || isSubmitting}
        >
          Sign in securely
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-500">
        New to BizZW?{' '}
        <Link to="/register" className="font-semibold text-primary-700 hover:text-primary-800">
          Create your workspace
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
