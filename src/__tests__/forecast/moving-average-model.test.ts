import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { MovingAverageForecastModel } from '../../lib/forecast/models/models/moving-average-model';

describe('MovingAverageForecastModel Unit Tests', () => {
  test('should compute moving average and serve predictions with confidence bounds', async () => {
    const model = new MovingAverageForecastModel('ma-test-01', 3);

    const trainingData = {
      storeId: 'store-123',
      datasetVersion: '1.0.0',
      timeSeries: [
        { date: '2026-08-01', target: 10 },
        { date: '2026-08-02', target: 20 },
        { date: '2026-08-03', target: 30 },
      ],
    };

    const result = await model.train(trainingData, { datasetVersion: '1.0.0', trainingWindow: '90d' });
    assert.equal(result.status, 'SUCCESS');

    const pred = await model.predict({
      storeId: 'store-123',
      productId: 'prod-001',
      horizon: '5d',
      predictionType: 'point',
      timestamp: new Date().toISOString(),
    });

    assert.equal(pred.predictions.length, 5);
    // Moving average of 10, 20, 30 is 20
    assert.equal(pred.predictions[0].predictedValue, 20);
    assert.ok(pred.predictions[0].lowerBound! < 20);
    assert.ok(pred.predictions[0].upperBound! > 20);
  });
});
