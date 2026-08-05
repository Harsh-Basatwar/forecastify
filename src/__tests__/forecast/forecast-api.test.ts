import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { GET as getForecast, POST as postForecast } from '../../app/api/forecast/route';
import { GET as getModels } from '../../app/api/forecast/models/route';
import { GET as getConfig } from '../../app/api/forecast/config/route';

describe('Forecast API Endpoints - Integration Contracts', () => {
  test('GET /api/forecast should validate storeId requirement', async () => {
    const req = new Request('http://localhost/api/forecast');
    const res = await getForecast(req);
    const json = await res.json();

    assert.equal(res.status, 400);
    assert.equal(json.error, 'Missing required storeId query parameter');
  });

  test('GET /api/forecast should return forecast response structure when storeId provided', async () => {
    const req = new Request('http://localhost/api/forecast?storeId=store-123&horizon=7d');
    const res = await getForecast(req);
    const json = await res.json();

    assert.equal(res.status, 200);
    assert.equal(json.success, true);
    assert.equal(json.storeId, 'store-123');
    assert.equal(json.horizon, '7d');
    assert.equal(Array.isArray(json.predictions), true);
  });

  test('GET /api/forecast/models should validate storeId parameter', async () => {
    const req = new Request('http://localhost/api/forecast/models');
    const res = await getModels(req);
    assert.equal(res.status, 400);
  });

  test('GET /api/forecast/config should return store configuration', async () => {
    const req = new Request('http://localhost/api/forecast/config?storeId=store-123');
    const res = await getConfig(req);
    const json = await res.json();

    assert.equal(res.status, 200);
    assert.equal(json.success, true);
    assert.equal(json.config.forecastHorizon, '7d');
  });
});
