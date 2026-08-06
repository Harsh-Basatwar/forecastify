import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { RuleDSLEngine, RecommendationPriority, RecommendationType } from '../../../lib/forecast/recommendations';

describe('RuleDSLEngine Tests', () => {
  test('should parse and trigger Rule DSL condition expression', () => {
    const dslEngine = new RuleDSLEngine();

    const rule = {
      id: 'R-1',
      storeId: 'store-1',
      ruleName: 'Test Reorder DSL Rule',
      category: 'INVENTORY' as any,
      whenClause: 'forecast > stock AND supplierDelay > 3',
      thenAction: RecommendationType.ORDER_MORE,
      priority: RecommendationPriority.HIGH,
      enabled: true,
    };

    const input = {
      storeId: 'store-1',
      productId: 'P-1',
      productName: 'Rice 5kg',
      currentStock: 10,
      safetyStock: 20,
      reorderPoint: 30,
      forecastDemand: 50,
      unitCost: 200,
      unitPrice: 300,
      supplierLeadTimeDays: 5,
    };

    const res = dslEngine.evaluateRule(rule, input);

    assert.strictEqual(res.triggered, true);
    assert.strictEqual(res.action, RecommendationType.ORDER_MORE);
  });
});
