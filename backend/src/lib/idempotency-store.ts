import { createClient, type RedisClientType } from 'redis';
import { logger } from './logger';

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_MEMORY_MAX_ENTRIES = 10_000;
const REDIS_KEY_PREFIX = 'bizzw:idempotency:';
const REDIS_ERROR_LOG_INTERVAL_MS = 30_000;

export interface PendingIdempotencyRecord {
  state: 'pending';
  key: string;
  fingerprint: string;
  createdAt: number;
  expiresAt: number;
}

export interface CompletedIdempotencyRecord {
  state: 'completed';
  key: string;
  fingerprint: string;
  statusCode: number;
  payload: unknown;
  createdAt: number;
  expiresAt: number;
}

export type IdempotencyRecord = PendingIdempotencyRecord | CompletedIdempotencyRecord;

interface CompleteIdempotencyInput {
  fingerprint: string;
  statusCode: number;
  payload: unknown;
  ttlMs: number;
  createdAt?: number;
}

export interface IdempotencyStoreHealth {
  mode: 'memory' | 'redis';
  redisConfigured: boolean;
  redisConnected: boolean;
  fallbackInUse: boolean;
  memoryEntries: number;
}

export interface IdempotencyStore {
  reservePending(key: string, fingerprint: string, ttlMs: number): Promise<boolean>;
  get(key: string): Promise<IdempotencyRecord | null>;
  complete(key: string, input: CompleteIdempotencyInput): Promise<void>;
  release(key: string, fingerprint: string): Promise<void>;
  getHealth(): IdempotencyStoreHealth;
}

class MemoryIdempotencyStore implements IdempotencyStore {
  private readonly store = new Map<string, IdempotencyRecord>();

  constructor(private readonly maxEntries: number) {}

  private cleanupExpired(nowMs = Date.now()): void {
    for (const [key, record] of this.store.entries()) {
      if (record.expiresAt <= nowMs) {
        this.store.delete(key);
      }
    }
  }

  private pruneIfNeeded(): void {
    while (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (!oldestKey) {
        break;
      }
      this.store.delete(oldestKey);
    }
  }

  async reservePending(key: string, fingerprint: string, ttlMs: number): Promise<boolean> {
    this.cleanupExpired();

    if (this.store.has(key)) {
      return false;
    }

    const nowMs = Date.now();
    this.pruneIfNeeded();

    this.store.set(key, {
      state: 'pending',
      key,
      fingerprint,
      createdAt: nowMs,
      expiresAt: nowMs + ttlMs,
    });

    return true;
  }

  async get(key: string): Promise<IdempotencyRecord | null> {
    this.cleanupExpired();
    return this.store.get(key) || null;
  }

  async complete(key: string, input: CompleteIdempotencyInput): Promise<void> {
    this.cleanupExpired();

    const existing = this.store.get(key);
    if (existing && existing.fingerprint !== input.fingerprint) {
      return;
    }

    const createdAt = existing?.createdAt || input.createdAt || Date.now();
    const expiresAt = createdAt + (input.ttlMs || DEFAULT_TTL_MS);

    this.store.set(key, {
      state: 'completed',
      key,
      fingerprint: input.fingerprint,
      statusCode: input.statusCode,
      payload: input.payload,
      createdAt,
      expiresAt,
    });
  }

  async release(key: string, fingerprint: string): Promise<void> {
    this.cleanupExpired();

    const existing = this.store.get(key);
    if (!existing) {
      return;
    }

    if (existing.fingerprint !== fingerprint || existing.state !== 'pending') {
      return;
    }

    this.store.delete(key);
  }

  getHealth(): IdempotencyStoreHealth {
    return {
      mode: 'memory',
      redisConfigured: false,
      redisConnected: false,
      fallbackInUse: false,
      memoryEntries: this.store.size,
    };
  }
}

class RedisBackedIdempotencyStore implements IdempotencyStore {
  private client: RedisClientType | null = null;
  private redisConnected = false;
  private fallbackInUse = false;
  private lastRedisErrorAtMs = 0;

  constructor(
    private readonly redisUrl: string,
    private readonly fallbackStore: MemoryIdempotencyStore
  ) {}

  private redisKey(key: string): string {
    return `${REDIS_KEY_PREFIX}${key}`;
  }

  private logRedisError(error: unknown): void {
    const nowMs = Date.now();
    if (nowMs - this.lastRedisErrorAtMs < REDIS_ERROR_LOG_INTERVAL_MS) {
      return;
    }

    this.lastRedisErrorAtMs = nowMs;
    logger.error({ err: error }, 'Redis idempotency store unavailable, using memory fallback');
  }

  private parseRecord(raw: string | null): IdempotencyRecord | null {
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as IdempotencyRecord;
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        typeof parsed.key !== 'string' ||
        typeof parsed.fingerprint !== 'string' ||
        typeof parsed.createdAt !== 'number' ||
        typeof parsed.expiresAt !== 'number'
      ) {
        return null;
      }

      if (parsed.state === 'pending') {
        return parsed;
      }

      if (
        parsed.state === 'completed' &&
        typeof parsed.statusCode === 'number' &&
        Object.prototype.hasOwnProperty.call(parsed, 'payload')
      ) {
        return parsed;
      }

