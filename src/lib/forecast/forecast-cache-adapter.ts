/**
 * Forecast Cache Adapter (Memory Cache Adapter with Redis Interface Readiness)
 */

import { ICache } from './interfaces';
import { DEFAULT_CACHE_TTL } from './constants';
import { ForecastCacheError } from './errors';

interface CacheItem<T> {
  value: T;
  expiresAt: number;
}

export class ForecastCacheAdapter implements ICache {
  private cache: Map<string, CacheItem<unknown>> = new Map();

  public async get<T>(key: string): Promise<T | null> {
    try {
      const item = this.cache.get(key);
      if (!item) return null;
      if (Date.now() > item.expiresAt) {
        this.cache.delete(key);
        return null;
      }
      return item.value as T;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new ForecastCacheError(`Failed to read from cache key ${key}: ${message}`);
    }
  }

  public async set<T>(key: string, value: T, ttlSeconds: number = DEFAULT_CACHE_TTL): Promise<void> {
    try {
      const expiresAt = Date.now() + ttlSeconds * 1000;
      this.cache.set(key, { value, expiresAt });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new ForecastCacheError(`Failed to write to cache key ${key}: ${message}`);
    }
  }

  public async delete(key: string): Promise<void> {
    try {
      this.cache.delete(key);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new ForecastCacheError(`Failed to delete cache key ${key}: ${message}`);
    }
  }

  public async clear(): Promise<void> {
    try {
      this.cache.clear();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new ForecastCacheError(`Failed to clear cache: ${message}`);
    }
  }

  public async invalidateStoreCache(storeId: string): Promise<void> {
    try {
      const prefix = `store:${storeId}:`;
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) {
          this.cache.delete(key);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new ForecastCacheError(`Failed to invalidate store cache for ${storeId}: ${message}`);
    }
  }
}
