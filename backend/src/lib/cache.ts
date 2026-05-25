import { createHash } from 'node:crypto';
import { createClient, type RedisClientType } from 'redis';
import { logger } from './logger';

const DEFAULT_CACHE_TTL_SECONDS = 120;
const DEFAULT_MEMORY_MAX_ENTRIES = 5_000;
const DEFAULT_VERSION_CACHE_TTL_SECONDS = 5;
const REDIS_CACHE_KEY_PREFIX = 'bizzw:cache:';
const REDIS_TENANT_VERSION_KEY_PREFIX = 'bizzw:tenant-data-version:';
const REDIS_ERROR_LOG_INTERVAL_MS = 30_000;

interface MemoryCacheEntry {
  value: string;
  expiresAtMs: number;
}

interface TenantVersionEntry {
  value: number;
  expiresAtMs: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  writes: number;
  evictions: number;
  parseErrors: number;
  redisErrors: number;
}

export interface CacheHealth {
  mode: 'memory' | 'redis';
  redisConfigured: boolean;
  redisConnected: boolean;
  fallbackInUse: boolean;
  memoryEntries: number;
  stats: CacheStats & {
    hitRate: number;
  };
  lastRedisError: string | null;
  lastRedisErrorAt: string | null;
}

const memoryCache = new Map<string, MemoryCacheEntry>();
const tenantVersionFallback = new Map<string, number>();
const tenantVersionCache = new Map<string, TenantVersionEntry>();

const stats: CacheStats = {
  hits: 0,
  misses: 0,
  writes: 0,
  evictions: 0,
  parseErrors: 0,
  redisErrors: 0,
};

const memoryMaxEntries = parsePositiveInt(
  process.env.REPORT_CACHE_MEMORY_MAX_ENTRIES,
  DEFAULT_MEMORY_MAX_ENTRIES
);
const versionCacheTtlMs =
  parsePositiveInt(
    process.env.REPORT_CACHE_VERSION_TTL_SECONDS,
    DEFAULT_VERSION_CACHE_TTL_SECONDS
  ) * 1000;

let redisClient: RedisClientType | null = null;
let redisConnected = false;
let fallbackInUse = false;
let lastRedisError: string | null = null;
let lastRedisErrorAtMs = 0;

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

function cacheKey(key: string): string {
  return `${REDIS_CACHE_KEY_PREFIX}${key}`;
}

function tenantVersionKey(orgId: string): string {
  return `${REDIS_TENANT_VERSION_KEY_PREFIX}${orgId}`;
}

function logRedisError(error: unknown): void {
  const nowMs = Date.now();
  lastRedisError = error instanceof Error ? error.message : String(error);
  if (nowMs - lastRedisErrorAtMs < REDIS_ERROR_LOG_INTERVAL_MS) {
    return;
  }

  lastRedisErrorAtMs = nowMs;
  logger.warn({ err: error }, 'Report cache Redis unavailable, using memory fallback');
}

function cleanupExpiredMemoryEntries(nowMs = Date.now()): void {
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiresAtMs <= nowMs) {
      memoryCache.delete(key);
    }
  }
}

function pruneMemoryIfNeeded(): void {
  while (memoryCache.size >= memoryMaxEntries) {
    const oldestKey = memoryCache.keys().next().value;
    if (!oldestKey) {
      return;
    }

    memoryCache.delete(oldestKey);
    stats.evictions += 1;
  }
}

function setMemoryEntry(key: string, value: string, ttlSeconds: number): void {
  cleanupExpiredMemoryEntries();
  pruneMemoryIfNeeded();

  memoryCache.set(key, {
    value,
    expiresAtMs: Date.now() + ttlSeconds * 1000,
  });
}

function getMemoryEntry(key: string): string | null {
  const entry = memoryCache.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAtMs <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }

  return entry.value;
}

async function getRedisClient(): Promise<RedisClientType | null> {
  const redisUrl = process.env.REDIS_URL || '';
  if (!redisUrl) {
    return null;
  }

  if (!redisClient) {
    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => Math.min(2_000, 100 + retries * 100),
      },
    });

    redisClient.on('error', (error) => {
      redisConnected = false;
      fallbackInUse = true;
      stats.redisErrors += 1;
      logRedisError(error);
    });

    redisClient.on('ready', () => {
      redisConnected = true;
      fallbackInUse = false;
    });

    redisClient.on('end', () => {
      redisConnected = false;
    });
  }

  if (!redisClient.isOpen) {
    try {
      await redisClient.connect();
      redisConnected = true;
      fallbackInUse = false;
    } catch (error) {
      redisConnected = false;
      fallbackInUse = true;
      stats.redisErrors += 1;
      logRedisError(error);
      return null;
    }
  }

  return redisClient;
}

function parseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    stats.parseErrors += 1;
    return null;
  }
}

