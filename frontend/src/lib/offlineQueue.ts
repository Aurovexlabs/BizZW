const OFFLINE_QUEUE_KEY = 'bizzw-offline-mutation-queue';
const OFFLINE_QUEUE_META_KEY = 'bizzw-offline-mutation-queue-meta';
const OFFLINE_QUEUE_EVENT = 'bizzw-offline-queue-updated';

export interface OfflineQueuePolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const defaultPolicy: OfflineQueuePolicy = {
  maxAttempts: 5,
  baseDelayMs: 2_500,
  maxDelayMs: 120_000,
};

export interface OfflineQueueItem {
  id: string;
  idempotencyKey: string;
  dedupeKey: string;
  label: string;
  method: 'post' | 'patch' | 'put' | 'delete';
  url: string;
  payload?: unknown;
  createdAt: string;
  attempts: number;
  nextRetryAt: string | null;
  lastErrorMessage: string | null;
}

interface OfflineQueueMeta {
  isFlushing: boolean;
  isPaused: boolean;
  policy: OfflineQueuePolicy;
  lastFlushAt: string | null;
  lastFailureAt: string | null;
  lastFailureMessage: string | null;
}

export interface OfflineQueueSnapshot extends OfflineQueueMeta {
  pendingCount: number;
  items: OfflineQueueItem[];
}

export interface EnqueueOfflineMutationResult {
  item: OfflineQueueItem;
  deduplicated: boolean;
}

const defaultMeta: OfflineQueueMeta = {
  isFlushing: false,
  isPaused: false,
  policy: defaultPolicy,
  lastFlushAt: null,
  lastFailureAt: null,
  lastFailureMessage: null,
};

const defaultSnapshot: OfflineQueueSnapshot = {
  ...defaultMeta,
  pendingCount: 0,
  items: [],
};

let cachedQueueRaw: string | null = null;
let cachedMetaRaw: string | null = null;
let cachedSnapshot: OfflineQueueSnapshot = defaultSnapshot;

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function emitQueueUpdated() {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new CustomEvent(OFFLINE_QUEUE_EVENT));
}

function loadQueue(): OfflineQueueItem[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const parsed = safeParse<OfflineQueueItem[]>(localStorage.getItem(OFFLINE_QUEUE_KEY), []);
  return Array.isArray(parsed) ? parsed : [];
}

function saveQueue(items: OfflineQueueItem[]) {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(items));
  emitQueueUpdated();
}

function loadMeta(): OfflineQueueMeta {
  if (typeof window === 'undefined') {
    return defaultMeta;
  }

  const parsed = safeParse<OfflineQueueMeta>(localStorage.getItem(OFFLINE_QUEUE_META_KEY), defaultMeta);
  const parsedPolicy = parsed && typeof parsed.policy === 'object' && parsed.policy
    ? parsed.policy
    : defaultPolicy;

  return {
    ...defaultMeta,
    ...parsed,
    policy: {
      ...defaultPolicy,
      ...parsedPolicy,
    },
  };
}

function saveMeta(meta: OfflineQueueMeta) {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(OFFLINE_QUEUE_META_KEY, JSON.stringify(meta));
  emitQueueUpdated();
}

