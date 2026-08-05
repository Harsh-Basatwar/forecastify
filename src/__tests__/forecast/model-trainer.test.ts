import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { TrainingPipeline } from '../../lib/forecast/models/manager/training-pipeline';
import { ModelRegistry } from '../../lib/forecast/models/registry/model-registry';
import { LocalArtifactStore } from '../../lib/forecast/models/artifacts/local-artifact-store';
import { MovingAverageForecastModel } from '../../lib/forecast/models/models/moving-average-model';

describe('TrainingPipeline Unit Tests', () => {
  test('should execute training pipeline, persist artifact in store, and update model status', async () => {
    const registry = new ModelRegistry();
    const artifactStore = new LocalArtifactStore();
    const pipeline = new TrainingPipeline(registry, artifactStore);

    const model = new MovingAverageForecastModel('trainer-pipeline-model');
    registry.registerModel(model, 'DRAFT');

    const result = await pipeline.runTraining(
      model,
      {
        storeId: 'store-100',
        datasetVersion: '1.0.0',
        timeSeries: [
          { date: '2026-08-01', target: 50 },
          { date: '2026-08-02', target: 60 },
        ],
      },
      {
        datasetVersion: '1.0.0',
        trainingWindow: '90d',
      }
    );

    assert.equal(result.status, 'SUCCESS');
    assert.ok(result.artifactUri);
    assert.equal(registry.getMetadata('trainer-pipeline-model')?.status, 'TRAINED');
    assert.equal(await artifactStore.hasArtifact(result.artifactUri), true);
  });
});
