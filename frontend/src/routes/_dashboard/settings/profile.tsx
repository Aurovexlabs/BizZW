import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useReducedMotion } from 'framer-motion';
import { Camera, ExternalLink, ListChecks, Lock, Save, Sparkles } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  getDashboardSettingsMotionTuning,
  m,
  staggerContainer,
  surfaceRevealVariants,
} from '../../../components/motion/AppMotion';
import { Avatar, Button, Card, Input } from '../../../components/ui';
import { useUpdateProfile } from '../../../hooks/useApi';
import { api } from '../../../lib/api';
import { buildImageUrl, uploadImageToImageKit } from '../../../lib/imagekit';
import { useAuthStore } from '../../../store/auth.store';

export const Route = createFileRoute('/_dashboard/settings/profile')({
  component: ProfileSettingsPage,
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Required'),
    newPassword: z.string().min(8, 'Min 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });
type PasswordForm = z.infer<typeof passwordSchema>;

function ProfileSettingsPage() {
  const { user, tenant, updateUser } = useAuthStore();
  const shouldReduceMotion = useReducedMotion() ?? false;
  const motionTuning = getDashboardSettingsMotionTuning('profile', shouldReduceMotion);
  const updateProfile = useUpdateProfile();
  const [name, setName] = useState(user?.name || '');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const avatarUrl = user?.avatar?.filePath
    ? buildImageUrl(user.avatar.filePath, { width: 100, height: 100 })
    : undefined;
  const normalizedName = name.trim();
  const currentName = (user?.name || '').trim();
  const canSaveName =
    normalizedName.length > 0 && normalizedName !== currentName && !updateProfile.isPending;

  function handleAvatarSuccess(res: { fileId: string; filePath: string }) {
    setUploading(false);
    updateProfile.mutate(
      { avatar: { fileId: res.fileId, filePath: res.filePath } },
      { onSuccess: (updated) => updateUser({ avatar: updated.avatar }) }
    );
  }

  async function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!tenant?.orgId) {
      toast.error('Unable to upload avatar right now. Missing organization context.');
      e.target.value = '';
      return;
    }

    try {
      setUploading(true);
      const uploaded = await uploadImageToImageKit(file, {
        fileName: `avatar-${user?._id}-${Date.now()}`,
        folder: `/bizZW/${tenant.orgId}/avatars`,
        useUniqueFileName: true,
      });
      handleAvatarSuccess({ fileId: uploaded.fileId, filePath: uploaded.filePath });
    } catch {
      setUploading(false);
      toast.error('Upload failed');
    } finally {
      e.target.value = '';
    }
  }

  function saveName() {
    if (!canSaveName) {
      return;
    }

    updateProfile.mutate(
      { name: normalizedName },
      {
        onSuccess: (updated) => updateUser({ name: updated.name }),
      }
    );
  }

  async function changePassword(data: PasswordForm) {
    try {
      await api.patch('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success('Password changed successfully');
      reset();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Failed to change password');
    }
  }

  return (
    <m.div
      className="p-6 max-w-2xl mx-auto space-y-6"
      initial="hidden"
      animate="visible"
      variants={staggerContainer(motionTuning.staggerChildren, motionTuning.delayChildren)}
    >
      <m.div
        variants={surfaceRevealVariants(shouldReduceMotion, motionTuning.heroDistance, 'dashboard')}
      >
        <h1 className="text-2xl font-bold text-slate-900">Profile Settings</h1>
        <p className="text-sm text-slate-500">Manage your account details</p>
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
            Navigate identity, access, and account controls quickly.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Link to="/settings/business" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                Open business profile
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link to="/settings/team" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                Team access
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link to="/settings/billing" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                Review billing plan
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link to="/help" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                Open security guide
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
              'Update your profile photo and name for clean audit attribution.',
              'Review role and team permissions before sharing account ownership.',
              'Set a strong password and rotate it periodically.',
              'Verify billing and business profile details after major changes.',
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

      {/* Avatar */}
      <m.div
        variants={surfaceRevealVariants(
          shouldReduceMotion,
          motionTuning.contentDistance,
          'dashboard'
        )}
      >
        <Card>
          <h2 className="font-semibold text-slate-900 mb-4">Profile Photo</h2>
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar name={user?.name || 'U'} src={avatarUrl} size="xl" />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary-700 text-white rounded-full flex items-center justify-center hover:bg-primary-600 transition-colors shadow-lg"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">{user?.name}</p>
              <p className="text-sm text-slate-500 mb-3">{user?.role}</p>
              {uploading && <p className="text-xs text-primary-600">Uploading…</p>}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarFileChange}
            />
          </div>
        </Card>
      </m.div>

      {/* Name */}
      <m.div
        variants={surfaceRevealVariants(
          shouldReduceMotion,
          motionTuning.contentDistance,
          'dashboard'
        )}
      >
        <Card>
          <h2 className="font-semibold text-slate-900 mb-4">Personal Information</h2>
          <div className="space-y-4">
            <Input label="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Email" value={user?.email} disabled hint="Email cannot be changed" />
            <Input label="Role" value={user?.role} disabled />
            <Button
              onClick={saveName}
              loading={updateProfile.isPending}
              disabled={!canSaveName}
              icon={<Save className="w-4 h-4" />}
            >
              Save Changes
            </Button>
          </div>
        </Card>
      </m.div>

      {/* Password */}
      <m.div
        variants={surfaceRevealVariants(
          shouldReduceMotion,
          motionTuning.deepContentDistance,
          'dashboard'
        )}
      >
        <Card>
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-400" /> Change Password
          </h2>
          <form onSubmit={handleSubmit(changePassword)} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              required
              error={errors.currentPassword?.message}
              {...register('currentPassword')}
            />
            <Input
              label="New Password"
              type="password"
              required
              hint="Minimum 8 characters"
              error={errors.newPassword?.message}
              {...register('newPassword')}
            />
            <Input
              label="Confirm New Password"
              type="password"
              required
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
            <Button type="submit" loading={isSubmitting}>
              Update Password
            </Button>
          </form>
        </Card>
      </m.div>
    </m.div>
  );
}
