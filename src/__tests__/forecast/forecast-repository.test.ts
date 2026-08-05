import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { ForecastRepository } from '../../lib/forecast/forecast-repository';

describe('ForecastRepository - Unit Tests', () => {
  test('should instantiate ForecastRepository with Supabase client', () => {
    const repo = new ForecastRepository();
    assert.equal(typeof repo.saveModel, 'function');
    assert.equal(typeof repo.getModel, 'function');
    assert.equal(typeof repo.saveJob, 'function');
    assert.equal(typeof repo.saveSettings, 'function');
  });
});
