import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { EnsembleForecastModel } from '../../lib/forecast/models/models/ensemble-model';
import { NaiveForecastModel } from '../../lib/forecast/models/models/naive-model';
import { MovingAverageForecastModel } from '../../lib/forecast/models/models/moving-average-model';
import { WeightedAverageStrategy, MedianStrategy } from '../../lib/forecast/models/ensemble/ensemble-strategy';

describe('EnsembleForecastModel Unit Tests', () => {
  test('should combine sub-models using SimpleAverage and WeightedAverage strategies', async () => {
    const naive = new NaiveForecastModel('sub-naive');
    const ma = new MovingAverageForecastModel('sub-ma', 3);

    const trainingData = {
      storeId: 'store-123',
      datasetVersion: '1.0.0',
      timeSeries: [
        { date: '2026-08-01', target: 100 },
        { date: '2026-08-02', target: 100 },
        { date: '2026-08-03', target: 100 },
      ],
    };

    const config = { datasetVersion: '1.0.0', trainingWindow: '90d' };
    await naive.train(trainingData, config);
    await ma.train(trainingData, config);

    const ensemble = new EnsembleForecastModel('ensemble-test-01', [naive, ma]);
    const predSimple = await ensemble.predict({
      storeId: 'store-123',
      productId: 'prod-001',
      horizon: '3d',
      predictionType: 'point',
      timestamp: new Date().toISOString(),
    });

    assert.equal(predSimple.predictions.length, 3);
    assert.equal(predSimple.predictions[0].predictedValue, 100);

    ensemble.setStrategy(new WeightedAverageStrategy());
    ensemble.setSubModels([naive, ma], [0.8, 0.2]);

    const predWeighted = await ensemble.predict({
      storeId: 'store-123',
      productId: 'prod-001',
      horizon: '3d',
      predictionType: 'point',
      timestamp: new Date().toISOString(),
    });

    assert.equal(predWeighted.predictions[0].predictedValue, 100);
  });
});
