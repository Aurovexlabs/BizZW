import { useReducedMotion } from 'framer-motion';
import {
  CheckCircle,
  Copy,
  ExternalLink,
  Globe,
  ListChecks,
  Plus,
  Sparkles,
  Trash2,
  XCircle,
  Zap,
} from 'lucide-react';
import { Button, Card, ConfirmDialog, Input, Modal } from '../../../components/ui';
import {
  useCreateWebhook,
  useDeleteWebhook,
  useTestWebhook,
  useWebhooks,
} from '../../../hooks/useApi';
import { IWebhook, WebhookEvent } from '../../../shared/types';

import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute, Link } from '@tanstack/react-router';
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

export const Route = createFileRoute('/_dashboard/settings/webhooks')({
  component: WebhooksPage,
});

const EVENT_LABELS: Record<string, string> = {
  [WebhookEvent.SALE_CREATED]: 'Sale Created',
  [WebhookEvent.INVOICE_PAID]: 'Invoice Paid',
  [WebhookEvent.INVOICE_CREATED]: 'Invoice Created',
  [WebhookEvent.CUSTOMER_CREATED]: 'Customer Created',
  [WebhookEvent.PRODUCT_LOW_STOCK]: 'Product Low Stock',
  [WebhookEvent.PAYMENT_RECEIVED]: 'Payment Received',
};

const schema = z.object({
  url: z.string().url('Enter a valid URL'),
  events: z.array(z.string()).min(1, 'Select at least one event'),
});

