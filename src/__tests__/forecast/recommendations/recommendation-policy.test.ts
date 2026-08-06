import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { PolicyEngine, RecommendationType } from '../../../lib/forecast/recommendations';

describe('PolicyEngine Tests', () => {
  test('should enforce warehouse capacity policy bounds', () => {
    const policyEngine = new PolicyEngine();

    const input = {
      storeId: 'store-1',
      productId: 'P-1',
      productName: 'Bulky Cargo',
      currentStock: 950,
      safetyStock: 50,
      reorderPoint: 100,
      forecastDemand: 300,
      unitCost: 10,
      unitPrice: 20,
      warehouseCapacityMax: 1000,
    };

    const res = policyEngine.validatePolicies(RecommendationType.ORDER_MORE, input);
    assert.strictEqual(res.allowed, false);
    assert.ok(res.violatedPolicies.length > 0);
  });
});
