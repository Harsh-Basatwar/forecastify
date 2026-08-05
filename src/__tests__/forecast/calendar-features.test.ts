import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { RawCalendarFeatureBuilder } from '../../lib/forecast/features/feature-builders/raw/raw-calendar-builder';

describe('RawCalendarFeatureBuilder - Unit Tests', () => {
  test('should generate calendar features from target date', async () => {
    const builder = new RawCalendarFeatureBuilder();
    const context = {
      storeId: 'store-1',
      productId: 'prod-101',
      targetDate: '2026-08-06T00:00:00Z', // Thursday
      rawInput: {},
    };

    const res = await builder.build(context);

    assert.equal(res.features.raw_day_of_week, 4); // 0=Sun, 4=Thu
    assert.equal(res.features.raw_month, 8); // August
    assert.equal(res.features.raw_quarter, 3); // Q3
    assert.equal(res.features.raw_is_weekend, 0);
    assert.equal(res.features.raw_financial_year, 'FY2026');
    assert.equal(res.features.raw_season, 'Summer');
  });
});
