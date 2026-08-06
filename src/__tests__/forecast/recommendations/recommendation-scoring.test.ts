import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { RecommendationScoringEngine, RecommendationPriority } from '../../../lib/forecast/recommendations';

describe('RecommendationScoringEngine Tests', () => {
  test('should compute composite recommendation score between 0 and 100', () => {
    const scoringEngine = new RecommendationScoringEngine();

    const impact = {
      expectedProfit: 5000,
      expectedSavings: 1000,
      expectedRevenue: 15000,
      expectedCost: 10000,
      expectedInventoryReduction: 0,
      blockedCapitalReleased: 2000,
    };

    const score = scoringEngine.calculateScore(RecommendationPriority.CRITICAL, 0.92, 90, 75, impact);

    assert.ok(score >= 0);
    assert.ok(score <= 100);
    assert.ok(score > 70);
  });
});
