import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { ForecastDomainService } from '../../lib/forecast/forecast-domain-service';
import { ForecastConfig } from '../../lib/forecast/forecast-config';

describe('ForecastDomainService - Unit Tests', () => {
  test('should initialize default domain service facade', () => {
    const service = ForecastDomainService.createDefault();
    assert.equal(typeof service.getConfiguration, 'function');
    assert.equal(typeof service.scheduleForecastJob, 'function');
    assert.equal(typeof service.generateForecast, 'function');
  });

  test('should return default configuration when no settings exist', async () => {
    const service = ForecastDomainService.createDefault();
    const storeId = 'store-uuid-test';
    const config = await service.getConfiguration(storeId);

    assert.equal(config instanceof ForecastConfig, true);
    assert.equal(config.storeId, storeId);
    assert.equal(config.forecastHorizon, '7d');
    assert.equal(config.preferredModel, 'ensemble');
  });
});
