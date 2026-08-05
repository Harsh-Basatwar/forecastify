import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { GET as getModels, POST as postModels } from '../../app/api/forecast/models/route';
import { POST as trainModel } from '../../app/api/forecast/models/train/route';
import { POST as evaluateModel } from '../../app/api/forecast/models/evaluate/route';
import { POST as predictModel } from '../../app/api/forecast/models/predict/route';
import { POST as deployModel } from '../../app/api/forecast/models/deploy/route';
import { POST as rollbackModel } from '../../app/api/forecast/models/rollback/route';

describe('Model Engine REST API Unit Tests', () => {
  test('GET /api/forecast/models should require storeId parameter', async () => {
    const req = new Request('http://localhost/api/forecast/models');
    const res = await getModels(req);
    assert.equal(res.status, 400);
  });

  test('POST /api/forecast/models should register a model instance', async () => {
    const req = new Request('http://localhost/api/forecast/models', {
      method: 'POST',
      body: JSON.stringify({
        storeId: 'store-api-1',
        name: 'API Naive Model',
        modelType: 'naive',
        id: 'api-model-naive-1',
      }),
    });
    const res = await postModels(req);
    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.success, true);
    assert.equal(json.model.modelType, 'naive');
  });

  test('POST /api/forecast/models/train should trigger training pipeline', async () => {
    const req = new Request('http://localhost/api/forecast/models/train', {
      method: 'POST',
      body: JSON.stringify({
        storeId: 'store-api-1',
        modelType: 'moving_average',
        modelId: 'api-model-ma-1',
      }),
    });
    const res = await trainModel(req);
    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.success, true);
    assert.equal(json.result.status, 'SUCCESS');
  });

  test('POST /api/forecast/models/deploy should promote model to DEPLOYED', async () => {
    const req = new Request('http://localhost/api/forecast/models/deploy', {
      method: 'POST',
      body: JSON.stringify({
        storeId: 'store-api-1',
        modelId: 'api-model-ma-1',
        notes: 'Deploying moving average model',
      }),
    });
    const res = await deployModel(req);
    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.success, true);
  });

  test('POST /api/forecast/models/predict should run inference and return PredictionResult', async () => {
    const req = new Request('http://localhost/api/forecast/models/predict', {
      method: 'POST',
      body: JSON.stringify({
        storeId: 'store-api-1',
        productId: 'prod-api-1',
        horizon: '7d',
        modelId: 'api-model-ma-1',
      }),
    });
    const res = await predictModel(req);
    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.success, true);
    assert.equal(json.result.predictions.length, 7);
  });
});
