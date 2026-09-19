import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { CACHE_PREFIX } from './cacheKeys.js';

export { CACHE_PREFIX, CACHE_TTL, catalogCacheKey, stableKey } from './cacheKeys.js';

type CacheBackend = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  delByPrefix(prefix: string): Promise<void>;
  quit(): Promise<void>;
};

class MemoryCache implements CacheBackend {
  private store = new Map<string, { value: string; expiresAt: number }>();

  async get(key: string): Promise<string | null> {
    const hit = this.store.get(key);
    if (!hit) return null;
    if (hit.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return hit.value;
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async delByPrefix(prefix: string): Promise<void> {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  async quit(): Promise<void> {
    this.store.clear();
  }
}

class RedisCache implements CacheBackend {
  constructor(private readonly redis: Redis) {}

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, value, 'EX', ttlSeconds);
  }

  async delByPrefix(prefix: string): Promise<void> {
    let cursor = '0';
    do {
      const [next, keys] = await this.redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
      cursor = next;
      if (keys.length) await this.redis.del(...keys);
    } while (cursor !== '0');
  }

  async quit(): Promise<void> {
    await this.redis.quit();
  }
}

let backend: CacheBackend = new MemoryCache();
let redisClient: Redis | null = null;
let usingRedis = false;

export function isRedisCache(): boolean {
  return usingRedis;
}

export async function initCache(): Promise<void> {
  if (!env.REDIS_URL) {
    logger.info('Catalog cache using in-memory store');
    return;
  }

  const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 2,
    lazyConnect: true,
    enableReadyCheck: true,
  });

  redis.on('error', (err) => {
    logger.warn({ err }, 'Redis cache error — falling back to memory if needed');
  });

  try {
    await redis.connect();
    backend = new RedisCache(redis);
    redisClient = redis;
    usingRedis = true;
    logger.info('Catalog cache connected to Redis');
  } catch (error) {
    logger.warn({ err: error }, 'Redis unavailable — using in-memory catalog cache');
    await redis.quit().catch(() => undefined);
    backend = new MemoryCache();
    usingRedis = false;
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const raw = await backend.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  await backend.set(key, JSON.stringify(value), ttlSeconds);
}

export async function invalidateCatalogCache(): Promise<void> {
  await Promise.all([
    backend.delByPrefix(CACHE_PREFIX.products),
    backend.delByPrefix(CACHE_PREFIX.categories),
  ]);
}

export async function disconnectCache(): Promise<void> {
  await backend.quit();
  redisClient = null;
  usingRedis = false;
}

export function getRedisClient(): Redis | null {
  return redisClient;
}
