import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { FeatureValidator } from '../../lib/forecast/features/feature-validator';

describe('Validation Hierarchy - Unit Tests', () => {
  test('should pass validation for clean feature vector', () => {
    const validator = new FeatureValidator();
    const vector: any = {
      storeId: 'store-1',
      productId: 'prod-1',
      timestamp: '2026-08-06T00:00:00Z',
      features: {
        raw_current_stock: 50,
        raw_current_selling_price: 100,
        raw_average_lead_time_days: 7,
      },
      metadata: { schemaVersion: '2.0.0' },
    };

    const res = validator.validate(vector);
    assert.equal(res.isValid, true);
    assert.equal(res.errors.length, 0);
    assert.equal(res.qualityMetrics.qualityScore, 1.0);
  });

  test('should catch business errors like negative stock or price', () => {
    const validator = new FeatureValidator();
    const vector: any = {
      storeId: 'store-1',
      productId: 'prod-1',
      timestamp: '2026-08-06T00:00:00Z',
      features: {
        raw_current_stock: -10,
        raw_current_selling_price: -50,
      },
      metadata: { schemaVersion: '2.0.0' },
    };

    const res = validator.validate(vector);
    assert.equal(res.isValid, false);
    assert.ok(res.errors.length >= 2);
    assert.ok(res.qualityMetrics.qualityScore < 1.0);
  });

  test('should detect NaN features via StatisticalValidator', () => {
    const validator = new FeatureValidator();
    const vector: any = {
      storeId: 'store-1',
      productId: 'prod-1',
      timestamp: '2026-08-06T00:00:00Z',
      features: {
        raw_current_stock: NaN,
      },
      metadata: { schemaVersion: '2.0.0' },
    };

    const res = validator.validate(vector);
    assert.equal(res.isValid, false);
    assert.ok(res.errors.some((e) => e.includes('NaN')));
  });
});
