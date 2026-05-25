import { createFileRoute } from '@tanstack/react-router';
import { Activity, AlertTriangle, Brain, Package, TrendingUp, Zap } from 'lucide-react';
import { useRef, useState } from 'react';
import { Badge, Button, Card } from '../../components/ui';
import { cn } from '../../lib/cn';
import { getRuntimeConfig } from '../../lib/runtime-config';
import { PlanType } from '../../shared/types';
import { useAuthStore } from '../../store/auth.store';

export const Route = createFileRoute('/_dashboard/ai')({
  component: AIInsightsPage,
});

type AIMode = 'forecast' | 'restock' | 'insights' | 'anomalies';

const AI_MODES = [
  {
    key: 'forecast' as AIMode,
    label: '30-Day Forecast',
    icon: TrendingUp,
    description: 'Revenue predictions with best/worst case scenarios',
    color: 'from-blue-500 to-primary-700',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-700',
  },
  {
    key: 'restock' as AIMode,
    label: 'Restock Advisor',
    icon: Package,
    description: 'Smart reorder recommendations based on sales velocity',
    color: 'from-accent-500 to-accent-700',
    bgLight: 'bg-green-50',
    textColor: 'text-green-700',
  },
  {
    key: 'insights' as AIMode,
    label: 'Business Health',
    icon: Brain,
    description: 'Plain-English health score and action items',
    color: 'from-purple-500 to-purple-700',
    bgLight: 'bg-purple-50',
    textColor: 'text-purple-700',
  },
  {
    key: 'anomalies' as AIMode,
    label: 'Anomaly Detection',
    icon: Activity,
    description: 'Detect unusual patterns in sales and expenses',
    color: 'from-red-400 to-rose-600',
    bgLight: 'bg-red-50',
    textColor: 'text-red-700',
  },
];

function AIInsightsPage() {
  const { tenant } = useAuthStore();
  const isPaidPlan = tenant?.plan !== PlanType.STARTER;

  const [activeMode, setActiveMode] = useState<AIMode>('insights');
  const [streaming, setStreaming] = useState(false);
  const [content, setContent] = useState('');
  const [hasGenerated, setHasGenerated] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function generate() {
    if (streaming) {
      abortRef.current?.abort();
      setStreaming(false);
      return;
    }

    setContent('');
    setStreaming(true);
    setHasGenerated(true);

    abortRef.current = new AbortController();

    try {
      const token = useAuthStore.getState().accessToken;
      const runtimeConfig = getRuntimeConfig();
      const response = await fetch(
        `${runtimeConfig.apiBaseUrl}${runtimeConfig.apiVersionPath}/ai/${activeMode}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'text/event-stream',
            'Content-Type': 'application/json',
          },
          signal: abortRef.current.signal,
        }
      );

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.chunk) setContent((c) => c + parsed.chunk);
              if (parsed.done) setStreaming(false);
              if (parsed.error) {
                setContent(parsed.error);
                setStreaming(false);
              }
            } catch {
              continue;
            }
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        setContent('Failed to connect to AI. Please check your plan and try again.');
      }
    } finally {
      setStreaming(false);
    }
  }

  const activeConfig = AI_MODES.find((m) => m.key === activeMode)!;

  // Format markdown-like content for display
  function renderContent(text: string) {
    return text
      .split('\n')
      .map((line, i) => {
        if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold text-slate-900 mt-4 mb-2">{line.slice(2)}</h1>;
        if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold text-slate-900 mt-3 mb-1">{line.slice(3)}</h2>;
        if (line.startsWith('### ')) return <h3 key={i} className="text-base font-semibold text-slate-800 mt-2 mb-1">{line.slice(4)}</h3>;
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={i} className="font-bold text-slate-900 mt-2">{line.slice(2, -2)}</p>;
        }
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return <li key={i} className="ml-4 text-slate-700 text-sm">{line.slice(2)}</li>;
        }
        if (line.match(/^\d+\./)) {
          return <li key={i} className="ml-4 text-slate-700 text-sm list-decimal">{line.replace(/^\d+\.\s/, '')}</li>;
        }
        if (line === '') return <br key={i} />;
        return <p key={i} className="text-slate-700 text-sm leading-relaxed">{line}</p>;
      });
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary-700" /> AI Insights
          </h1>
          <p className="text-sm text-slate-500 mt-1">Powered by Google Gemini 1.5 Flash</p>
        </div>
        {isPaidPlan ? (
          <Badge variant="success">Active — {tenant?.plan} plan</Badge>
        ) : (
          <Badge variant="warning">Upgrade required</Badge>
        )}
      </div>

      {/* Upgrade banner for Starter plan */}
      {!isPaidPlan && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900">AI features require Growth plan or higher</h3>
            <p className="text-sm text-amber-700 mt-1">
              Upgrade to Growth ($9/month) to unlock AI-powered forecasts, restock recommendations, business insights, and anomaly detection.
            </p>
            <a href="/settings/billing" className="inline-flex items-center gap-2 mt-3 bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-700">
              <Zap className="w-4 h-4" /> Upgrade now
            </a>
          </div>
        </div>
      )}

      {/* Mode selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {AI_MODES.map((mode) => (
          <button
            key={mode.key}
            onClick={() => { setActiveMode(mode.key); setContent(''); setHasGenerated(false); }}
            disabled={!isPaidPlan}
            className={cn(
              'text-left p-4 rounded-xl border-2 transition-all duration-150',
              activeMode === mode.key
                ? 'border-primary-600 bg-primary-50 shadow-md'
                : 'border-slate-200 bg-white hover:border-slate-300',
              !isPaidPlan && 'opacity-50 cursor-not-allowed'
            )}
          >
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', mode.bgLight)}>
              <mode.icon className={cn('w-5 h-5', mode.textColor)} />
            </div>
            <p className="font-semibold text-sm text-slate-900">{mode.label}</p>
            <p className="text-xs text-slate-500 mt-1 leading-tight">{mode.description}</p>
          </button>
        ))}
      </div>

      {/* Generate button */}
      <div className="flex items-center gap-4">
        <Button
          onClick={generate}
          disabled={!isPaidPlan}
          loading={false}
          icon={streaming ? undefined : <activeConfig.icon className="w-4 h-4" />}
          size="lg"
          variant={streaming ? 'danger' : 'primary'}
        >
          {streaming ? 'Stop Generating' : `Generate ${activeConfig.label}`}
        </Button>
        {hasGenerated && !streaming && (
          <p className="text-xs text-slate-400">Click Generate to refresh</p>
        )}
      </div>

      {/* Output */}
      {(hasGenerated || streaming) && (
        <Card>
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', activeConfig.bgLight)}>
              <activeConfig.icon className={cn('w-5 h-5', activeConfig.textColor)} />
            </div>
            <div>
              <p className="font-semibold text-slate-900">{activeConfig.label}</p>
              <p className="text-xs text-slate-400">{streaming ? 'Generating...' : 'Analysis complete'}</p>
            </div>
            {streaming && (
              <div className="ml-auto flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="w-1.5 h-1.5 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            )}
          </div>

          <div className="prose prose-sm max-w-none">
            {content ? (
              <div className={cn(streaming && 'cursor-blink')}>
                {renderContent(content)}
              </div>
            ) : (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {!hasGenerated && isPaidPlan && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-linear-to-br from-primary-100 to-accent-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Brain className="w-8 h-8 text-primary-700" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-2">Your AI Business Advisor</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Select an analysis type above and click Generate to get instant AI-powered insights from your business data.
          </p>
        </div>
      )}
    </div>
  );
}
