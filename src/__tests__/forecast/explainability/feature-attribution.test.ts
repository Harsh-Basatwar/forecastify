import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { featureAttributionEngine } from '../../../lib/forecast/explainability/feature-attribution';
import { AttributionStrategyType } from '../../../lib/forecast/explainability/explanation-types';

describe('Feature Attribution Engine Unit Tests', () => {
  test('should calculate ranked feature contributions using coefficient strategy', () => {
    const attributions = featureAttributionEngine.calculateAttribution(
      { lagSales7d: 110, promotionActive: true, isHoliday: true },
      140,
      100,
      AttributionStrategyType.COEFFICIENT
    );

    assert.equal(attributions.length > 0, true);
    assert.equal(attributions[0].importanceRank, 1);
    assert.equal(attributions.every((a) => a.normalizedPercentage >= 0), true);
  });

  test('should filter positive and negative contributors', () => {
    const attributions = featureAttributionEngine.calculateAttribution(
      { inventoryLevel: 10, supplierLeadTimeDays: 7 },
      100,
      100
    );

    const pos = featureAttributionEngine.getPositiveContributors(attributions);
    const neg = featureAttributionEngine.getNegativeContributors(attributions);

    assert.equal(Array.isArray(pos), true);
    assert.equal(Array.isArray(neg), true);
  });
});
