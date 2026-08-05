import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { FeatureEngineeringPipeline } from '../../lib/forecast/features/feature-engineering-pipeline';

describe('FeatureEngineeringPipeline - Full Orchestration Integration Unit Tests', () => {
  test('should execute complete pipeline with raw & derived builders, validation, normalization, lineage, and hooks', async () => {
    let hookExecuted = false;

    const pipeline = new FeatureEngineeringPipeline(undefined, {
      afterValidation: async (vec) => {
        hookExecuted = true;
        assert.ok(vec.qualityMetrics);
      },
    });

    const salesHistory = Array.from({ length: 14 }, (_, i) => ({
      date: `2026-07-${i + 1}`,
      quantity: 10 + i,
      amount: (10 + i) * 50,
    }));

    const result = await pipeline.executePipeline({
      storeId: 'store-demo-uuid',
      productId: 'prod-001',
      rawInput: {
        salesHistory,
        inventory: {
          currentStock: 150,
          availableStock: 120,
          reservedStock: 30,
          incomingStock: 40,
          onOrderStock: 40,
          safetyStock: 25,
          reorderPoint: 35,
        },
        pricing: {
          currentSellingPrice: 50,
          purchasePrice: 30,
          mrp: 60,
          discountAmount: 10,
          historicalPriceChangesCount: 2,
        },
      },
      normalizationMethod: 'MinMax',
    });

    assert.equal(hookExecuted, true);
    assert.equal(result.storeId, 'store-demo-uuid');
    assert.equal(result.productId, 'prod-001');

    // Check Raw & Derived Feature Maps
    assert.ok(result.rawFeatures['raw_current_stock'] !== undefined);
    assert.ok(result.derivedFeatures['derived_rolling_mean_7d'] !== undefined);
    assert.ok(result.derivedFeatures['derived_stock_cover_days'] !== undefined);

    // Check Lineage & Metadata
    assert.ok(result.lineage['raw_daily_sales_quantity']);
    assert.ok(result.lineage['derived_rolling_mean_7d']);
    assert.equal(result.metadata.schemaVersion, '2.0.0');
    assert.equal(result.metadata.normalizationMethod, 'MinMax');
    assert.ok(result.metadata.featureHash.startsWith('h_'));
    assert.ok(result.qualityMetrics.qualityScore > 0);
  });
});
