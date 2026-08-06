/**
 * Priority Engine
 * Computes recommendation priority rank (CRITICAL, HIGH, MEDIUM, LOW, INFO)
 * based on risk, urgency, savings, revenue, margin, and confidence.
 */

import { FinancialImpact, RecommendationPriority, RecommendationRisk } from './recommendation-types';

export class RecommendationPriorityEngine {
  public calculatePriority(
    risk: RecommendationRisk,
    impact: FinancialImpact,
    confidence: number
  ): RecommendationPriority {
    if (risk === RecommendationRisk.CRITICAL) {
      return RecommendationPriority.CRITICAL;
    }

    const netFinancialValue = impact.expectedProfit + impact.expectedSavings + impact.blockedCapitalReleased;

    if (risk === RecommendationRisk.HIGH || netFinancialValue >= 10000) {
      return RecommendationPriority.HIGH;
    }

    if (netFinancialValue >= 2500 || confidence >= 0.85) {
      return RecommendationPriority.MEDIUM;
    }

    if (netFinancialValue > 0) {
      return RecommendationPriority.LOW;
    }

    return RecommendationPriority.INFO;
  }
}
