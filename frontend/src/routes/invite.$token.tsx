import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Lock, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button, Input } from '../components/ui';
import { api, extractData } from '../lib/api';
import { useAuthStore } from '../store/auth.store';

// ─── Accept Invite ────────────────────────────────────────────

export const Route = createFileRoute('/invite/$token')({
  component: AcceptInvitePage,
});

const inviteSchema = z
  .object({
    name: z.string().min(2, 'Enter your full name'),
    password: z.string().min(8, 'Min 8 characters'),
    confirmPassword: z.string(),
    orgId: z.string().min(1, 'Organization ID is required'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type InviteForm = z.infer<typeof inviteSchema>;

function AcceptInvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
  });

  async function onSubmit(data: InviteForm) {
    try {
      const result = await api.post(`/auth/accept-invite/${token}`, data).then(
        extractData<{
          user: Parameters<typeof setAuth>[0];
          tenant: Parameters<typeof setAuth>[1];
          accessToken: string;
        }>
      );
      setAuth(result.user, result.tenant, result.accessToken);
      toast.success('Welcome to BizZW! 🇿🇼');
      navigate({ to: '/dashboard' });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Invalid or expired invitation');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-primary-100 to-slate-100 px-4 dark:from-primary-950 dark:to-slate-900">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-linear-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white font-black">ZW</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Accept Invitation</h1>
          <p className="mt-1 text-sm text-primary-700 dark:text-primary-300">
            Set up your BizZW account
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-8 shadow-lg backdrop-blur-xl dark:border-white/20 dark:bg-white/10">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Your Full Name"
              required
              placeholder="Tatenda Moyo"
              leftIcon={<User className="w-4 h-4" />}
              error={errors.name?.message}
              {...register('name')}
              className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/40"
            />
            <Input
              label="Organization ID"
              required
              placeholder="From your invitation email"
              hint="Check the invitation email for the org ID"
              error={errors.orgId?.message}
              {...register('orgId')}
              className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/40"
            />
            <Input
              label="Password"
              type="password"
              required
              placeholder="Min 8 characters"
              leftIcon={<Lock className="w-4 h-4" />}
              error={errors.password?.message}
              {...register('password')}
              className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/40"
            />
            <Input
              label="Confirm Password"
              type="password"
              required
              placeholder="Repeat password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
              className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/40"
            />
            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={isSubmitting}
              variant="secondary"
            >
              Activate Account
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
