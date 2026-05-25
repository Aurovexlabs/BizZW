import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { CheckCircle, Lock } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { AuthSplitLayout } from '../components/auth/AuthSplitLayout';
import { Button, Input } from '../components/ui';
import { api } from '../lib/api';

export const Route = createFileRoute('/reset-password/$token')({
  component: ResetPasswordPage,
});

const schema = z.object({
  password: z.string().min(8, 'Min 8 characters'),
  confirmPassword: z.string(),
  orgId: z.string().min(1, 'Required'),
}).refine((d) => d.password === d.confirmPassword, { message: "Passwords don't match", path: ['confirmPassword'] });

type FormData = z.infer<typeof schema>;

function ResetPasswordPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [done, setDone] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting, isValid } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      orgId: '',
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit({ password, orgId }: FormData) {
    try {
      await api.post(`/auth/reset-password/${token}`, { password, orgId });
      setDone(true);
      setTimeout(() => navigate({ to: '/login' }), 2500);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Reset link is invalid or expired');
    }
  }

  if (done) {
    return (
      <AuthSplitLayout
        mode="login"
        formTitle="Password updated"
        formDescription="Your password has been changed successfully."
      >
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle className="h-6 w-6 text-emerald-600" />
          </div>
          <p className="text-sm leading-7 text-emerald-900">Redirecting you to sign in securely.</p>
        </div>

        <div className="mt-5">
          <Link to="/login" className="block">
            <Button variant="outline" className="w-full">Go to sign in</Button>
          </Link>
        </div>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout
      mode="login"
      formTitle="Set a new password"
      formDescription="Choose a strong password and use the organization ID from your reset email."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Organization ID"
          required
          placeholder="Your organization ID"
          hint="Found in your password reset email"
          error={errors.orgId?.message}
          {...register('orgId')}
        />

        <Input
          label="New password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="Minimum 8 characters"
          leftIcon={<Lock className="h-4 w-4" />}
          error={errors.password?.message}
          {...register('password')}
        />

        <Input
          label="Confirm password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="Repeat new password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button
          type="submit"
          className="w-full"
          size="lg"
          loading={isSubmitting}
          disabled={!isValid || isSubmitting}
        >
          Update password
        </Button>
      </form>

      <div className="mt-4 text-center">
        <Link to="/login" className="text-sm font-medium text-primary-700 hover:text-primary-800">
          Back to sign in
        </Link>
      </div>
    </AuthSplitLayout>
  );
}
