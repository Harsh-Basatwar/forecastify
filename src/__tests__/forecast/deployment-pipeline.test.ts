import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { DeploymentPipeline } from '../../lib/forecast/models/manager/deployment-pipeline';
import { ModelRegistry } from '../../lib/forecast/models/registry/model-registry';
import { NaiveForecastModel } from '../../lib/forecast/models/models/naive-model';
import { MovingAverageForecastModel } from '../../lib/forecast/models/models/moving-average-model';

describe('DeploymentPipeline & Rollback Unit Tests', () => {
  test('should validate candidate, deploy model, and support atomic rollback', async () => {
    const registry = new ModelRegistry();
    const model1 = new NaiveForecastModel('model-v1');
    const model2 = new MovingAverageForecastModel('model-v2');

    registry.registerModel(model1, 'READY');
    registry.registerModel(model2, 'READY');

    const pipeline = new DeploymentPipeline(registry);

    // Deploy model1
    const deploy1 = await pipeline.deployCandidate('store-007', model1);
    assert.equal(deploy1.status, 'SUCCESS');
    assert.equal(registry.getActiveModel('store-007')?.id, 'model-v1');

    // Deploy model2
    const deploy2 = await pipeline.deployCandidate('store-007', model2);
    assert.equal(deploy2.status, 'SUCCESS');
    assert.equal(registry.getActiveModel('store-007')?.id, 'model-v2');

    // Rollback to model1
    const rollback = await pipeline.rollback('store-007');
    assert.equal(rollback.status, 'SUCCESS');
    assert.equal(rollback.modelId, 'model-v1');
    assert.equal(registry.getActiveModel('store-007')?.id, 'model-v1');
  });
});