export async function getCachedJson<T>(key: string): Promise<T | null> {
  const memoryValue = getMemoryEntry(key);
  if (memoryValue) {
    const parsed = parseJson<T>(memoryValue);
    if (parsed !== null) {
      stats.hits += 1;
      return parsed;
    }

    memoryCache.delete(key);
  }

  const client = await getRedisClient();
  if (!client) {
    fallbackInUse = true;
    stats.misses += 1;
    return null;
  }

  try {
    const raw = await client.get(cacheKey(key));
    if (!raw) {
      stats.misses += 1;
      return null;
    }

    const parsed = parseJson<T>(raw);
    if (parsed === null) {
      stats.misses += 1;
      return null;
    }

    const defaultTtlSeconds = parsePositiveInt(
      process.env.REPORT_CACHE_TTL_SECONDS,
      DEFAULT_CACHE_TTL_SECONDS
    );

    setMemoryEntry(key, raw, defaultTtlSeconds);
    stats.hits += 1;
    fallbackInUse = false;
    return parsed;
  } catch (error) {
    redisConnected = false;
    fallbackInUse = true;
    stats.redisErrors += 1;
    logRedisError(error);
    stats.misses += 1;
    return null;
  }
}

export async function setCachedJson(
  key: string,
  payload: unknown,
  ttlSeconds = DEFAULT_CACHE_TTL_SECONDS
): Promise<void> {
  const safeTtlSeconds = Math.max(1, Math.floor(ttlSeconds));
  const serialized = JSON.stringify(payload);

  setMemoryEntry(key, serialized, safeTtlSeconds);
  stats.writes += 1;

  const client = await getRedisClient();
  if (!client) {
    fallbackInUse = true;
    return;
  }

  try {
    await client.set(cacheKey(key), serialized, {
      EX: safeTtlSeconds,
    });

    fallbackInUse = false;
  } catch (error) {
    redisConnected = false;
    fallbackInUse = true;
    stats.redisErrors += 1;
    logRedisError(error);
  }
}

function getVersionFromFallback(orgId: string): number {
  return tenantVersionFallback.get(orgId) || 1;
}

export async function getTenantDataVersion(orgId: string): Promise<number> {
  const cachedVersion = tenantVersionCache.get(orgId);
  if (cachedVersion && cachedVersion.expiresAtMs > Date.now()) {
    return cachedVersion.value;
  }

  const fallbackVersion = getVersionFromFallback(orgId);

  const client = await getRedisClient();
  if (!client) {
    fallbackInUse = true;
    tenantVersionCache.set(orgId, {
      value: fallbackVersion,
      expiresAtMs: Date.now() + versionCacheTtlMs,
    });
    return fallbackVersion;
  }

  try {
    const versionKey = tenantVersionKey(orgId);
    const raw = await client.get(versionKey);

    let nextVersion = fallbackVersion;
    if (!raw) {
      await client.set(versionKey, String(nextVersion), { NX: true });
    } else {
      const parsed = Number.parseInt(raw, 10);
      nextVersion = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;

      if (nextVersion !== parsed) {
        await client.set(versionKey, String(nextVersion));
      }
    }

    tenantVersionFallback.set(orgId, nextVersion);
    tenantVersionCache.set(orgId, {
      value: nextVersion,
      expiresAtMs: Date.now() + versionCacheTtlMs,
    });

    fallbackInUse = false;
    return nextVersion;
  } catch (error) {
    redisConnected = false;
    fallbackInUse = true;
    stats.redisErrors += 1;
    logRedisError(error);

    tenantVersionCache.set(orgId, {
      value: fallbackVersion,
      expiresAtMs: Date.now() + versionCacheTtlMs,
    });

    return fallbackVersion;
  }
}

export async function bumpTenantDataVersion(orgId: string): Promise<number> {
  tenantVersionCache.delete(orgId);

  const client = await getRedisClient();
  if (client) {
    try {
      const nextVersion = await client.incr(tenantVersionKey(orgId));
      tenantVersionFallback.set(orgId, nextVersion);
      tenantVersionCache.set(orgId, {
        value: nextVersion,
        expiresAtMs: Date.now() + versionCacheTtlMs,
      });

      fallbackInUse = false;
      return nextVersion;
    } catch (error) {
      redisConnected = false;
      fallbackInUse = true;
      stats.redisErrors += 1;
      logRedisError(error);
    }
  }

  const fallbackNextVersion = getVersionFromFallback(orgId) + 1;
  tenantVersionFallback.set(orgId, fallbackNextVersion);
  tenantVersionCache.set(orgId, {
    value: fallbackNextVersion,
    expiresAtMs: Date.now() + versionCacheTtlMs,
  });

  return fallbackNextVersion;
}

export function buildTenantScopedCacheKey(
  orgId: string,
  namespace: string,
  version: number,
  input: unknown
): string {
  const serializedInput = JSON.stringify(input);
  const hash = createHash('sha1').update(serializedInput).digest('hex');
  return `${namespace}:org:${orgId}:v:${version}:q:${hash}`;
}

export function getCacheHealth(): CacheHealth {
  const requests = stats.hits + stats.misses;

  return {
    mode: process.env.REDIS_URL ? 'redis' : 'memory',
    redisConfigured: Boolean(process.env.REDIS_URL),
    redisConnected,
    fallbackInUse,
    memoryEntries: memoryCache.size,
    stats: {
      ...stats,
      hitRate: requests > 0 ? stats.hits / requests : 0,
    },
    lastRedisError,
    lastRedisErrorAt: lastRedisErrorAtMs > 0 ? new Date(lastRedisErrorAtMs).toISOString() : null,
  };
}
