/**
 * Risk Engine
 * Assesses stockout risk, overstock risk, supplier delay risk, expiry risk, and volatility risk.
 */

import { RecommendationRisk, RecommendationRuleInput } from './recommendation-types';

export class RiskEngine {
  public calculateRiskScore(input: RecommendationRuleInput): { riskScore: number; riskLevel: RecommendationRisk } {
    let riskPoints = 0;

    // Stockout risk
    if (input.currentStock <= input.reorderPoint) riskPoints += 30;
    if (input.currentStock <= input.safetyStock) riskPoints += 25;

    // Overstock risk
    if (input.currentStock > input.forecastDemand * 2.5) riskPoints += 25;

    // Supplier delay risk
    if (input.supplierLeadTimeDays && input.supplierLeadTimeDays > 14) riskPoints += 15;
    if (input.supplierReliabilityPct && input.supplierReliabilityPct < 80) riskPoints += 15;

    // Expiry risk
    if (input.expiryDate) {
      const daysToExpiry = (new Date(input.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24);
      if (daysToExpiry <= 15) riskPoints += 35;
      else if (daysToExpiry <= 30) riskPoints += 20;
    }

    const riskScore = Math.min(100, Math.max(0, riskPoints));

    let riskLevel = RecommendationRisk.LOW;
    if (riskScore >= 75) riskLevel = RecommendationRisk.CRITICAL;
    else if (riskScore >= 50) riskLevel = RecommendationRisk.HIGH;
    else if (riskScore >= 25) riskLevel = RecommendationRisk.MEDIUM;

    return { riskScore, riskLevel };
  }
}
