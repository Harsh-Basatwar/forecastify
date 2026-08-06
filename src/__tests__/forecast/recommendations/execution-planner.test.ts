import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { ExecutionPlanner, Recommendation, RecommendationType, RecommendationCategory, RecommendationPriority, RecommendationStatus } from '../../../lib/forecast/recommendations';

describe('ExecutionPlanner Tests', () => {
  test('should plan multi-step execution chains', () => {
    const planner = new ExecutionPlanner();

    const rec: Recommendation = {
      id: 'REC-ORDER',
      storeId: 'store-1',
      productId: 'P-1',
      type: RecommendationType.ORDER_MORE,
      category: RecommendationCategory.INVENTORY,
      priority: RecommendationPriority.CRITICAL,
      status: RecommendationStatus.GENERATED,
      version: 1,
      confidence: 0.9,
      explainabilityScore: 90,
      riskScore: 80,
      score: 85,
      reason: 'Deficit stock',
      financialImpact: { expectedProfit: 1000, expectedSavings: 0, expectedRevenue: 2000, expectedCost: 1000, expectedInventoryReduction: 0, blockedCapitalReleased: 0 },
      generatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const chain = planner.planChain(rec);
    assert.strictEqual(chain.steps.length, 3);
    assert.strictEqual(chain.steps[0].targetModule, 'PROCUREMENT');
    assert.strictEqual(chain.steps[1].targetModule, 'INVENTORY');
  });
});
