/**
 * Recommendation Scoring Engine
 * Aggregates priority, confidence, financial impact, risk, and explainability score
 * into a single standardized Recommendation Score (0–100).
 */

import { FinancialImpact, RecommendationPriority } from './recommendation-types';

export class RecommendationScoringEngine {
  public calculateScore(
    priority: RecommendationPriority,
    confidence: number,
    explainabilityScore: number,
    riskScore: number,
    impact: FinancialImpact
  ): number {
    let priorityWeight = 50;
    switch (priority) {
      case RecommendationPriority.CRITICAL: priorityWeight = 100; break;
      case RecommendationPriority.HIGH: priorityWeight = 85; break;
      case RecommendationPriority.MEDIUM: priorityWeight = 70; break;
      case RecommendationPriority.LOW: priorityWeight = 50; break;
      case RecommendationPriority.INFO: priorityWeight = 30; break;
    }

    const netValue = impact.expectedProfit + impact.expectedSavings + impact.blockedCapitalReleased;
    const financialWeight = Math.min(100, Math.max(10, (netValue / 5000) * 100));

    // Weighted formula: Priority (30%), Confidence (25%), Financial Value (25%), Explainability (10%), Risk (10%)
    const rawScore = (
      priorityWeight * 0.30 +
      (confidence * 100) * 0.25 +
      financialWeight * 0.25 +
      explainabilityScore * 0.10 +
      riskScore * 0.10
    );

    return Number(Math.min(100, Math.max(0, rawScore)).toFixed(2));
  }
}
