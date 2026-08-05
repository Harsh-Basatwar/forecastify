import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { FeatureDependencyGraph } from '../../lib/forecast/features/feature-graph';
import { RawSalesFeatureBuilder } from '../../lib/forecast/features/feature-builders/raw/raw-sales-builder';
import { DerivedSalesFeatureBuilder } from '../../lib/forecast/features/feature-builders/derived/derived-sales-builder';
import { FeatureEngineeringPipeline } from '../../lib/forecast/features/feature-engineering-pipeline';

describe('FeatureDependencyGraph & Snapshots - Production Unit Tests', () => {
  test('should resolve graph dependencies in correct topological order', () => {
    const graph = new FeatureDependencyGraph();
    const rawSales = new RawSalesFeatureBuilder();
    const derivedSales = new DerivedSalesFeatureBuilder();

    graph.addNode(rawSales);
    graph.addNode(derivedSales);

    const sorted = graph.resolveDependencies();
    assert.equal(sorted.length, 2);
    assert.equal(sorted[0].name, 'RawSalesFeatureBuilder');
    assert.equal(sorted[1].name, 'DerivedSalesFeatureBuilder');
  });

  test('should detect circular graph dependencies', () => {
    const graph = new FeatureDependencyGraph();
    const builderA: any = { name: 'A', stage: 'derived', dependencies: ['B'], build: async () => ({ features: {}, lineage: {} }) };
    const builderB: any = { name: 'B', stage: 'derived', dependencies: ['A'], build: async () => ({ features: {}, lineage: {} }) };

    graph.addNode(builderA);
    graph.addNode(builderB);

    assert.throws(() => graph.resolveDependencies(), /Cycle detected/);
  });

  test('should produce READY lifecycle state and reproducible FeatureSnapshot', async () => {
    const pipeline = new FeatureEngineeringPipeline();
    const result = await pipeline.executePipeline({
      storeId: 'store-snapshot-test',
      productId: 'prod-snapshot-1',
      rawInput: {
        salesHistory: [{ date: '2026-08-01', quantity: 15, amount: 150 }],
        inventory: { currentStock: 80, availableStock: 70, reservedStock: 10, incomingStock: 0, onOrderStock: 0, safetyStock: 20, reorderPoint: 30 },
      },
    });

    assert.equal(result.lifecycleState, 'READY');
    assert.ok(result.snapshot);
    assert.equal(result.snapshot.storeId, 'store-snapshot-test');
    assert.equal(result.snapshot.productId, 'prod-snapshot-1');
    assert.equal(result.snapshot.lifecycleState, 'READY');
    assert.ok(result.snapshot.snapshotId.startsWith('snap-'));
  });
});
