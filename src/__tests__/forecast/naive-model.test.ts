import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { NaiveForecastModel } from '../../lib/forecast/models/models/naive-model';

describe('NaiveForecastModel Unit Tests', () => {
  test('should train, predict, evaluate, and serialize correctly', async () => {
    const model = new NaiveForecastModel('naive-test-01');
    assert.equal(model.id, 'naive-test-01');
    assert.equal(model.modelType, 'naive');

    const trainingData = {
      storeId: 'store-123',
      datasetVersion: '1.0.0',
      timeSeries: [
        { date: '2026-08-01', target: 50 },
        { date: '2026-08-02', target: 65 },
        { date: '2026-08-03', target: 80 },
      ],
    };

    const trainResult = await model.train(trainingData, { datasetVersion: '1.0.0', trainingWindow: '90d' });
    assert.equal(trainResult.status, 'SUCCESS');
    assert.ok(trainResult.artifactChecksum);

    const inferenceResult = await model.predict({
      storeId: 'store-123',
      productId: 'prod-001',
      horizon: '7d',
      predictionType: 'point',
      timestamp: new Date().toISOString(),
    });

    assert.equal(inferenceResult.predictions.length, 7);
    assert.equal(inferenceResult.predictions[0].predictedValue, 80);
    assert.ok(inferenceResult.intervals);

    const evalReport = await model.evaluate({
      actuals: [80, 80, 80, 80, 80],
      predictions: [80, 80, 80, 80, 80],
    });
    assert.equal(evalReport.metrics.mae, 0);
    assert.equal(evalReport.metrics.mape, 0);

    const artifact = await model.save();
    assert.equal(artifact.modelId, 'naive-test-01');

    const newModel = new NaiveForecastModel('naive-test-01');
    await newModel.load(artifact);
    const loadedPred = await newModel.predict({
      storeId: 'store-123',
      productId: 'prod-001',
      horizon: '3d',
      predictionType: 'point',
      timestamp: new Date().toISOString(),
    });
    assert.equal(loadedPred.predictions[0].predictedValue, 80);
  });
});
