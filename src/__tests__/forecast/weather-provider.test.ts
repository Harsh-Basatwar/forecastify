import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { MockWeatherProvider } from '../../lib/forecast/features/providers/mock-weather.provider';
import { OpenWeatherProvider } from '../../lib/forecast/features/providers/open-weather.provider';
import { RawWeatherFeatureBuilder } from '../../lib/forecast/features/feature-builders/raw/raw-weather-builder';

describe('Weather Provider Plugins - Unit Tests', () => {
  test('MockWeatherProvider returns valid deterministic weather data', async () => {
    const provider = new MockWeatherProvider();
    const data = await provider.getWeatherData('store-1', '2026-08-06T00:00:00Z');

    assert.equal(typeof data.temperatureCelsius, 'number');
    assert.equal(typeof data.humidityPercentage, 'number');
    assert.equal(typeof data.rainfallMm, 'number');
    assert.ok(['Clear', 'Rainy', 'Cloudy', 'Stormy', 'Extreme'].includes(data.weatherCategory));
  });

  test('RawWeatherFeatureBuilder seamlessly uses pluggable provider', async () => {
    const provider = new OpenWeatherProvider();
    const builder = new RawWeatherFeatureBuilder(provider);
    const context = {
      storeId: 'store-1',
      productId: 'prod-101',
      targetDate: '2026-08-06T00:00:00Z',
      rawInput: {},
    };

    const res = await builder.build(context);
    assert.ok(typeof res.features.raw_temperature_celsius === 'number');
    assert.ok(typeof res.features.raw_humidity_percentage === 'number');
  });
});
