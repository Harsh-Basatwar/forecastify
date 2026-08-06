/**
 * Recommendation Templates
 * Formats standardized JSON and HTML payload structures across domain categories.
 */

import { Recommendation } from './recommendation-types';

export class RecommendationTemplates {
  public formatSummaryText(rec: Recommendation): string {
    return `[${rec.priority}] ${rec.type} for product ${rec.productId || 'Inventory Item'}. Estimated Profit Gain: $${rec.financialImpact.expectedProfit}, Savings: $${rec.financialImpact.expectedSavings}. Confidence: ${(rec.confidence * 100).toFixed(1)}%.`;
  }

  public formatExecutionPayload(rec: Recommendation): Record<string, unknown> {
    return {
      recommendationId: rec.id,
      storeId: rec.storeId,
      productId: rec.productId,
      type: rec.type,
      category: rec.category,
      financialImpact: rec.financialImpact,
      timestamp: new Date().toISOString(),
    };
  }
}