function WebhooksPage() {
  const { data: webhooks = [], isLoading } = useWebhooks();
  const shouldReduceMotion = useReducedMotion() ?? false;
  const motionTuning = getDashboardSettingsMotionTuning('webhooks', shouldReduceMotion);
  const createWebhook = useCreateWebhook();
  const deleteWebhook = useDeleteWebhook();
  const testWebhook = useTestWebhook();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<{ key: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { url: '', events: [] as string[] },
  });

  const selectedEvents = watch('events') as string[];

  const toggleEvent = (event: string) => {
    const current = selectedEvents;
    setValue(
      'events',
      current.includes(event) ? current.filter((e) => e !== event) : [...current, event]
    );
  };

  const onSubmit = (data: { url: string; events: string[] }) => {
    createWebhook.mutate(data, {
      onSuccess: (result) => {
        setShowCreate(false);
        reset();
        const secret = (result as unknown as { secret?: string }).secret;
        if (secret) {
          setNewKey({ key: secret });
        }
      },
    });
  };

  const handleTestWebhook = async (id: string) => {
    setTestingId(id);
    try {
      await testWebhook.mutateAsync(id);
    } finally {
      setTestingId(null);
    }
  };

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
            <Zap className="w-5 h-5 text-primary-700" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Webhooks</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Send real-time events to external services when things happen in BizZW.
          </p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
          Add webhook
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
        <Card className="border-primary-100 bg-primary-50/40 dark:border-primary-900/40 dark:bg-primary-900/20">
          <h2 className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary-800 dark:text-primary-200">
            <Sparkles className="h-3.5 w-3.5" /> Quick actions
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Keep event delivery, integration secrets, and audit visibility coordinated.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Link to="/settings/api-keys" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                Manage API keys
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link to="/settings/audit" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                Review delivery audit
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link to="/settings/team" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                Manage notification owners
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link to="/help" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                Open webhook guide
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
              'Register an endpoint and store the generated secret securely.',
              'Subscribe only to events required by your integration contract.',
              'Send a test event, then verify signature validation in your receiver.',
              'Monitor failures and retry trends in audit logs each week.',
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

      {/* How it works */}
      <m.div
        variants={surfaceRevealVariants(
          shouldReduceMotion,
          motionTuning.contentDistance,
          'dashboard'
        )}
      >
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-900/20">
          <h3 className="mb-2 text-sm font-semibold text-blue-900 dark:text-blue-200">
            How webhooks work
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            When an event occurs, BizZW sends an HTTP POST to your URL with a JSON payload and an
            HMAC-SHA256 signature header (
            <code className="rounded bg-blue-100 px-1 font-mono text-xs dark:bg-blue-900/40">
              X-BizZW-Signature
            </code>
            ). Verify this signature to ensure authenticity.
          </p>
        </Card>
      </m.div>

      {/* Webhook list */}
      <m.div
        variants={surfaceRevealVariants(
          shouldReduceMotion,
          motionTuning.deepContentDistance,
          'dashboard'
        )}
      >
        {isLoading ? (
          <Card>
            <div className="animate-pulse space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-slate-100 dark:bg-slate-800" />
              ))}
            </div>
          </Card>
        ) : (webhooks as IWebhook[]).length === 0 ? (
          <Card>
            <div className="text-center py-10">
              <Globe className="mx-auto mb-3 h-10 w-10 text-slate-200 dark:text-slate-700" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-300">
                No webhooks yet
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Add your endpoint URL and choose events to start receiving real-time notifications.
              </p>
              <div className="mt-4">
                <Button
                  size="sm"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => setShowCreate(true)}
                >
                  Add first webhook
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {(webhooks as IWebhook[]).map((wh) => (
              <Card key={wh._id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <code className="truncate font-mono text-sm text-slate-800 dark:text-slate-200">
                        {wh.url}
                      </code>
                      {wh.isActive ? (
                        <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-300">
                          <CheckCircle className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-red-500 dark:text-red-300">
                          <XCircle className="w-3 h-3" />
                          Disabled
                        </span>
                      )}
                      {wh.failureCount > 0 && (
                        <span className="text-xs text-amber-600 dark:text-amber-300">
                          {wh.failureCount} failures
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {wh.events.map((e) => (
                        <span
                          key={e}
                          className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        >
                          {EVENT_LABELS[e] || e}
                        </span>
                      ))}
                    </div>
                    {wh.lastTriggered && (
                      <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                        Last triggered: {new Date(wh.lastTriggered).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleTestWebhook(wh._id)}
                      disabled={!wh.isActive || testWebhook.isPending}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-50 hover:text-primary-800 disabled:cursor-not-allowed disabled:opacity-50 dark:text-primary-300 dark:hover:bg-primary-900/30 dark:hover:text-primary-200"
                    >
                      {testingId === wh._id ? 'Testing...' : 'Send test'}
                    </button>
                    <button
                      onClick={() => setDeleteId(wh._id)}
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
        title="Add Webhook"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input
            label="Endpoint URL"
            placeholder="https://your-app.com/webhook"
            {...register('url')}
            error={errors.url?.message}
          />
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Events to subscribe
            </label>
            <div className="space-y-2">
              {Object.entries(EVENT_LABELS).map(([event, label]) => (
                <label
                  key={event}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(event)}
                    onChange={() => toggleEvent(event)}
                    className="rounded border-slate-300 text-primary-700"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {label}
                    </p>
                    <code className="text-xs text-slate-400 dark:text-slate-500">{event}</code>
                  </div>
                </label>
              ))}
            </div>
            {errors.events && <p className="text-xs text-red-500 mt-1">{errors.events.message}</p>}
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
            <Button type="submit" loading={createWebhook.isPending}>
              Create Webhook
            </Button>
          </div>
        </form>
      </Modal>

      {/* Secret reveal Modal */}
      {newKey && (
        <Modal
          open={!!newKey}
          onClose={() => setNewKey(null)}
          title="Webhook Secret — Save This Now"
        >
          <div className="space-y-4">
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/15 dark:text-amber-300">
              ⚠️ This secret will only be shown once. Save it now to verify webhook signatures.
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
                className="shrink-0 p-2 text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <Button onClick={() => setNewKey(null)} className="w-full">
              I've saved the secret
            </Button>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          deleteWebhook.mutate(deleteId!);
          setDeleteId(null);
        }}
        title="Delete Webhook"
        description="This will permanently delete this webhook. Events will no longer be sent to this endpoint."
        confirmLabel="Delete"
      />
    </m.div>
  );
}
