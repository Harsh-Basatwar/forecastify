import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { ImpactSimulator, RecommendationType } from '../../../lib/forecast/recommendations';

describe('ImpactSimulator Tests', () => {
  test('should compute before/after/delta metrics accurately', () => {
    const simulator = new ImpactSimulator();

    const input = {
      storeId: 'store-1',
      productId: 'P-1',
      productName: 'Sample Product',
      currentStock: 20,
      safetyStock: 30,
      reorderPoint: 40,
      forecastDemand: 80,
      unitCost: 100,
      unitPrice: 150,
    };

    const impact = {
      expectedProfit: 3000,
      expectedSavings: 200,
      expectedRevenue: 9000,
      expectedCost: 6000,
      expectedInventoryReduction: 0,
      blockedCapitalReleased: 0,
    };

    const sim = simulator.simulateImpact(RecommendationType.ORDER_MORE, input, impact);

    assert.strictEqual(sim.before.inventoryLevel, 20);
    assert.strictEqual(sim.after.inventoryLevel, 80);
    assert.strictEqual(sim.delta.inventoryDelta, 60);
    assert.strictEqual(sim.delta.expectedProfitDelta, 3000);
  });
});
