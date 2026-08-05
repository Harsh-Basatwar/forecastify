import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { FeatureExecutionPlanner } from '../../lib/forecast/features/feature-execution-planner';
import { RawSalesFeatureBuilder } from '../../lib/forecast/features/feature-builders/raw/raw-sales-builder';
import { RawInventoryFeatureBuilder } from '../../lib/forecast/features/feature-builders/raw/raw-inventory-builder';
import { DerivedSalesFeatureBuilder } from '../../lib/forecast/features/feature-builders/derived/derived-sales-builder';

describe('FeatureExecutionPlanner - Unit Tests', () => {
  test('should stage raw builders into Stage 1 (parallel) and derived into Stage 2', () => {
    const planner = new FeatureExecutionPlanner();
    const rawSales = new RawSalesFeatureBuilder();
    const rawInv = new RawInventoryFeatureBuilder();
    const derivedSales = new DerivedSalesFeatureBuilder();

    const stages = planner.planExecution([rawSales, rawInv, derivedSales]);

    assert.equal(stages.length, 2);
    assert.equal(stages[0].stageName, 'raw');
    assert.equal(stages[0].isParallel, true);
    assert.equal(stages[0].builders.length, 2);

    assert.equal(stages[1].stageName, 'derived');
    assert.equal(stages[1].builders.length, 1);
    assert.equal(stages[1].builders[0].name, 'DerivedSalesFeatureBuilder');
  });
});
