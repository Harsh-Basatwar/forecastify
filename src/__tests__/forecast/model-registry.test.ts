import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { ModelRegistry } from '../../lib/forecast/models/registry/model-registry';
import { NaiveForecastModel } from '../../lib/forecast/models/models/naive-model';

describe('ModelRegistry Unit Tests', () => {
  test('should register, transition lifecycle states, and manage active store deployments', () => {
    const registry = new ModelRegistry();
    const model = new NaiveForecastModel('registry-test-model');

    const meta = registry.registerModel(model, 'DRAFT');
    assert.equal(meta.status, 'DRAFT');
    assert.equal(registry.hasModel('registry-test-model'), true);

    const updated = registry.updateStatus('registry-test-model', 'READY');
    assert.equal(updated?.status, 'READY');

    const deployed = registry.setDeployed('store-999', 'registry-test-model');
    assert.equal(deployed, true);

    const active = registry.getActiveModel('store-999');
    assert.equal(active?.id, 'registry-test-model');
  });
});
