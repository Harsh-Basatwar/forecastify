import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { RawSalesFeatureBuilder } from '../../lib/forecast/features/feature-builders/raw/raw-sales-builder';

describe('RawSalesFeatureBuilder - Unit Tests', () => {
  test('should build raw sales features correctly from sales history', async () => {
    const builder = new RawSalesFeatureBuilder();
    const context = {
      storeId: 'store-1',
      productId: 'prod-101',
      targetDate: '2026-08-06T00:00:00Z',
      rawInput: {
        salesHistory: [
          { date: '2026-08-01', quantity: 10, amount: 100 },
          { date: '2026-08-02', quantity: 15, amount: 150 },
          { date: '2026-08-03', quantity: 20, amount: 200 },
        ],
      },
    };

    const res = await builder.build(context);

    assert.equal(res.features.raw_daily_sales_quantity, 20);
    assert.equal(res.features.raw_daily_sales_amount, 200);
    assert.equal(res.features.raw_sales_history_length, 3);
    assert.ok(res.lineage.raw_daily_sales_quantity);
  });

  test('should handle empty sales history gracefully with zero defaults', async () => {
    const builder = new RawSalesFeatureBuilder();
    const context = {
      storeId: 'store-1',
      productId: 'prod-101',
      targetDate: '2026-08-06T00:00:00Z',
      rawInput: {},
    };

    const res = await builder.build(context);
    assert.equal(res.features.raw_daily_sales_quantity, 0);
    assert.equal(res.features.raw_daily_sales_amount, 0);
    assert.equal(res.features.raw_sales_history_length, 0);
  });
});
