import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { ConflictResolver, Recommendation, RecommendationType, RecommendationCategory, RecommendationPriority, RecommendationStatus } from '../../../lib/forecast/recommendations';

describe('ConflictResolver Tests', () => {
  test('should detect and resolve conflicting recommendations (Increase Price vs Reduce Price)', () => {
    const resolver = new ConflictResolver();

    const rec1: Recommendation = {
      id: 'REC-INC-PRICE',
      storeId: 'store-1',
      productId: 'PROD-X',
      type: RecommendationType.INCREASE_PRICE,
      category: RecommendationCategory.PRICING,
      priority: RecommendationPriority.HIGH,
      status: RecommendationStatus.GENERATED,
      version: 1,
      confidence: 0.96,
      explainabilityScore: 95,
      riskScore: 10,
      score: 92,
      reason: 'High demand elasticity',
      financialImpact: { expectedProfit: 1200, expectedSavings: 0, expectedRevenue: 2400, expectedCost: 1200, expectedInventoryReduction: 0, blockedCapitalReleased: 0 },
      generatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const rec2: Recommendation = {
      id: 'REC-RED-PRICE',
      storeId: 'store-1',
      productId: 'PROD-X',
      type: RecommendationType.REDUCE_PRICE,
      category: RecommendationCategory.PRICING,
      priority: RecommendationPriority.LOW,
      status: RecommendationStatus.GENERATED,
      version: 1,
      confidence: 0.60,
      explainabilityScore: 60,
      riskScore: 40,
      score: 55,
      reason: 'Competitor discount',
      financialImpact: { expectedProfit: 200, expectedSavings: 0, expectedRevenue: 800, expectedCost: 600, expectedInventoryReduction: 0, blockedCapitalReleased: 0 },
      generatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { resolvedRecommendations, discardedConflicts } = resolver.resolveConflicts([rec1, rec2]);

    assert.strictEqual(resolvedRecommendations.length, 1);
    assert.strictEqual(resolvedRecommendations[0].id, 'REC-INC-PRICE');
    assert.strictEqual(discardedConflicts.length, 1);
    assert.strictEqual(discardedConflicts[0].winner.id, 'REC-INC-PRICE');
  });
});
