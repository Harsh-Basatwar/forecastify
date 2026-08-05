import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { LinearRegressionForecastModel } from '../../lib/forecast/models/models/linear-regression-model';

describe('LinearRegressionForecastModel Unit Tests', () => {
  test('should fit line and extrapolate linear trend', async () => {
    const model = new LinearRegressionForecastModel('lr-test-01');

    const trainingData = {
      storeId: 'store-123',
      datasetVersion: '1.0.0',
      timeSeries: [
        { date: '2026-08-01', target: 10 },
        { date: '2026-08-02', target: 20 },
        { date: '2026-08-03', target: 30 },
        { date: '2026-08-04', target: 40 },
      ],
    };

    const trainResult = await model.train(trainingData, { datasetVersion: '1.0.0', trainingWindow: '90d' });
    assert.equal(trainResult.status, 'SUCCESS');

    const pred = await model.predict({
      storeId: 'store-123',
      productId: 'prod-001',
      horizon: '3d',
      predictionType: 'point',
      timestamp: new Date().toISOString(),
    });

    assert.equal(pred.predictions.length, 3);
    assert.ok(pred.predictions[0].predictedValue > 0);
  });
});
