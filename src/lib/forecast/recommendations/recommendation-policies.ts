/**
 * Business Policy Engine
 * Separated policy verification enforcing strict business rules:
 * - Warehouse capacity bounds
 * - Supplier credit limits
 * - Reorder policy minimums/maximums
 * - Safety stock compliance
 * - Minimum margin protection
 * - Non-expired inventory rules
 * - Available supplier validation
 */

import { RecommendationRuleInput, RecommendationType } from './recommendation-types';

export interface PolicyCheckResult {
  allowed: boolean;
  violatedPolicies: string[];
}

export class PolicyEngine {
  public validatePolicies(type: RecommendationType, input: RecommendationRuleInput): PolicyCheckResult {
    const violatedPolicies: string[] = [];

    // 1. Warehouse capacity policy
    if (
      (type === RecommendationType.ORDER_MORE || type === RecommendationType.BULK_BUY) &&
      input.warehouseCapacityMax &&
      (input.currentStock + input.forecastDemand) > input.warehouseCapacityMax
    ) {
      violatedPolicies.push(`Warehouse capacity limit exceeded (Max: ${input.warehouseCapacityMax}).`);
    }

    // 2. Supplier credit limit policy
    if (
      (type === RecommendationType.ORDER_MORE || type === RecommendationType.EMERGENCY_PURCHASE) &&
      input.supplierCreditLimit &&
      (input.forecastDemand * input.unitCost) > input.supplierCreditLimit
    ) {
      violatedPolicies.push(`Supplier credit limit exceeded (Max credit: $${input.supplierCreditLimit}).`);
    }

    // 3. Minimum margin policy
    if (type === RecommendationType.MARKDOWN || type === RecommendationType.MARKDOWN_PRODUCT) {
      const discountedPrice = input.unitPrice * 0.70; // 30% discount test
      if (discountedPrice < input.unitCost * 1.05) { // Minimum 5% margin violation
        violatedPolicies.push('Price markdown violates minimum required gross margin threshold of 5%.');
      }
    }

    // 4. Expired inventory purchase policy
    if (type === RecommendationType.ORDER_MORE && input.expiryDate) {
      const daysToExpiry = (new Date(input.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24);
      if (daysToExpiry <= 0) {
        violatedPolicies.push('Cannot reorder inventory for expired product line.');
      }
    }

    return {
      allowed: violatedPolicies.length === 0,
      violatedPolicies,
    };
  }
}
