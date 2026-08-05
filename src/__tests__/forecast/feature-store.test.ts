import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { FeatureStore } from '../../lib/forecast/features/feature-store';
import { ForecastRepository } from '../../lib/forecast/forecast-repository';
import { ForecastCacheAdapter } from '../../lib/forecast/forecast-cache-adapter';

describe('FeatureStore - Unit Tests', () => {
  test('should validate, save, cache, and retrieve feature vectors', async () => {
    const repo = new ForecastRepository();
    const cache = new ForecastCacheAdapter();
    const store = new FeatureStore(repo, cache);

    const sampleVector: any = {
      storeId: 'store-test-uuid',
      productId: 'prod-999',
      timestamp: new Date().toISOString(),
      rawFeatures: { raw_current_stock: 50 },
      derivedFeatures: { derived_stock_cover_days: 5.0 },
      features: { raw_current_stock: 50, derived_stock_cover_days: 5.0 },
      metadata: { schemaVersion: '2.0.0' },
    };

    const saved = await store.saveFeatureVector(sampleVector);
    assert.equal(saved.storeId, 'store-test-uuid');
    assert.equal(saved.productId, 'prod-999');
    assert.ok(saved.qualityMetrics);

    const fetched = await store.getLatestFeatureVector('store-test-uuid', 'prod-999');
    assert.ok(fetched);
    assert.equal(fetched.storeId, 'store-test-uuid');
  });
});
