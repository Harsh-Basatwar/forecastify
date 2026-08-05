import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { FeatureNormalizer } from '../../lib/forecast/features/feature-normalizer';

describe('Normalization Strategies - Unit Tests', () => {
  const sampleVector: any = {
    storeId: 'store-1',
    productId: 'prod-1',
    timestamp: '2026-08-06T00:00:00Z',
    features: {
      sales: 50,
      stock: 100,
    },
    metadata: { schemaVersion: '2.0.0' },
  };

  test('Identity normalization returns unscaled features', () => {
    const normalizer = new FeatureNormalizer();
    const res = normalizer.normalize(sampleVector, 'Identity');
    assert.equal(res.features.sales, 50);
    assert.equal(res.features.stock, 100);
    assert.equal(res.metadata.normalizationMethod, 'Identity');
  });

  test('MinMax normalization scales within [0, 1]', () => {
    const normalizer = new FeatureNormalizer();
    const bounds = {
      sales: { min: 0, max: 100 },
      stock: { min: 0, max: 200 },
    };

    const res = normalizer.normalize(sampleVector, 'MinMax', bounds);
    assert.equal(res.features.sales, 0.5);
    assert.equal(res.features.stock, 0.5);
    assert.equal(res.metadata.normalizationMethod, 'MinMax');
  });

  test('ZScore normalization calculates standard score', () => {
    const normalizer = new FeatureNormalizer();
    const bounds = {
      sales: { mean: 50, stdDev: 10 },
      stock: { mean: 80, stdDev: 20 },
    };

    const res = normalizer.normalize(sampleVector, 'ZScore', bounds);
    assert.equal(res.features.sales, 0); // (50 - 50) / 10
    assert.equal(res.features.stock, 1); // (100 - 80) / 20
    assert.equal(res.metadata.normalizationMethod, 'ZScore');
  });
});
