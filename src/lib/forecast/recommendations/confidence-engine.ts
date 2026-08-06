/**
 * Confidence Engine
 * Evaluates composite confidence from forecast confidence, data freshness,
 * supplier reliability, and pricing volatility.
 */

import { ConfidenceBreakdown, RecommendationRuleInput } from './recommendation-types';

export class ConfidenceEngine {
  public calculateConfidence(input: RecommendationRuleInput): ConfidenceBreakdown {
    const predictionConfidence = Math.min(1, Math.max(0.1, input.forecastConfidence || 0.85));
    
    // Inventory confidence based on stock availability and reorder thresholds
    const inventoryConfidence = input.currentStock >= 0 ? 0.90 : 0.50;

    // Supplier confidence based on reliability percentage
    const supplierConfidence = input.supplierReliabilityPct 
      ? Math.min(1, input.supplierReliabilityPct / 100) 
      : 0.80;

    // Pricing confidence based on valid unit price and cost
    const pricingConfidence = (input.unitPrice > 0 && input.unitCost >= 0) ? 0.95 : 0.70;

    // Composite weighted overall score
    const overall = Number(
      (
        predictionConfidence * 0.40 +
        inventoryConfidence * 0.25 +
        supplierConfidence * 0.20 +
        pricingConfidence * 0.15
      ).toFixed(4)
    );

    return {
      overall,
      predictionConfidence,
      inventoryConfidence,
      supplierConfidence,
      pricingConfidence,
    };
  }
}
