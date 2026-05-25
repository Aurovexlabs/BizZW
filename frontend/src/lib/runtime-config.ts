export interface RuntimeConfig {
  appName: string;
  apiBaseUrl: string;
  apiVersionPath: string;
  supportEmail: string;
  imagekitUrlEndpoint: string;
  imagekitPublicKey: string;
  sentryDsn: string;
  sentryTracesSampleRate: number;
  environment: string;
  generatedAt: string;
}

type RuntimeConfigListener = (config: RuntimeConfig) => void;

const listeners = new Set<RuntimeConfigListener>();

function normalizeApiBaseUrl(rawValue?: string): string {
  if (!rawValue) {
    return 'http://localhost:5000';
  }

  return rawValue.replace(/\/+$/, '');
}

function normalizeApiVersionPath(rawValue?: string): string {
  if (!rawValue) {
    return '/api/v1';
  }

  if (rawValue.startsWith('/')) {
    return rawValue;
  }

  return `/${rawValue}`;
}

function defaultApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL;
  if (fromEnv) {
    return normalizeApiBaseUrl(fromEnv);
  }

  if (typeof window === 'undefined') {
    return 'http://localhost:5000';
  }

  const { hostname, port, origin } = window.location;
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
  const isFrontendDevPort = port === '5173' || port === '4173' || port === '3000';

  if (isLocalHost && isFrontendDevPort) {
    return 'http://localhost:5000';
  }

  return normalizeApiBaseUrl(origin);
}

function defaultSentrySampleRate(): number {
  const parsed = Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || (import.meta.env.PROD ? '0.1' : '1'));
  return Number.isFinite(parsed) ? parsed : 0.1;
}

const fallbackConfig: RuntimeConfig = {
  appName: import.meta.env.VITE_APP_NAME || 'BizZW',
  apiBaseUrl: defaultApiBaseUrl(),
  apiVersionPath: '/api/v1',
  supportEmail: 'support@bizzw.co.zw',
  imagekitUrlEndpoint: import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT || '',
  imagekitPublicKey: import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY || '',
  sentryDsn: import.meta.env.VITE_SENTRY_DSN || '',
  sentryTracesSampleRate: defaultSentrySampleRate(),
  environment: import.meta.env.MODE,
  generatedAt: new Date().toISOString(),
};

let currentConfig: RuntimeConfig = fallbackConfig;
let initializePromise: Promise<RuntimeConfig> | null = null;

function emitConfigUpdate() {
  for (const listener of listeners) {
    listener(currentConfig);
  }
}

function applyRuntimeConfig(partial: Partial<RuntimeConfig>): RuntimeConfig {
  currentConfig = {
    ...currentConfig,
    ...partial,
    apiBaseUrl: normalizeApiBaseUrl(partial.apiBaseUrl || currentConfig.apiBaseUrl),
    apiVersionPath: normalizeApiVersionPath(partial.apiVersionPath || currentConfig.apiVersionPath),
    sentryTracesSampleRate: Number.isFinite(partial.sentryTracesSampleRate)
      ? Number(partial.sentryTracesSampleRate)
      : currentConfig.sentryTracesSampleRate,
  };

  emitConfigUpdate();
  return currentConfig;
}

function parseRuntimeConfigPayload(payload: unknown): Partial<RuntimeConfig> {
  const data = payload as {
    appName?: string;
    apiBaseUrl?: string;
    apiVersionPath?: string;
    supportEmail?: string;
    imagekit?: {
      urlEndpoint?: string;
      publicKey?: string;
    };
    sentry?: {
      dsn?: string;
      tracesSampleRate?: number;
    };
    environment?: string;
    generatedAt?: string;
  };

  return {
    appName: typeof data?.appName === 'string' ? data.appName : undefined,
    apiBaseUrl: typeof data?.apiBaseUrl === 'string' ? data.apiBaseUrl : undefined,
    apiVersionPath: typeof data?.apiVersionPath === 'string' ? data.apiVersionPath : undefined,
    supportEmail: typeof data?.supportEmail === 'string' ? data.supportEmail : undefined,
    imagekitUrlEndpoint:
      typeof data?.imagekit?.urlEndpoint === 'string' ? data.imagekit.urlEndpoint : undefined,
    imagekitPublicKey:
      typeof data?.imagekit?.publicKey === 'string' ? data.imagekit.publicKey : undefined,
    sentryDsn: typeof data?.sentry?.dsn === 'string' ? data.sentry.dsn : undefined,
    sentryTracesSampleRate:
      typeof data?.sentry?.tracesSampleRate === 'number' ? data.sentry.tracesSampleRate : undefined,
    environment: typeof data?.environment === 'string' ? data.environment : undefined,
    generatedAt: typeof data?.generatedAt === 'string' ? data.generatedAt : undefined,
  };
}

export function getRuntimeConfig(): RuntimeConfig {
  return currentConfig;
}

export function subscribeRuntimeConfig(listener: RuntimeConfigListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function initializeRuntimeConfig(): Promise<RuntimeConfig> {
  if (initializePromise) {
    return initializePromise;
  }

  initializePromise = (async () => {
    const bootstrapBaseUrl = normalizeApiBaseUrl(currentConfig.apiBaseUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4_000);

    try {
      const response = await fetch(`${bootstrapBaseUrl}/api/v1/public/runtime-config`, {
        method: 'GET',
        credentials: 'include',
        signal: controller.signal,
      });

      if (!response.ok) {
        return currentConfig;
      }

      const body = (await response.json()) as { data?: unknown };
      const parsed = parseRuntimeConfigPayload(body.data);
      return applyRuntimeConfig(parsed);
    } catch {
      return currentConfig;
    } finally {
      clearTimeout(timeout);
    }
  })();

  return initializePromise;
}