      return null;
    } catch {
      return null;
    }
  }

  private async getClient(): Promise<RedisClientType | null> {
    if (!this.redisUrl) {
      return null;
    }

    if (!this.client) {
      this.client = createClient({
        url: this.redisUrl,
        socket: {
          reconnectStrategy: (retries) => Math.min(2_000, 100 + retries * 100),
        },
      });

      this.client.on('error', (error) => {
        this.redisConnected = false;
        this.fallbackInUse = true;
        this.logRedisError(error);
      });

      this.client.on('ready', () => {
        this.redisConnected = true;
        this.fallbackInUse = false;
      });

      this.client.on('end', () => {
        this.redisConnected = false;
      });
    }

    if (!this.client.isOpen) {
      try {
        await this.client.connect();
        this.redisConnected = true;
        this.fallbackInUse = false;
      } catch (error) {
        this.redisConnected = false;
        this.fallbackInUse = true;
        this.logRedisError(error);
        return null;
      }
    }

    return this.client;
  }

  private async withFallback<T>(
    action: (client: RedisClientType) => Promise<T>,
    fallbackAction: () => Promise<T>
  ): Promise<T> {
    const client = await this.getClient();
    if (!client) {
      this.fallbackInUse = true;
      return fallbackAction();
    }

    try {
      return await action(client);
    } catch (error) {
      this.redisConnected = false;
      this.fallbackInUse = true;
      this.logRedisError(error);
      return fallbackAction();
    }
  }

  async reservePending(key: string, fingerprint: string, ttlMs: number): Promise<boolean> {
    const nowMs = Date.now();

    return this.withFallback(
      async (client) => {
        const payload: PendingIdempotencyRecord = {
          state: 'pending',
          key,
          fingerprint,
          createdAt: nowMs,
          expiresAt: nowMs + ttlMs,
        };

        const result = await client.set(this.redisKey(key), JSON.stringify(payload), {
          PX: ttlMs,
          NX: true,
        });

        return result === 'OK';
      },
      () => this.fallbackStore.reservePending(key, fingerprint, ttlMs)
    );
  }

  async get(key: string): Promise<IdempotencyRecord | null> {
    return this.withFallback(
      async (client) => {
        const raw = await client.get(this.redisKey(key));
        return this.parseRecord(raw);
      },
      () => this.fallbackStore.get(key)
    );
  }

  async complete(key: string, input: CompleteIdempotencyInput): Promise<void> {
    await this.withFallback(
      async (client) => {
        const redisKey = this.redisKey(key);
        const existingRaw = await client.get(redisKey);
        const existing = this.parseRecord(existingRaw);

        if (existing && existing.fingerprint !== input.fingerprint) {
          return;
        }

        const createdAt = existing?.createdAt || input.createdAt || Date.now();
        const expiresAt = createdAt + (input.ttlMs || DEFAULT_TTL_MS);

        const completedPayload: CompletedIdempotencyRecord = {
          state: 'completed',
          key,
          fingerprint: input.fingerprint,
          statusCode: input.statusCode,
          payload: input.payload,
          createdAt,
          expiresAt,
        };

        await client.set(redisKey, JSON.stringify(completedPayload), {
          PX: input.ttlMs,
        });
      },
      () => this.fallbackStore.complete(key, input)
    );
  }

  async release(key: string, fingerprint: string): Promise<void> {
    await this.withFallback(
      async (client) => {
        const redisKey = this.redisKey(key);
        const existingRaw = await client.get(redisKey);
        const existing = this.parseRecord(existingRaw);

        if (!existing || existing.fingerprint !== fingerprint || existing.state !== 'pending') {
          return;
        }

        await client.del(redisKey);
      },
      () => this.fallbackStore.release(key, fingerprint)
    );
  }

  getHealth(): IdempotencyStoreHealth {
    return {
      mode: 'redis',
      redisConfigured: true,
      redisConnected: this.redisConnected,
      fallbackInUse: this.fallbackInUse,
      memoryEntries: this.fallbackStore.getHealth().memoryEntries,
    };
  }
}

function parseInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(1, Math.floor(parsed));
}

function resolveStoreMode(): 'memory' | 'redis' {
  const explicit = (process.env.IDEMPOTENCY_STORE || '').trim().toLowerCase();

  if (explicit === 'redis') {
    return 'redis';
  }

  if (explicit === 'memory') {
    return 'memory';
  }

  return process.env.REDIS_URL ? 'redis' : 'memory';
}

const memoryStore = new MemoryIdempotencyStore(
  parseInteger(process.env.IDEMPOTENCY_MEMORY_MAX_ENTRIES, DEFAULT_MEMORY_MAX_ENTRIES)
);

let idempotencyStore: IdempotencyStore | null = null;

export function getIdempotencyStore(): IdempotencyStore {
  if (idempotencyStore) {
    return idempotencyStore;
  }

  const mode = resolveStoreMode();
  if (mode === 'redis') {
    const redisUrl = process.env.REDIS_URL || '';
    if (!redisUrl) {
      logger.warn(
        'IDEMPOTENCY_STORE is redis but REDIS_URL is missing. Falling back to memory store.'
      );
      idempotencyStore = memoryStore;
      return idempotencyStore;
    }

    idempotencyStore = new RedisBackedIdempotencyStore(redisUrl, memoryStore);
    return idempotencyStore;
  }

  idempotencyStore = memoryStore;
  return idempotencyStore;
}

export function getIdempotencyStoreHealth(): IdempotencyStoreHealth {
  return getIdempotencyStore().getHealth();
}
