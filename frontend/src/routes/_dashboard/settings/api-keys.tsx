import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useReducedMotion } from 'framer-motion';
import { Copy, ExternalLink, Key, ListChecks, Plus, Power, Sparkles, Trash2 } from 'lucide-react';
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
import { Button, Card, ConfirmDialog, Input, Modal } from '../../../components/ui';
import {
  useApiKeys,
  useCreateApiKey,
  useDeactivateApiKey,
  useDeleteApiKey,
} from '../../../hooks/useApi';
import { getRuntimeConfig } from '../../../lib/runtime-config';
import { IApiKey } from '../../../shared/types';

export const Route = createFileRoute('/_dashboard/settings/api-keys')({
  component: ApiKeysPage,
});

const API_PERMISSIONS = [
  { key: 'inventory:read', label: 'Read Inventory', description: 'View products and stock levels' },
  { key: 'inventory:write', label: 'Write Inventory', description: 'Create and update products' },
  { key: 'sales:read', label: 'Read Sales', description: 'View sales history' },
  { key: 'sales:write', label: 'Create Sales', description: 'Process POS transactions' },
  { key: 'invoices:read', label: 'Read Invoices', description: 'View invoices and status' },
  { key: 'invoices:write', label: 'Write Invoices', description: 'Create and update invoices' },
  { key: 'customers:read', label: 'Read Customers', description: 'View customer profiles' },
  { key: 'customers:write', label: 'Write Customers', description: 'Create and update customers' },
  { key: 'reports:read', label: 'Read Reports', description: 'Access analytics and reports' },
  { key: 'expenses:read', label: 'Read Expenses', description: 'View expense records' },
  { key: 'expenses:write', label: 'Write Expenses', description: 'Create expense records' },
];

const schema = z.object({
  name: z.string().min(1, 'Name required').max(100),
  permissions: z.array(z.string()).min(1, 'Select at least one permission'),
  expiresInDays: z.coerce.number().int().positive().optional(),
  neverExpires: z.boolean().default(true),
});

type ApiKeyForm = z.infer<typeof schema>;

