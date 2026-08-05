import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { RawInventoryFeatureBuilder } from '../../lib/forecast/features/feature-builders/raw/raw-inventory-builder';
import { DerivedInventoryFeatureBuilder } from '../../lib/forecast/features/feature-builders/derived/derived-inventory-builder';

describe('Inventory Features - Unit Tests', () => {
  test('should generate raw inventory features and derived stock cover days', async () => {
    const rawBuilder = new RawInventoryFeatureBuilder();
    const derivedBuilder = new DerivedInventoryFeatureBuilder();

    const context = {
      storeId: 'store-1',
      productId: 'prod-101',
      targetDate: '2026-08-06T00:00:00Z',
      rawInput: {
        inventory: {
          currentStock: 100,
          availableStock: 80,
          reservedStock: 20,
          incomingStock: 50,
          onOrderStock: 50,
          safetyStock: 30,
          reorderPoint: 40,
        },
      },
    };

    const rawRes = await rawBuilder.build(context);
    assert.equal(rawRes.features.raw_current_stock, 100);
    assert.equal(rawRes.features.raw_available_stock, 80);

    const derivedContext = {
      ...context,
      existingRawFeatures: {
        ...rawRes.features,
        raw_daily_sales_quantity: 10,
      },
    };

    const derivedRes = await derivedBuilder.build(derivedContext);
    assert.equal(derivedRes.features.derived_stock_cover_days, 8.0); // 80 / 10
    assert.ok(typeof derivedRes.features.derived_inventory_turnover === 'number');
  });
});
