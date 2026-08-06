/**
 * Explanation Cache
 * Milestone 5 - Forecastify XAI
 */

import { Explanation } from './explanation-types';
import { explanationTTLManager } from './explanation-ttl';

export class ExplanationCache {
  private cache: Map<string, { explanation: Explanation; expiresAt: number }> = new Map();

  public get(key: string): Explanation | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt || explanationTTLManager.isExpired(item.explanation.metadata.ttlExpiresAt)) {
      this.cache.delete(key);
      return null;
    }

    return item.explanation;
  }

  public set(key: string, explanation: Explanation, ttlMs: number = 24 * 60 * 60 * 1000): void {
    this.cache.set(key, {
      explanation,
      expiresAt: Date.now() + ttlMs,
    });
  }

  public delete(key: string): void {
    this.cache.delete(key);
  }

  public deleteByEntity(type: 'prediction' | 'recommendation', id: string): void {
    for (const [k, item] of this.cache.entries()) {
      if (
        (type === 'prediction' && item.explanation.predictionId === id) ||
        (type === 'recommendation' && item.explanation.recommendationId === id)
      ) {
        this.cache.delete(k);
      }
    }
  }

  public clearStoreCache(storeId: string): void {
    for (const [k, item] of this.cache.entries()) {
      if (item.explanation.metadata.storeId === storeId) {
        this.cache.delete(k);
      }
    }
  }

  public clear(): void {
    this.cache.clear();
  }

  public size(): number {
    return this.cache.size;
  }
}

export const explanationCache = new ExplanationCache();
