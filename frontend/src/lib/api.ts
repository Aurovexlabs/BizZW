import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/auth.store';
import {
    clearOfflineQueueRetryState,
    createMutationIdempotencyKey,
    enqueueOfflineMutation,
    getOfflineQueueItems,
    getOfflineQueueSnapshot,
    incrementOfflineQueueAttempts,
    markOfflineQueueFlushFailure,
    markOfflineQueueFlushSuccess,
    removeOfflineQueueItem,
    scheduleOfflineQueueRetry,
    setOfflineQueueFlushing,
} from './offlineQueue';
import { getRuntimeConfig, subscribeRuntimeConfig } from './runtime-config';

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RETRY_ATTEMPTS = 2;
const OFFLINE_RETRY_JITTER_MS = 200;

const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);
const IDEMPOTENT_METHODS = new Set(['get', 'head', 'options']);

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _retryCount?: number;
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function shouldRetry(error: AxiosError, config: RetriableRequestConfig): boolean {
  const method = (config.method || 'get').toLowerCase();
  const retryCount = config._retryCount || 0;

  if (!IDEMPOTENT_METHODS.has(method)) return false;
  if (retryCount >= MAX_RETRY_ATTEMPTS) return false;

  if (!error.response) {
    return true;
  }

  return RETRYABLE_STATUS_CODES.has(error.response.status);
}

function getBackoffDelayMs(retryCount: number): number {
  const jitterMs = Math.floor(Math.random() * 120);
  return Math.min(2_000, 250 * 2 ** retryCount) + jitterMs;
}

function buildApiBaseUrl(): string {
  const config = getRuntimeConfig();
  const normalizedVersionPath = config.apiVersionPath.startsWith('/')
    ? config.apiVersionPath
    : `/${config.apiVersionPath}`;

  return `${config.apiBaseUrl}${normalizedVersionPath}`;
}

export const api = axios.create({
  baseURL: buildApiBaseUrl(),
  withCredentials: true, // Send cookies for refresh token
  headers: { 'Content-Type': 'application/json' },
  timeout: REQUEST_TIMEOUT_MS,
});

subscribeRuntimeConfig(() => {
  api.defaults.baseURL = buildApiBaseUrl();
});

let isOfflineQueueFlushRunning = false;
let isOfflineQueueInitialized = false;

function isLikelyRetryableStatus(status?: number): boolean {
  if (!status) {
    return true;
  }
  return RETRYABLE_STATUS_CODES.has(status);
}

export interface QueueableMutationResult<T> {
  data: T;
  queued: boolean;
  deduplicated: boolean;
  queueId?: string;
  idempotencyKey: string;
}

function getQueueBackoffDelayMs(attemptCount: number, baseDelayMs: number, maxDelayMs: number): number {
  const jitterMs = Math.floor(Math.random() * OFFLINE_RETRY_JITTER_MS);
  const exponential = baseDelayMs * 2 ** Math.max(0, attemptCount - 1);
  return Math.min(maxDelayMs, exponential) + jitterMs;
}

