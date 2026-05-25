import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Building2, CheckCircle2, Lock, Mail, ShieldCheck, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { AuthSplitLayout } from '../components/auth/AuthSplitLayout';
import { Button, Input, Select } from '../components/ui';
import { api, extractData } from '../lib/api';
import { Currency } from '../shared/types';
import { useAuthStore } from '../store/auth.store';

export const Route = createFileRoute('/register')({
  component: RegisterPage,
});

const schema = z
  .object({
    businessName: z.string().min(2, 'Business name must be at least 2 characters'),
    ownerName: z.string().min(2, 'Your name must be at least 2 characters'),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Please confirm your password'),
    businessType: z.string().optional(),
    currency: z.nativeEnum(Currency).default(Currency.USD),
    acceptTerms: z.boolean().refine((value) => value, {
      message: 'Please accept the Terms and Conditions',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
type FormData = z.infer<typeof schema>;

function getPasswordCriteria(password: string) {
  return [
    {
      label: 'At least 8 characters',
      met: password.length >= 8,
    },
    {
      label: 'Includes uppercase and lowercase',
      met: /[A-Z]/.test(password) && /[a-z]/.test(password),
    },
    {
      label: 'Includes a number',
      met: /\d/.test(password),
    },
    {
      label: 'Includes a symbol',
      met: /[^A-Za-z0-9]/.test(password),
    },
  ];
}

function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      currency: Currency.USD,
      acceptTerms: false,
      confirmPassword: '',
    },
  });

  const password = watch('password') || '';
  const passwordCriteria = getPasswordCriteria(password);
  const passwordScore = passwordCriteria.filter((criterion) => criterion.met).length;

  async function onSubmit(data: FormData) {
    try {
      const { confirmPassword: _confirmPassword, acceptTerms: _acceptTerms, ...payload } = data;

      const result = await api.post('/auth/register', payload).then(
        extractData<
          | {
              user: Parameters<typeof setAuth>[0];
              tenant: Parameters<typeof setAuth>[1];
              accessToken: string;
            }
          | {
              requiresEmailVerification: true;
              verificationEmailSent: boolean;
              verificationMethod: 'otp';
              otpLength: number;
              otpExpiresInSeconds: number;
              email: string;
              orgId: string;
            }
        >
      );

      if ('accessToken' in result) {
        setAuth(result.user, result.tenant, result.accessToken);
        toast.success('Welcome to BizZW! 🇿🇼');
        navigate({ to: '/dashboard' });
        return;
      }

      if (result.verificationEmailSent) {
        toast.success('Account created. Enter the OTP from your email to verify your account.');
      } else {
        toast.warning(
          'Account created, but OTP delivery is pending. Continue to the verification screen to resend.'
        );
      }

      navigate({
        to: '/verify-email',
        search: {
          email: result.email,
          orgId: result.orgId,
        },
      });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Registration failed');
    }
  }

  return (
    <AuthSplitLayout
      mode="register"
      formTitle="Create your workspace"
      formDescription="Set up your account in minutes and start managing inventory, sales, and financial workflows with confidence."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Business name"
          autoComplete="organization"
          placeholder="Apex Distribution"
          leftIcon={<Building2 className="h-4 w-4" />}
          error={errors.businessName?.message}
          {...register('businessName')}
        />

        <Input
          label="Your full name"
          autoComplete="name"
          placeholder="Tatenda Moyo"
          leftIcon={<User className="h-4 w-4" />}
          error={errors.ownerName?.message}
          {...register('ownerName')}
        />

        <Input
          label="Work email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          leftIcon={<Mail className="h-4 w-4" />}
          error={errors.email?.message}
          {...register('email')}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            placeholder="Create password"
            leftIcon={<Lock className="h-4 w-4" />}
            error={errors.password?.message}
            {...register('password')}
          />

          <Input
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat password"
            leftIcon={<ShieldCheck className="h-4 w-4" />}
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Password strength
          </p>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {[0, 1, 2, 3].map((index) => (
              <span
                key={index}
                className={[
                  'h-1.5 rounded-full transition-colors',
                  passwordScore > index ? 'bg-emerald-500' : 'bg-slate-200',
                ].join(' ')}
              />
            ))}
          </div>
          <div className="mt-2 grid gap-1">
            {passwordCriteria.map((criterion) => (
              <p
                key={criterion.label}
                className={[
                  'inline-flex items-center gap-1.5 text-xs',
                  criterion.met ? 'text-emerald-700' : 'text-slate-500',
                ].join(' ')}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {criterion.label}
              </p>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Business type"
            options={[
              { value: 'retail', label: 'Retail' },
              { value: 'wholesale', label: 'Wholesale' },
              { value: 'restaurant', label: 'Restaurant' },
              { value: 'service', label: 'Services' },
              { value: 'manufacturing', label: 'Manufacturing' },
              { value: 'other', label: 'Other' },
            ]}
            {...register('businessType')}
          />

          <Select
            label="Currency"
            options={[
              { value: Currency.USD, label: 'USD ($)' },
              { value: Currency.ZIG, label: 'ZiG' },
            ]}
            {...register('currency')}
          />
        </div>

        <label className="flex items-start gap-2.5 text-sm text-slate-600">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-slate-300"
            {...register('acceptTerms')}
          />
          <span>
            I agree to the{' '}
            <Link to="/terms" className="font-semibold text-primary-700 hover:text-primary-800">
              Terms and Conditions
            </Link>
            .
          </span>
        </label>
        {errors.acceptTerms && <p className="text-xs text-red-600">{errors.acceptTerms.message}</p>}

        <Button
          type="submit"
          className="mt-2 w-full"
          size="lg"
          loading={isSubmitting}
          variant="secondary"
          disabled={!isValid || isSubmitting}
        >
          Create workspace
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-primary-700 hover:text-primary-800">
          Sign in
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
