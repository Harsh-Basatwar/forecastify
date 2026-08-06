import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { RecommendationExecutor, RecommendationRepository, RecommendationEventStore, Recommendation, RecommendationType, RecommendationCategory, RecommendationPriority, RecommendationStatus } from '../../../lib/forecast/recommendations';

describe('RecommendationExecutor Tests', () => {
  test('should execute downstream action and record lifecycle status', async () => {
    const repo = new RecommendationRepository();
    const eventStore = new RecommendationEventStore();
    const executor = new RecommendationExecutor(repo, eventStore);

    const rec: Recommendation = {
      id: 'REC-EXEC-1',
      storeId: 'store-1',
      productId: 'P-1',
      type: RecommendationType.ORDER_MORE,
      category: RecommendationCategory.INVENTORY,
      priority: RecommendationPriority.HIGH,
      status: RecommendationStatus.GENERATED,
      version: 1,
      confidence: 0.90,
      explainabilityScore: 90,
      riskScore: 20,
      score: 85,
      reason: 'Low stock level',
      financialImpact: { expectedProfit: 1000, expectedSavings: 0, expectedRevenue: 2000, expectedCost: 1000, expectedInventoryReduction: 0, blockedCapitalReleased: 0 },
      generatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const res = await executor.executeRecommendation(rec);
    assert.strictEqual(res.status, 'SUCCESS');
    assert.ok(res.downstreamReferenceId !== undefined);
  });
});
