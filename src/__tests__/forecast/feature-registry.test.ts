import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { FeatureRegistry } from '../../lib/forecast/features/feature-registry';
import { RawSalesFeatureBuilder } from '../../lib/forecast/features/feature-builders/raw/raw-sales-builder';
import { DerivedSalesFeatureBuilder } from '../../lib/forecast/features/feature-builders/derived/derived-sales-builder';

describe('FeatureRegistry - Unit Tests', () => {
  test('should register, retrieve, and filter builders by stage', () => {
    const registry = new FeatureRegistry();
    const rawSales = new RawSalesFeatureBuilder();
    const derivedSales = new DerivedSalesFeatureBuilder();

    registry.registerBuilder(rawSales);
    registry.registerBuilder(derivedSales);

    assert.equal(registry.getAllBuilders().length, 2);
    assert.equal(registry.getRawBuilders().length, 1);
    assert.equal(registry.getDerivedBuilders().length, 1);

    assert.equal(registry.getBuilder('RawSalesFeatureBuilder'), rawSales);
    assert.equal(registry.getBuilder('DerivedSalesFeatureBuilder'), derivedSales);
  });
});
