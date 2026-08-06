/**
 * Recommendation TTL & Auto-Expiration Monitor
 * Checks validity windows and auto-expires stale recommendations.
 */

import { Recommendation, RecommendationStatus } from './recommendation-types';

export class RecommendationTTL {
  public calculateValidUntil(ttlHours: number = 48): string {
    const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000);
    return expiresAt.toISOString();
  }

  public isExpired(rec: Recommendation): boolean {
    if (!rec.validUntil) return false;
    return new Date(rec.validUntil).getTime() <= Date.now();
  }

  public checkAndExpire(recommendations: Recommendation[]): {
    active: Recommendation[];
    expired: Recommendation[];
  } {
    const active: Recommendation[] = [];
    const expired: Recommendation[] = [];

    for (const rec of recommendations) {
      if (
        rec.status !== RecommendationStatus.EXECUTED &&
        rec.status !== RecommendationStatus.CLOSED &&
        rec.status !== RecommendationStatus.EXPIRED &&
        this.isExpired(rec)
      ) {
        expired.push({
          ...rec,
          status: RecommendationStatus.EXPIRED,
          expiredAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else {
        active.push(rec);
      }
    }

    return { active, expired };
  }
}
