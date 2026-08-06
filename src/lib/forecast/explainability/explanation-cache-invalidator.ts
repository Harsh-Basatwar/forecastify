/**
 * Explanation Cache Invalidator
 * Milestone 5 - Forecastify XAI
 */

import { explanationCache } from './explanation-cache';

export type InvalidationEvent =
  | 'forecast.generated'
  | 'recommendation.generated'
  | 'recommendation.executed'
  | 'inventory.updated'
  | 'feature_schema.updated';

export class ExplanationCacheInvalidator {
  public handleInvalidationEvent(event: InvalidationEvent, payload: { storeId?: string; predictionId?: string; recommendationId?: string }): {
    invalidatedKeys: string[];
    reason: string;
  } {
    const reason = `Cache invalidation triggered by event: ${event}`;
    const invalidatedKeys: string[] = [];

    if (payload.storeId) {
      explanationCache.clearStoreCache(payload.storeId);
      invalidatedKeys.push(`store_${payload.storeId}`);
    }

    if (payload.predictionId) {
      explanationCache.deleteByEntity('prediction', payload.predictionId);
      invalidatedKeys.push(`pred_${payload.predictionId}`);
    }

    if (payload.recommendationId) {
      explanationCache.deleteByEntity('recommendation', payload.recommendationId);
      invalidatedKeys.push(`rec_${payload.recommendationId}`);
    }

    return {
      invalidatedKeys,
      reason,
    };
  }
}

export const explanationCacheInvalidator = new ExplanationCacheInvalidator();
