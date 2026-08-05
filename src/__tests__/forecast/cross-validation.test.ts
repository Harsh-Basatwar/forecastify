import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { TrainingPipeline } from '../../lib/forecast/models/manager/training-pipeline';
import { ModelRegistry } from '../../lib/forecast/models/registry/model-registry';
import { LocalArtifactStore } from '../../lib/forecast/models/artifacts/local-artifact-store';
import { LinearRegressionForecastModel } from '../../lib/forecast/models/models/linear-regression-model';

describe('Time-Series Cross Validation Unit Tests', () => {
  test('should execute expanding and rolling window time-series cross validation', async () => {
    const registry = new ModelRegistry();
    const artifactStore = new LocalArtifactStore();
    const pipeline = new TrainingPipeline(registry, artifactStore);

    const model = new LinearRegressionForecastModel('cv-test-model');
    registry.registerModel(model, 'DRAFT');

    const timeSeries = Array.from({ length: 30 }, (_, i) => ({
      date: `2026-07-${i + 1}`,
      target: (i + 1) * 10,
    }));

    const result = await pipeline.runTraining(
      model,
      { storeId: 'store-cv', datasetVersion: '1.0.0', timeSeries },
      {
        datasetVersion: '1.0.0',
        trainingWindow: '90d',
        crossValidationConfig: {
          strategy: 'ExpandingWindowValidation',
          folds: 3,
        },
      }
    );

    assert.equal(result.status, 'SUCCESS');
    assert.ok(result.cvResults);
    assert.equal(result.cvResults.length, 3);
    assert.ok(result.cvResults[0].metrics.mae >= 0);
  });
});
