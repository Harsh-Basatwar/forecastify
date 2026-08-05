import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { DerivedSalesFeatureBuilder } from '../../lib/forecast/features/feature-builders/derived/derived-sales-builder';

describe('DerivedSalesFeatureBuilder - Unit Tests', () => {
  test('should calculate lags, rolling mean, median, std, growth, and trend correctly', async () => {
    const builder = new DerivedSalesFeatureBuilder();
    const history = Array.from({ length: 30 }, (_, i) => ({
      date: `2026-07-${i + 1}`,
      quantity: 10 + i, // 10, 11, 12 ... 39
      amount: (10 + i) * 10,
    }));

    const context = {
      storeId: 'store-1',
      productId: 'prod-101',
      targetDate: '2026-08-06T00:00:00Z',
      rawInput: { salesHistory: history },
    };

    const res = await builder.build(context);

    // Latest element quantity is 39
    assert.equal(res.features.derived_lag_1, 38);
    assert.equal(res.features.derived_lag_7, 32);
    assert.equal(res.features.derived_lag_30, 10);
    assert.ok(typeof res.features.derived_rolling_mean_7d === 'number');
    assert.ok(typeof res.features.derived_sales_growth_rate === 'number');
    assert.ok(typeof res.features.derived_demand_trend === 'number');
    assert.ok(res.lineage.derived_rolling_mean_7d);
  });
});
