import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { RecommendationMarketplace } from '../../../lib/forecast/recommendations';

describe('RecommendationMarketplace Plugins Tests', () => {
  test('should evaluate registered marketplace plugins', async () => {
    const marketplace = new RecommendationMarketplace();

    const input = {
      storeId: 'store-1',
      productId: 'P-MILK',
      productName: 'Whole Milk',
      currentStock: 5,
      safetyStock: 20,
      reorderPoint: 30,
      forecastDemand: 50,
      unitCost: 100,
      unitPrice: 140,
      expiryDate: new Date(Date.now() + 5 * 86400000).toISOString(),
    };

    const results = await marketplace.evaluateAll(input);
    assert.ok(results.length > 0);
    assert.strictEqual(results.some(r => r.category === 'INVENTORY' || r.category === 'EXPIRY'), true);
  });
});
