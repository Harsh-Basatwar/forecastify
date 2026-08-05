import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { InferencePipeline } from '../../lib/forecast/models/manager/inference-pipeline';
import { ModelRegistry } from '../../lib/forecast/models/registry/model-registry';
import { NaiveForecastModel } from '../../lib/forecast/models/models/naive-model';

describe('InferencePipeline Unit Tests', () => {
  test('should run inference and return standardized PredictionResult object without recommendation leaks', async () => {
    const registry = new ModelRegistry();
    const model = new NaiveForecastModel('inference-model-01');
    await model.train(
      {
        storeId: 'store-123',
        datasetVersion: '1.0.0',
        timeSeries: [{ date: '2026-08-01', target: 250 }],
      },
      { datasetVersion: '1.0.0', trainingWindow: '90d' }
    );

    registry.registerModel(model, 'READY');
    registry.setDeployed('store-123', 'inference-model-01');

    const pipeline = new InferencePipeline(registry);
    const result = await pipeline.runInference({
      storeId: 'store-123',
      productId: 'prod-999',
      horizon: '7d',
      predictionType: 'point',
      timestamp: new Date().toISOString(),
    });

    assert.equal(result.storeId, 'store-123');
    assert.equal(result.productId, 'prod-999');
    assert.equal(result.predictions.length, 7);
    assert.equal(result.predictions[0].predictedValue, 250);
    assert.ok(result.predictionSchemaVersion);
    assert.ok(result.modelVersion);

    // Verify ML boundary (NO business recommendation attributes present in prediction output)
    assert.equal((result as any).recommendation, undefined);
    assert.equal((result as any).orderQuantity, undefined);
  });
});