function ApiKeysPage() {
  const runtimeConfig = getRuntimeConfig();
  const shouldReduceMotion = useReducedMotion() ?? false;
  const motionTuning = getDashboardSettingsMotionTuning('api-keys', shouldReduceMotion);
  const apiBaseUrl = `${runtimeConfig.apiBaseUrl}${runtimeConfig.apiVersionPath}`;

  const { data: keys = [], isLoading } = useApiKeys();
  const createKey = useCreateApiKey();
  const deactivateKey = useDeactivateApiKey();
  const deleteKey = useDeleteApiKey();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<{ key: string; name: string } | null>(null);
  const keyList = keys as IApiKey[];

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ApiKeyForm>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', permissions: [] as string[], neverExpires: true },
  });

  const selectedPerms = watch('permissions') as string[];
  const neverExpires = watch('neverExpires');

  const togglePerm = (perm: string) => {
    setValue(
      'permissions',
      selectedPerms.includes(perm)
        ? selectedPerms.filter((p) => p !== perm)
        : [...selectedPerms, perm]
    );
  };

  const selectAll = () =>
    setValue(
      'permissions',
      API_PERMISSIONS.map((p) => p.key)
    );
  const clearAll = () => setValue('permissions', []);

  const onSubmit = (data: {
    name: string;
    permissions: string[];
    expiresInDays?: number;
    neverExpires?: boolean;
  }) => {
    createKey.mutate(
      {
        name: data.name,
        permissions: data.permissions,
        ...(!data.neverExpires && data.expiresInDays ? { expiresInDays: data.expiresInDays } : {}),
      },
      {
        onSuccess: (result) => {
          setShowCreate(false);
          reset();
          if ((result as { key?: string }).key) {
            setNewKey({ key: (result as { key: string }).key, name: data.name });
          }
        },
      }
    );
  };

  function copyBaseUrl() {
    navigator.clipboard.writeText(apiBaseUrl);
    toast.success('Base URL copied');
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
          <div className="flex items-center gap-2 mb-1">
            <Key className="w-5 h-5 text-primary-700" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">API Keys</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Create keys for external integrations. Keys are scoped to specific permissions.
          </p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
          Create API Key
        </Button>
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
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Launch integration work from one place and reduce setup mistakes.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={copyBaseUrl}
              className="inline-flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Copy API base URL
              <Copy className="h-3.5 w-3.5" />
            </button>
            <Link to="/settings/webhooks" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                Manage webhooks
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link to="/settings/audit" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                Review audit trail
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link to="/help" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                Open API guide
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </Card>

        <Card>
          <h2 className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
            <ListChecks className="h-3.5 w-3.5" /> Example workflow
          </h2>
          <ol className="mt-3 space-y-2">
            {[
              'Create a key with only the minimum required permissions.',
              'Store the secret in your integration vault, never in source control.',
              'Run a small read-only API check to validate connectivity and scope.',
              'Monitor usage in Audit Log and rotate keys on a fixed schedule.',
            ].map((step, index) => (
              <li
                key={step}
                className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"
              >
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </Card>
      </m.div>

      <m.div
        variants={surfaceRevealVariants(
          shouldReduceMotion,
          motionTuning.contentDistance,
          'dashboard'
        )}
      >
        <Card className="border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
            Authenticate with Bearer token:
          </p>
          <code className="font-mono text-sm text-emerald-700 dark:text-green-400">
            Authorization: Bearer bz_live_...
          </code>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Base URL: <code className="text-slate-700 dark:text-slate-300">{apiBaseUrl}</code>
          </p>
        </Card>
      </m.div>

      {/* Keys list */}
      <m.div
        variants={surfaceRevealVariants(
          shouldReduceMotion,
          motionTuning.deepContentDistance,
          'dashboard'
        )}
      >
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-xl bg-slate-100 animate-pulse dark:bg-slate-800"
              />
            ))}
          </div>
        ) : keyList.length === 0 ? (
          <Card>
            <div className="text-center py-10">
              <Key className="mx-auto mb-3 h-10 w-10 text-slate-200 dark:text-slate-700" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-300">
                No API keys yet
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Create a key to authenticate external systems and keep access tightly scoped.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <Button
                  size="sm"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => setShowCreate(true)}
                >
                  Create your first key
                </Button>
                <Link to="/settings/webhooks">
                  <Button variant="outline" size="sm">
                    Configure webhooks
                  </Button>
                </Link>
              </div>
              <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
                Tip: use separate keys per integration for safer revocation.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {keyList.map((k) => (
              <Card key={k._id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{k.name}</p>
                      {k.isActive ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                          Inactive
                        </span>
                      )}
                      {k.expiresAt && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${new Date(k.expiresAt) < new Date() ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}
                        >
                          Expires {new Date(k.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <code className="font-mono text-sm text-slate-500 dark:text-slate-400">
                      {k.keyPrefix}••••••••••••••••
                    </code>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {k.permissions.slice(0, 4).map((p) => (
                        <span
                          key={p}
                          className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/25 dark:text-blue-300"
                        >
                          {p}
                        </span>
                      ))}
                      {k.permissions.length > 4 && (
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          +{k.permissions.length - 4} more
                        </span>
                      )}
                    </div>
                    {k.lastUsed && (
                      <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                        Last used: {new Date(k.lastUsed).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {k.isActive && (
                      <button
                        onClick={() => deactivateKey.mutate(k._id)}
                        title="Deactivate"
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-600 dark:text-slate-500 dark:hover:bg-amber-900/20 dark:hover:text-amber-300"
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteId(k._id)}
                      title="Delete"
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-slate-500 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </m.div>

      {/* Create Modal */}
      <Modal
        open={showCreate}
        onClose={() => {
          setShowCreate(false);
          reset();
        }}
        title="Create API Key"
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input
            label="Key Name"
            placeholder="e.g. Zapier Integration"
            {...register('name')}
            error={errors.name?.message}
          />

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Permissions
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs text-primary-700 hover:text-primary-900 dark:text-primary-300 dark:hover:text-primary-200"
                >
                  Select all
                </button>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
              {API_PERMISSIONS.map(({ key, label, description }) => (
                <label
                  key={key}
                  className={`flex items-start gap-2.5 rounded-lg border p-2.5 transition-colors ${selectedPerms.includes(key) ? 'border-primary-300 bg-primary-50 dark:border-primary-700 dark:bg-primary-900/20' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedPerms.includes(key)}
                    onChange={() => togglePerm(key)}
                    className="mt-0.5 rounded border-slate-300 text-primary-700"
                  />
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {label}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{description}</p>
                  </div>
                </label>
              ))}
            </div>
            {errors.permissions && (
              <p className="text-xs text-red-500 mt-1">{errors.permissions.message}</p>
            )}
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                {...register('neverExpires')}
                className="rounded border-slate-300 text-primary-700"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Never expires
              </span>
            </label>
            {!neverExpires && (
              <div className="mt-2">
                <Input
                  label="Expires in (days)"
                  type="number"
                  placeholder="90"
                  {...register('expiresInDays')}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCreate(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={createKey.isPending} icon={<Key className="w-4 h-4" />}>
              Create Key
            </Button>
          </div>
        </form>
      </Modal>

      {/* Key reveal */}
      {newKey && (
        <Modal open={!!newKey} onClose={() => setNewKey(null)} title="Your New API Key">
          <div className="space-y-4">
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/15 dark:text-amber-300">
              ⚠️ Copy this key now — it will <strong>never be shown again</strong>.
            </p>
            <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-900">
              <code className="flex-1 break-all font-mono text-sm text-emerald-700 dark:text-green-400">
                {newKey.key}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(newKey.key);
                  toast.success('Copied!');
                }}
                className="shrink-0 p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <Button onClick={() => setNewKey(null)} className="w-full">
              I've saved my key
            </Button>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          deleteKey.mutate(deleteId!);
          setDeleteId(null);
        }}
        title="Delete API Key"
        description="This will permanently revoke this key. Any integrations using it will stop working."
        confirmLabel="Delete Key"
      />
    </m.div>
  );
}
