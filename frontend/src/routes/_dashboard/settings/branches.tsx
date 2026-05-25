import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useReducedMotion } from 'framer-motion';
import { Building2, ExternalLink, ListChecks, MapPin, Plus, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  getDashboardSettingsMotionTuning,
  m,
  staggerContainer,
  surfaceRevealVariants,
} from '../../../components/motion/AppMotion';
import { Badge, Button, Card, EmptyState, Input, Modal } from '../../../components/ui';
import { useBranches, useCreateBranch } from '../../../hooks/useApi';
import { PLAN_LIMITS } from '../../../shared/types';
import { useAuthStore } from '../../../store/auth.store';

export const Route = createFileRoute('/_dashboard/settings/branches')({
  component: BranchesSettingsPage,
});

const schema = z.object({
  name: z.string().min(1, 'Branch name is required'),
  address: z.string().min(1, 'Address is required'),
});
type FormData = z.infer<typeof schema>;

function BranchesSettingsPage() {
  const { tenant } = useAuthStore();
  const shouldReduceMotion = useReducedMotion() ?? false;
  const motionTuning = getDashboardSettingsMotionTuning('branches', shouldReduceMotion);
  const navigate = useNavigate();
  const [showAdd, setShowAdd] = useState(false);

  const { data: branches } = useBranches();
  const createBranch = useCreateBranch();

  const plan = tenant?.plan;
  const planLimits = plan ? PLAN_LIMITS[plan] : null;
  const branchList = (branches || []) as {
    _id: string;
    name: string;
    address: string;
    isActive: boolean;
  }[];
  const atLimit =
    planLimits && planLimits.maxBranches !== -1 && branchList.length >= planLimits.maxBranches;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  function showBranchLimitToast(message: string) {
    toast.error(message, {
      action: {
        label: 'Go to Billing',
        onClick: () => {
          void navigate({ to: '/settings/billing' });
        },
      },
    });
  }

  function onSubmit(data: FormData) {
    if (atLimit) {
      showBranchLimitToast(`Branch limit reached for your ${plan} plan. Please upgrade.`);
      return;
    }
    createBranch.mutate(data, {
      onSuccess: () => {
        setShowAdd(false);
        reset();
      },
      onError: (err: unknown) => {
        const e = err as { response?: { data?: { message?: string; errorCode?: string } } };
        const message = e?.response?.data?.message || 'Failed to create branch';

        if (e?.response?.data?.errorCode === 'BRANCH_LIMIT_REACHED') {
          showBranchLimitToast(message);
          return;
        }

        toast.error(message);
      },
    });
  }

  return (
    <m.div
      className="p-6 max-w-2xl mx-auto space-y-6"
      initial="hidden"
      animate="visible"
      variants={staggerContainer(motionTuning.staggerChildren, motionTuning.delayChildren)}
    >
      <m.div
        className="flex items-center justify-between"
        variants={surfaceRevealVariants(shouldReduceMotion, motionTuning.heroDistance, 'dashboard')}
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Branches</h1>
          <p className="text-sm text-slate-500">
            {branchList.length} /{' '}
            {planLimits?.maxBranches === -1 ? '∞' : (planLimits?.maxBranches ?? '—')} branches
          </p>
        </div>
        <Button
          icon={<Plus className="w-4 h-4" />}
          onClick={() =>
            atLimit
              ? showBranchLimitToast('Branch limit reached. Upgrade your plan.')
              : setShowAdd(true)
          }
          disabled={!!atLimit}
        >
          Add Branch
        </Button>
      </m.div>

      {atLimit && (
        <m.div
          className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700"
          variants={surfaceRevealVariants(
            shouldReduceMotion,
            motionTuning.heroDistance,
            'dashboard'
          )}
        >
          You've reached the branch limit for your <strong>{plan}</strong> plan.{' '}
          <Link to="/settings/billing" className="font-semibold underline">
            Upgrade to add more branches.
          </Link>
        </m.div>
      )}

      <m.div
        className="grid gap-4 lg:grid-cols-2"
        variants={surfaceRevealVariants(
          shouldReduceMotion,
          motionTuning.utilityDistance,
          'dashboard'
        )}
      >
        <Card className="border-primary-100 bg-primary-50/40">
          <h2 className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary-800">
            <Sparkles className="h-3.5 w-3.5" /> Quick actions
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Keep branch operations, access, and billing controls in sync.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Link to="/settings/team" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                Manage team access
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link to="/settings/billing" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                Review branch limits
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link to="/settings/audit" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                Audit location changes
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link to="/help" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                Open operations guide
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </Card>

        <Card>
          <h2 className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-700">
            <ListChecks className="h-3.5 w-3.5" /> Example workflow
          </h2>
          <ol className="mt-3 space-y-2">
            {[
              'Create the branch with a clear naming convention for reporting.',
              'Assign branch-specific users and restrict sensitive roles where needed.',
              'Validate billing plan limits before onboarding new locations.',
              'Review audit entries after changes to confirm governance coverage.',
            ].map((step, index) => (
              <li key={step} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </Card>
      </m.div>

      {branchList.length === 0 ? (
        <m.div
          variants={surfaceRevealVariants(
            shouldReduceMotion,
            motionTuning.contentDistance,
            'dashboard'
          )}
        >
          <EmptyState
            icon={<Building2 className="w-8 h-8" />}
            title="No branches yet"
            description={
              atLimit
                ? 'Your current plan limit has been reached. Upgrade to add additional locations.'
                : 'Add branches to manage multiple locations from one account.'
            }
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                {!atLimit && (
                  <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>
                    Add Branch
                  </Button>
                )}
                <Link to="/settings/billing">
                  <Button variant="outline">View plan limits</Button>
                </Link>
              </div>
            }
          />
        </m.div>
      ) : (
        <m.div
          className="space-y-3"
          variants={surfaceRevealVariants(
            shouldReduceMotion,
            motionTuning.deepContentDistance,
            'dashboard'
          )}
        >
          {branchList.map((branch) => (
            <Card key={branch._id}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-primary-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{branch.name}</p>
                    <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5" /> {branch.address}
                    </p>
                  </div>
                </div>
                <Badge variant={branch.isActive ? 'success' : 'default'}>
                  {branch.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </Card>
          ))}
        </m.div>
      )}

      <Modal
        open={showAdd}
        onClose={() => {
          setShowAdd(false);
          reset();
        }}
        title="Add Branch"
        size="sm"
        footer={
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowAdd(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button form="add-branch-form" type="submit" loading={createBranch.isPending}>
              Create Branch
            </Button>
          </div>
        }
      >
        <form id="add-branch-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Branch Name"
            placeholder="e.g. Harare CBD, Bulawayo Branch"
            required
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label="Address"
            placeholder="123 Main St, Harare"
            required
            error={errors.address?.message}
            {...register('address')}
          />
        </form>
      </Modal>
    </m.div>
  );
}
