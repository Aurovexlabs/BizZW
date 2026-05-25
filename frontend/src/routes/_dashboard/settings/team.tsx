import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useReducedMotion } from 'framer-motion';
import { ExternalLink, ListChecks, Plus, Shield, Sparkles, UserCheck, UserX } from 'lucide-react';
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
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Input,
  Modal,
  Select,
  Skeleton,
} from '../../../components/ui';
import { useInviteTeamMember, useTeam } from '../../../hooks/useApi';
import { api } from '../../../lib/api';
import { cn } from '../../../lib/cn';
import { queryKeys } from '../../../lib/queryClient';
import { getTeamLimitAwareErrorMessage, isTeamUserLimitError } from '../../../lib/settings-utils';
import { IUser, UserRole } from '../../../shared/types';
import { getRelativeTime } from '../../../shared/utils';
import { useAuthStore } from '../../../store/auth.store';

export const Route = createFileRoute('/_dashboard/settings/team')({
  component: TeamSettingsPage,
});

const INVITE_ROLES = [
  UserRole.ORG_ADMIN,
  UserRole.CASHIER,
  UserRole.ACCOUNTANT,
  UserRole.VIEWER,
] as const;

const inviteSchema = z.object({
  email: z.string().email('Enter a valid email'),
  role: z.enum(INVITE_ROLES),
});
type InviteForm = z.infer<typeof inviteSchema>;

const ROLE_COLORS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'purple',
  [UserRole.ORG_OWNER]: 'info',
  [UserRole.ORG_ADMIN]: 'info',
  [UserRole.CASHIER]: 'success',
  [UserRole.ACCOUNTANT]: 'warning',
  [UserRole.VIEWER]: 'default',
};

const ROLE_DESCRIPTIONS: Partial<Record<UserRole, string>> = {
  [UserRole.ORG_ADMIN]: 'Inventory, sales, reports, customers',
  [UserRole.CASHIER]: 'POS sales & product lookup',
  [UserRole.ACCOUNTANT]: 'Invoices, expenses & reports',
  [UserRole.VIEWER]: 'Read-only access to all modules',
};

function TeamSettingsPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const shouldReduceMotion = useReducedMotion() ?? false;
  const motionTuning = getDashboardSettingsMotionTuning('team', shouldReduceMotion);
  const qc = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const { data: team, isLoading } = useTeam();
  const inviteMember = useInviteTeamMember();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: UserRole.CASHIER },
  });

  async function onInvite(data: InviteForm) {
    try {
      await inviteMember.mutateAsync(data);
      setShowInvite(false);
      reset();
      toast.success('Invitation sent successfully');
    } catch (err: unknown) {
      showTeamErrorToast(err, 'Failed to send invitation');
    }
  }

  async function handleRemove() {
    if (!removeId) return;
    setRemoving(true);
    try {
      await api.delete(`/auth/team/${removeId}`);
      qc.invalidateQueries({ queryKey: queryKeys.team });
      toast.success('Team member removed');
    } catch (err: unknown) {
      showTeamErrorToast(err, 'Failed to remove member');
    } finally {
      setRemoving(false);
      setRemoveId(null);
    }
  }

  async function handleReactivate(memberId: string) {
    setReactivatingId(memberId);
    try {
      await api.patch(`/auth/team/${memberId}`, { isActive: true });
      qc.invalidateQueries({ queryKey: queryKeys.team });
      toast.success('Team member reactivated');
    } catch (err: unknown) {
      showTeamErrorToast(err, 'Failed to reactivate member');
    } finally {
      setReactivatingId(null);
    }
  }

  const members = (team || []) as IUser[];
  const canManage = [UserRole.ORG_OWNER, UserRole.ORG_ADMIN].includes(
    currentUser?.role as UserRole
  );

  function showTeamErrorToast(err: unknown, fallback: string) {
    const message = getTeamLimitAwareErrorMessage(err, fallback);

    if (isTeamUserLimitError(err)) {
      toast.error(message, {
        action: {
          label: 'Go to Billing',
          onClick: () => {
            void navigate({ to: '/settings/billing' });
          },
        },
      });
      return;
    }

    toast.error(message);
  }

  return (
    <m.div
      className="p-6 max-w-3xl mx-auto space-y-6"
      initial="hidden"
      animate="visible"
      variants={staggerContainer(motionTuning.staggerChildren, motionTuning.delayChildren)}
    >
      <m.div
        className="flex items-center justify-between"
        variants={surfaceRevealVariants(shouldReduceMotion, motionTuning.heroDistance, 'dashboard')}
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team Members</h1>
          <p className="text-sm text-slate-500">{members.length} members in your organization</p>
        </div>
        {canManage && (
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowInvite(true)}>
            Invite member
          </Button>
        )}
      </m.div>

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
            Manage seats, permissions, and governance from one place.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between"
                onClick={() => setShowInvite(true)}
              >
                Invite team member
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
            <Link to="/settings/billing" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                Review seat limits
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link to="/settings/branches" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                Branch assignments
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link to="/settings/audit" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                Open access audit
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
              'Define least-privilege roles before sending invitations.',
              'Invite members with role-specific responsibilities from day one.',
              'Confirm first login and expected module access on acceptance.',
              'Review dormant accounts weekly and deactivate when no longer needed.',
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

      {/* Role reference */}
      <m.div
        variants={surfaceRevealVariants(
          shouldReduceMotion,
          motionTuning.contentDistance,
          'dashboard'
        )}
      >
        <Card>
          <h2 className="font-semibold text-slate-900 mb-3 text-sm">Role Permissions</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {Object.entries(ROLE_DESCRIPTIONS).map(([role, desc]) => (
              <div key={role} className="flex items-start gap-2 text-sm">
                <Badge
                  variant={
                    ROLE_COLORS[role as UserRole] as
                      | 'default'
                      | 'info'
                      | 'warning'
                      | 'success'
                      | 'danger'
                      | 'purple'
                  }
                  size="sm"
                >
                  {role}
                </Badge>
                <span className="text-slate-500">{desc}</span>
              </div>
            ))}
          </div>
        </Card>
      </m.div>

      {/* Members list */}
      <m.div
        variants={surfaceRevealVariants(
          shouldReduceMotion,
          motionTuning.deepContentDistance,
          'dashboard'
        )}
      >
        <Card padding={false}>
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <EmptyState
              icon={<Shield className="w-8 h-8" />}
              title="No team members yet"
              description={
                canManage
                  ? 'Invite your first teammate to start delegating sales, inventory, and reporting workflows.'
                  : 'Your organization admin has not invited any additional members yet.'
              }
              action={
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {canManage && (
                    <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowInvite(true)}>
                      Invite team member
                    </Button>
                  )}
                  <Link to="/settings/billing">
                    <Button variant="outline">View seat limits</Button>
                  </Link>
                </div>
              }
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {members.map((member) => {
                const isYou = member._id === currentUser?._id;
                const isOwner = member.role === UserRole.ORG_OWNER;
                const isPendingInvite = !member.isActive && !member.lastLogin;
                return (
                  <div
                    key={member._id}
                    className={cn(
                      'px-5 py-4 flex items-center gap-4',
                      !member.isActive && 'opacity-50'
                    )}
                  >
                    <div className="relative">
                      <Avatar name={member.name} size="md" />
                      {!member.isActive && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-slate-300 border-2 border-white" />
                      )}
                      {member.isActive && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-white" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{member.name}</p>
                        {isYou && (
                          <span className="text-xs text-primary-600 font-medium">(you)</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{member.email}</p>
                      {member.lastLogin && (
                        <p className="text-xs text-slate-400">
                          Last seen {getRelativeTime(member.lastLogin)}
                        </p>
                      )}
                      {!member.isActive && !member.lastLogin && (
                        <p className="text-xs text-amber-500">Invitation pending</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          ROLE_COLORS[member.role] as
                            | 'default'
                            | 'info'
                            | 'warning'
                            | 'success'
                            | 'danger'
                            | 'purple'
                        }
                      >
                        {member.role}
                      </Badge>
                      {canManage && !isYou && !isOwner && member.isActive && (
                        <button
                          onClick={() => setRemoveId(member._id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors"
                          title="Remove member"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      )}
                      {canManage && !isYou && !isOwner && !member.isActive && !isPendingInvite && (
                        <button
                          onClick={() => handleReactivate(member._id)}
                          disabled={reactivatingId === member._id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                          title="Reactivate member"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          {reactivatingId === member._id ? 'Reactivating...' : 'Reactivate'}
                        </button>
                      )}
                      {isOwner && (
                        <span title="Organization Owner">
                          <Shield className="w-4 h-4 text-primary-400" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </m.div>

      {/* Invite modal */}
      <Modal
        open={showInvite}
        onClose={() => {
          setShowInvite(false);
          reset();
        }}
        title="Invite Team Member"
        size="sm"
        footer={
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowInvite(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button form="invite-form" type="submit" loading={inviteMember.isPending}>
              Send Invitation
            </Button>
          </div>
        }
      >
        <form id="invite-form" onSubmit={handleSubmit(onInvite)} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            required
            placeholder="colleague@example.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Select
            label="Role"
            required
            options={[
              { value: UserRole.ORG_ADMIN, label: 'Admin — Inventory, sales, reports' },
              { value: UserRole.CASHIER, label: 'Cashier — POS sales only' },
              { value: UserRole.ACCOUNTANT, label: 'Accountant — Invoices & reports' },
              { value: UserRole.VIEWER, label: 'Viewer — Read-only' },
            ]}
            error={errors.role?.message}
            {...register('role')}
          />
          <p className="text-xs text-slate-400">
            An invitation email will be sent. The link expires in 48 hours.
          </p>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!removeId}
        onClose={() => setRemoveId(null)}
        onConfirm={handleRemove}
        title="Remove Team Member"
        description="This will deactivate the member's access immediately. They will no longer be able to log in."
        confirmLabel="Remove Member"
        loading={removing}
      />
    </m.div>
  );
}