async function flushOfflineMutationQueue(): Promise<void> {
  if (typeof window === 'undefined' || isOfflineQueueFlushRunning || !navigator.onLine) {
    return;
  }

  const queueSnapshot = getOfflineQueueSnapshot();
  if (queueSnapshot.isPaused) {
    return;
  }

  const accessToken = useAuthStore.getState().accessToken;
  if (!accessToken) {
    return;
  }

  const queue = getOfflineQueueItems();
  if (queue.length === 0) {
    return;
  }

  isOfflineQueueFlushRunning = true;
  setOfflineQueueFlushing(true);

  try {
    const nowMs = Date.now();

    for (const item of queue) {
      if (item.nextRetryAt) {
        const retryAtMs = new Date(item.nextRetryAt).getTime();
        if (!Number.isNaN(retryAtMs) && retryAtMs > nowMs) {
          continue;
        }
      }

      try {
        await api.request({
          method: item.method,
          url: item.url,
          data: item.payload,
          headers: {
            'x-bizzw-offline-replay': '1',
            'x-idempotency-key': item.idempotencyKey,
          },
        });

        clearOfflineQueueRetryState(item.id);
        removeOfflineQueueItem(item.id);
      } catch (error) {
        const axiosError = error as AxiosError;
        const queuePolicy = getOfflineQueueSnapshot().policy;

        const attemptCount = item.attempts + 1;
        incrementOfflineQueueAttempts(item.id);

        const canRetry =
          attemptCount < queuePolicy.maxAttempts &&
          isLikelyRetryableStatus(axiosError.response?.status);

        if (!canRetry) {
          removeOfflineQueueItem(item.id);
          markOfflineQueueFlushFailure(
            `Dropped queued action "${item.label}" after ${attemptCount} failed sync attempts.`
          );
          continue;
        }

        const retryDelayMs = getQueueBackoffDelayMs(
          attemptCount,
          queuePolicy.baseDelayMs,
          queuePolicy.maxDelayMs
        );
        const retryAt = new Date(Date.now() + retryDelayMs).toISOString();

        scheduleOfflineQueueRetry(item.id, {
          nextRetryAt: retryAt,
          message: `Retry scheduled after ${Math.round(retryDelayMs / 1000)}s`,
        });

        markOfflineQueueFlushFailure(
          `Could not sync "${item.label}". Next retry at ${new Date(retryAt).toLocaleTimeString()}.`
        );
        break;
      }
    }

    if (getOfflineQueueItems().length === 0) {
      markOfflineQueueFlushSuccess();
    }
  } finally {
    setOfflineQueueFlushing(false);
    isOfflineQueueFlushRunning = false;
  }
}

function initOfflineQueueSync() {
  if (typeof window === 'undefined' || isOfflineQueueInitialized) {
    return;
  }

  isOfflineQueueInitialized = true;
  window.addEventListener('online', () => {
    void flushOfflineMutationQueue();
  });

  void flushOfflineMutationQueue();
}

initOfflineQueueSync();

export async function postWithOfflineQueue<T>(
  url: string,
  payload: unknown,
  label: string
): Promise<QueueableMutationResult<T>> {
  const idempotencyKey = createMutationIdempotencyKey();

  if (typeof window !== 'undefined' && !navigator.onLine) {
    const queued = enqueueOfflineMutation({
      method: 'post',
      url,
      payload,
      label,
      idempotencyKey,
    });

    return {
      data: payload as T,
      queued: true,
      deduplicated: queued.deduplicated,
      queueId: queued.item.id,
      idempotencyKey: queued.item.idempotencyKey,
    };
  }

  const response = await api.post(url, payload, {
    headers: {
      'x-idempotency-key': idempotencyKey,
    },
  });
  void flushOfflineMutationQueue();

  return {
    data: extractData<T>(response as { data: { data: T } }),
    queued: false,
    deduplicated: false,
    idempotencyKey,
  };
}

export async function triggerOfflineQueueSync(): Promise<void> {
  await flushOfflineMutationQueue();
}

// ─── Request interceptor: attach access token ─────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor: handle 401 and refresh ────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve(token!);
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshUrl = `${buildApiBaseUrl()}/auth/refresh`;
        const { data } = await axios.post(
          refreshUrl,
          {},
          { withCredentials: true }
        );
        const newToken: string = data.data.accessToken;
        useAuthStore.getState().setAccessToken(newToken);
        processQueue(null, newToken);
        if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (shouldRetry(error, originalRequest)) {
      const retryCount = originalRequest._retryCount || 0;
      originalRequest._retryCount = retryCount + 1;

      await delay(getBackoffDelayMs(retryCount));
      return api(originalRequest);
    }

    return Promise.reject(error);
  }
);

// ─── Type-safe API response extractor ─────────────────────────
export function extractData<T>(response: { data: { data: T } }): T {
  return response.data.data;
}
