import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { ROITracker, Recommendation, RecommendationType, RecommendationCategory, RecommendationPriority, RecommendationStatus } from '../../../lib/forecast/recommendations';

describe('ROITracker Tests', () => {
  test('should calculate suggested vs realized savings and accuracy percentage', () => {
    const tracker = new ROITracker();

    const recs: Recommendation[] = [
      {
        id: 'REC-ROI-1',
        storeId: 'store-1',
        type: RecommendationType.ORDER_MORE,
        category: RecommendationCategory.INVENTORY,
        priority: RecommendationPriority.HIGH,
        status: RecommendationStatus.EXECUTED,
        version: 1,
        confidence: 0.90,
        explainabilityScore: 90,
        riskScore: 20,
        score: 85,
        reason: 'Reorder',
        financialImpact: { expectedProfit: 2000, expectedSavings: 500, expectedRevenue: 5000, expectedCost: 3000, expectedInventoryReduction: 0, blockedCapitalReleased: 1000 },
        generatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const metrics = tracker.calculateROI(recs);
    assert.strictEqual(metrics.totalSuggestedSavings, 500);
    assert.strictEqual(metrics.totalRealizedSavings, 460);
    assert.ok(metrics.accuracyPct > 0);
  });
});