function nextQueueId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `offline-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function stableStringify(value: unknown): string {
  if (typeof value === 'undefined') {
    return 'undefined';
  }

  if (value === null || typeof value !== 'object') {
    return String(JSON.stringify(value));
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => `"${key}":${stableStringify(val)}`);

  return `{${entries.join(',')}}`;
}

function createDedupeKey(method: OfflineQueueItem['method'], url: string, payload?: unknown): string {
  return `${method.toLowerCase()}::${url}::${stableStringify(payload ?? null)}`;
}

function createIdempotencyKey(): string {
  return `idem-${nextQueueId()}`;
}

function updateQueueItem(id: string, updater: (item: OfflineQueueItem) => OfflineQueueItem) {
  const updated = loadQueue().map((item) => (item.id === id ? updater(item) : item));
  saveQueue(updated);
}

export function enqueueOfflineMutation(input: {
  label: string;
  method: OfflineQueueItem['method'];
  url: string;
  payload?: unknown;
  idempotencyKey?: string;
}): EnqueueOfflineMutationResult {
  const queue = loadQueue();
  const dedupeKey = createDedupeKey(input.method, input.url, input.payload);
  const existing = queue.find((item) => item.dedupeKey === dedupeKey);

  if (existing) {
    return {
      item: existing,
      deduplicated: true,
    };
  }

  const queuedItem: OfflineQueueItem = {
    id: nextQueueId(),
    idempotencyKey: input.idempotencyKey || createIdempotencyKey(),
    dedupeKey,
    label: input.label,
    method: input.method,
    url: input.url,
    payload: input.payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
    nextRetryAt: null,
    lastErrorMessage: null,
  };

  queue.push(queuedItem);
  saveQueue(queue);

  return {
    item: queuedItem,
    deduplicated: false,
  };
}

export function createMutationIdempotencyKey(): string {
  return createIdempotencyKey();
}

export function getOfflineQueueItems(): OfflineQueueItem[] {
  return loadQueue();
}

export function removeOfflineQueueItem(id: string) {
  const next = loadQueue().filter((item) => item.id !== id);
  saveQueue(next);
}

export function incrementOfflineQueueAttempts(id: string) {
  updateQueueItem(id, (item) => ({
    ...item,
    attempts: item.attempts + 1,
  }));
}

export function scheduleOfflineQueueRetry(id: string, input: { nextRetryAt: string; message: string }) {
  updateQueueItem(id, (item) => ({
    ...item,
    nextRetryAt: input.nextRetryAt,
    lastErrorMessage: input.message,
  }));
}

export function clearOfflineQueueRetryState(id: string) {
  updateQueueItem(id, (item) => ({
    ...item,
    nextRetryAt: null,
    lastErrorMessage: null,
  }));
}

export function retryOfflineQueueItemNow(id: string) {
  updateQueueItem(id, (item) => ({
    ...item,
    attempts: 0,
    nextRetryAt: null,
    lastErrorMessage: null,
  }));
}

export function setOfflineQueueFlushing(isFlushing: boolean) {
  const meta = loadMeta();
  saveMeta({
    ...meta,
    isFlushing,
  });
}

export function setOfflineQueuePaused(isPaused: boolean) {
  const meta = loadMeta();
  saveMeta({
    ...meta,
    isPaused,
  });
}

export function updateOfflineQueuePolicy(partial: Partial<OfflineQueuePolicy>) {
  const meta = loadMeta();
  const nextPolicy: OfflineQueuePolicy = {
    maxAttempts: Math.max(1, partial.maxAttempts ?? meta.policy.maxAttempts),
    baseDelayMs: Math.max(250, partial.baseDelayMs ?? meta.policy.baseDelayMs),
    maxDelayMs: Math.max(1_000, partial.maxDelayMs ?? meta.policy.maxDelayMs),
  };

  saveMeta({
    ...meta,
    policy: nextPolicy,
  });
}

export function markOfflineQueueFlushSuccess() {
  const meta = loadMeta();
  saveMeta({
    ...meta,
    isFlushing: false,
    lastFlushAt: new Date().toISOString(),
    lastFailureAt: null,
    lastFailureMessage: null,
  });
}

export function markOfflineQueueFlushFailure(message: string) {
  const meta = loadMeta();
  saveMeta({
    ...meta,
    isFlushing: false,
    lastFailureAt: new Date().toISOString(),
    lastFailureMessage: message,
  });
}

export function getOfflineQueueSnapshot(): OfflineQueueSnapshot {
  if (typeof window === 'undefined') {
    return defaultSnapshot;
  }

  const queueRaw = localStorage.getItem(OFFLINE_QUEUE_KEY);
  const metaRaw = localStorage.getItem(OFFLINE_QUEUE_META_KEY);

  if (queueRaw === cachedQueueRaw && metaRaw === cachedMetaRaw) {
    return cachedSnapshot;
  }

  const items = loadQueue();
  const meta = loadMeta();

  cachedQueueRaw = queueRaw;
  cachedMetaRaw = metaRaw;
  cachedSnapshot = {
    ...meta,
    pendingCount: items.length,
    items,
  };

  return cachedSnapshot;
}

export function subscribeOfflineQueue(listener: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handler = () => listener();
  window.addEventListener(OFFLINE_QUEUE_EVENT, handler);
  window.addEventListener('storage', handler);

  return () => {
    window.removeEventListener(OFFLINE_QUEUE_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}
