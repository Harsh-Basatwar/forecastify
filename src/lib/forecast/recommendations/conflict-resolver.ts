/**
 * Recommendation Conflict Resolver
 * Detects and resolves conflicting recommendations (e.g. Increase Price vs Reduce Price)
 * by selecting the option with higher confidence, explainability score, and net ROI.
 */

import { Recommendation, RecommendationType } from './recommendation-types';

export class ConflictResolver {
  private static conflictingPairs: Array<[RecommendationType, RecommendationType]> = [
    [RecommendationType.INCREASE_PRICE, RecommendationType.REDUCE_PRICE],
    [RecommendationType.INCREASE_PRICE, RecommendationType.MARKDOWN],
    [RecommendationType.ORDER_MORE, RecommendationType.REDUCE_ORDER],
    [RecommendationType.START_PROMOTION, RecommendationType.STOP_PROMOTION],
  ];

  public resolveConflicts(recommendations: Recommendation[]): {
    resolvedRecommendations: Recommendation[];
    discardedConflicts: Array<{ winner: Recommendation; loser: Recommendation; reason: string }>;
  } {
    const discardedConflicts: Array<{ winner: Recommendation; loser: Recommendation; reason: string }> = [];
    const activeMap = new Map<string, Recommendation>();

    for (const rec of recommendations) {
      const key = `${rec.storeId}:${rec.productId || 'GLOBAL'}`;
      const existing = activeMap.get(key);

      if (!existing) {
        activeMap.set(key, rec);
        continue;
      }

      // Check if existing and current rec conflict
      const isConflict = ConflictResolver.conflictingPairs.some(
        ([a, b]) => (existing.type === a && rec.type === b) || (existing.type === b && rec.type === a)
      );

      if (isConflict) {
        // Resolve conflict: winner has higher composite score
        const winner = rec.score >= existing.score ? rec : existing;
        const loser = rec.score >= existing.score ? existing : rec;

        const reason = `Resolved conflict between ${winner.type} (Score: ${winner.score}, Confidence: ${(winner.confidence * 100).toFixed(1)}%) and ${loser.type} (Score: ${loser.score}). Higher confidence/ROI selected.`;

        discardedConflicts.push({ winner, loser, reason });
        activeMap.set(key, winner);
      } else {
        // Non-conflicting recommendation for same product, retain highest priority
        if (rec.score > existing.score) {
          activeMap.set(key, rec);
        }
      }
    }

    return {
      resolvedRecommendations: Array.from(activeMap.values()),
      discardedConflicts,
    };
  }
}
