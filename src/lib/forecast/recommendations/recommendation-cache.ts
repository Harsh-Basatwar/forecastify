/**
 * Recommendation Cache Adapter
 * In-memory / Redis caching layer for store recommendations and decision graphs.
 */

import { Recommendation, RecommendationGraph } from './recommendation-types';

export class RecommendationCacheAdapter {
  private storeCache = new Map<string, Recommendation[]>();
  private graphCache = new Map<string, RecommendationGraph>();

  public setStoreRecommendations(storeId: string, recommendations: Recommendation[]): void {
    this.storeCache.set(storeId, recommendations);
  }

  public getStoreRecommendations(storeId: string): Recommendation[] | null {
    return this.storeCache.get(storeId) || null;
  }

  public setDecisionGraph(storeId: string, graph: RecommendationGraph): void {
    this.graphCache.set(storeId, graph);
  }

  public getDecisionGraph(storeId: string): RecommendationGraph | null {
    return this.graphCache.get(storeId) || null;
  }

  public invalidateStore(storeId: string): void {
    this.storeCache.delete(storeId);
    this.graphCache.delete(storeId);
  }
}
