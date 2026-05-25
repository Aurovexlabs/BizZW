import { Image as IKImage } from '@imagekit/react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useReducedMotion } from 'framer-motion';
import { Building2, ExternalLink, ListChecks, Save, Sparkles, Upload } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  getDashboardSettingsMotionTuning,
  m,
  staggerContainer,
  surfaceRevealVariants,
} from '../../../components/motion/AppMotion';
import { Button, Card, Input, Select } from '../../../components/ui';
import { useUpdateBusinessSettings } from '../../../hooks/useApi';
import { LOGO_TR, uploadImageToImageKit } from '../../../lib/imagekit';
import { Currency } from '../../../shared/types';
import { useAuthStore } from '../../../store/auth.store';

export const Route = createFileRoute('/_dashboard/settings/business')({
  component: BusinessSettingsPage,
});

interface BusinessSettingsForm {
  currency: Currency;
  taxRate: number;
  businessType: string;
  address: string;
  phone: string;
  timezone: string;
}

function BusinessSettingsPage() {
  const { tenant, updateTenant } = useAuthStore();
  const shouldReduceMotion = useReducedMotion() ?? false;
  const motionTuning = getDashboardSettingsMotionTuning('business', shouldReduceMotion);
  const updateSettings = useUpdateBusinessSettings();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { isDirty },
  } = useForm<BusinessSettingsForm>({
    defaultValues: {
      currency: tenant?.settings?.currency || Currency.USD,
      taxRate: tenant?.settings?.taxRate ?? 15,
      businessType: tenant?.settings?.businessType || 'retail',
      address: tenant?.settings?.address || '',
      phone: tenant?.settings?.phone || '',
      timezone: tenant?.settings?.timezone || 'Africa/Harare',
    },
  });

  function onSubmit(data: BusinessSettingsForm) {
    if (!tenant) {
      toast.error('Unable to update business settings right now.');
      return;
    }

    updateSettings.mutate(data, {
      onSuccess: () => updateTenant({ settings: { ...tenant.settings, ...data } }),
    });
  }

  function handleLogoSuccess(res: { fileId: string; filePath: string }) {
    if (!tenant) {
      setUploading(false);
      return;
    }

    setUploading(false);
    updateSettings.mutate(
      { logo: { fileId: res.fileId, filePath: res.filePath } },
      {
        onSuccess: () => {
          updateTenant({ settings: { ...tenant.settings, logo: res } });
          toast.success('Logo updated');
        },
      }
    );
  }

  async function handleLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!tenant?.orgId) {
      toast.error('Unable to upload logo right now. Missing organization context.');
      e.target.value = '';
      return;
    }

    try {
      setUploading(true);
      const uploaded = await uploadImageToImageKit(file, {
        fileName: `logo-${tenant?.orgId}-${Date.now()}`,
        folder: `/bizZW/${tenant?.orgId}/logos`,
        useUniqueFileName: true,
      });
      handleLogoSuccess({ fileId: uploaded.fileId, filePath: uploaded.filePath });
    } catch {
      setUploading(false);
      toast.error('Logo upload failed');
    } finally {
      e.target.value = '';
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
        <h1 className="text-2xl font-bold text-slate-900">Business Settings</h1>
        <p className="text-sm text-slate-500">Configure your business details and preferences</p>
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
            Keep business identity, operations, and compliance settings aligned.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Link to="/settings/profile" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                Open owner profile
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link to="/settings/branches" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                Manage branches
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
                Business setup guide
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
              'Upload your logo and verify brand visibility on invoices and receipts.',
              'Confirm address, phone, and business type for operational accuracy.',
              'Validate currency, tax, and timezone before month-end reporting.',
              'Review destructive-account actions with internal approval controls.',
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

      {/* Logo */}
      <m.div
        variants={surfaceRevealVariants(
          shouldReduceMotion,
          motionTuning.contentDistance,
          'dashboard'
        )}
      >
        <Card>
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" /> Business Logo
          </h2>
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50">
              {tenant?.settings?.logo?.filePath ? (
                <IKImage
                  src={tenant.settings.logo.filePath}
                  transformation={LOGO_TR}
                  className="w-full h-full object-contain"
                  alt="Business logo"
                />
              ) : (
                <Building2 className="w-8 h-8 text-slate-300" />
              )}
            </div>
            <div>
              <Button
                variant="outline"
                size="sm"
                icon={<Upload className="w-4 h-4" />}
                loading={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? 'Uploading…' : 'Upload Logo'}
              </Button>
              <p className="text-xs text-slate-400 mt-1">PNG, JPG or WebP, max 10MB</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleLogoFileChange}
            />
          </div>
        </Card>
      </m.div>

      {/* Business info */}
      <m.div
        variants={surfaceRevealVariants(
          shouldReduceMotion,
          motionTuning.contentDistance,
          'dashboard'
        )}
      >
        <Card>
          <h2 className="font-semibold text-slate-900 mb-4">Business Information</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Business Name"
              value={tenant?.name || ''}
              disabled
              hint="Contact support to change your business name"
            />

            <Select
              label="Business Type"
              options={[
                { value: 'retail', label: 'Retail' },
                { value: 'wholesale', label: 'Wholesale' },
                { value: 'restaurant', label: 'Restaurant / Food' },
                { value: 'service', label: 'Services' },
                { value: 'manufacturing', label: 'Manufacturing' },
                { value: 'other', label: 'Other' },
              ]}
              {...register('businessType')}
            />

            <Input
              label="Business Address"
              placeholder="123 Samora Machel Ave, Harare"
              {...register('address')}
            />
            <Input label="Business Phone" placeholder="+263 77 123 4567" {...register('phone')} />

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Default Currency"
                options={[
                  { value: Currency.USD, label: 'USD ($)' },
                  { value: Currency.ZIG, label: 'Zimbabwe Gold (ZiG)' },
                ]}
                {...register('currency')}
              />
              <Input
                label="VAT/Tax Rate (%)"
                type="number"
                step="0.1"
                min="0"
                max="100"
                hint="Zimbabwe standard: 15%"
                {...register('taxRate')}
              />
            </div>

            <Select
              label="Timezone"
              options={[
                { value: 'Africa/Harare', label: 'Africa/Harare (CAT)' },
                { value: 'Africa/Johannesburg', label: 'Africa/Johannesburg (SAST)' },
                { value: 'UTC', label: 'UTC' },
              ]}
              {...register('timezone')}
            />

            <div className="pt-2">
              <Button
                type="submit"
                loading={updateSettings.isPending}
                disabled={!isDirty}
                icon={<Save className="w-4 h-4" />}
              >
                Save Settings
              </Button>
            </div>
          </form>
        </Card>
      </m.div>

      {/* Danger zone */}
      <m.div
        variants={surfaceRevealVariants(
          shouldReduceMotion,
          motionTuning.deepContentDistance,
          'dashboard'
        )}
      >
        <Card>
          <h2 className="font-semibold text-red-600 mb-2">Danger Zone</h2>
          <p className="text-sm text-slate-500 mb-4">
            These actions are irreversible. Please proceed with caution.
          </p>
          <Button
            variant="danger"
            size="sm"
            onClick={() => toast.error('Contact support to delete your account')}
          >
            Delete business account
          </Button>
        </Card>
      </m.div>
    </m.div>
  );
}
