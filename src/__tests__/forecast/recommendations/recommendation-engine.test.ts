import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { RecommendationEngine, RecommendationRuleInput } from '../../../lib/forecast/recommendations';

describe('RecommendationEngine Pipeline Tests', () => {
  test('should generate recommendations and decision graph from forecast inputs', async () => {
    const engine = new RecommendationEngine();

    const inputs: RecommendationRuleInput[] = [
      {
        storeId: 'test-store-01',
        productId: 'PROD-A',
        productName: 'Organic Whole Milk',
        currentStock: 10,
        safetyStock: 25,
        reorderPoint: 35,
        forecastDemand: 70,
        forecastConfidence: 0.90,
        unitCost: 50,
        unitPrice: 75,
        supplierLeadTimeDays: 5,
        supplierReliabilityPct: 95,
        predictionId: 'PRED-001',
        featureSnapshotId: 'SNAP-001',
      },
    ];

    const graph = await engine.generateRecommendations(inputs);

    assert.ok(graph.nodes.length > 0);
    const rec = graph.nodes[0];
    assert.strictEqual(rec.storeId, 'test-store-01');
    assert.strictEqual(rec.productId, 'PROD-A');
    assert.ok(rec.score > 0);
    assert.ok(rec.explainabilityScore > 0);
    assert.ok(rec.financialImpact.expectedProfit > 0);
  });
});
