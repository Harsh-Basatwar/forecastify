/**
 * Recommendation Versioning Engine
 * Tracks recommendation revisions (v1 -> v2) when underlying forecasts or feature vectors change
 * without destroying audit history.
 */

import { Recommendation, RecommendationVersion } from './recommendation-types';

export class RecommendationVersioning {
  public createVersion(rec: Recommendation): RecommendationVersion {
    return {
      id: `VER-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      storeId: rec.storeId,
      recommendationId: rec.id,
      version: rec.version,
      forecastPredictionId: rec.forecastPredictionId,
      snapshotData: {
        type: rec.type,
        priority: rec.priority,
        score: rec.score,
        financialImpact: rec.financialImpact,
        confidence: rec.confidence,
        reason: rec.reason,
      },
      createdAt: new Date().toISOString(),
    };
  }

  public incrementVersion(rec: Recommendation): Recommendation {
    return {
      ...rec,
      version: rec.version + 1,
      updatedAt: new Date().toISOString(),
    };
  }
}
