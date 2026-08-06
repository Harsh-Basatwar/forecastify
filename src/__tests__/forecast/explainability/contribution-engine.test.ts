import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { contributionEngine } from '../../../lib/forecast/explainability/contribution-engine';
import { FeatureContribution } from '../../../lib/forecast/explainability/explanation-types';

describe('Contribution Engine Unit Tests', () => {
  test('should normalize contributions to sum to 100%', () => {
    const raw: FeatureContribution[] = [
      { featureId: 'f1', featureName: 'F1', category: 'lag', contributionValue: 40, normalizedPercentage: 0, direction: 'POSITIVE', baselineValue: 0, currentValue: 10, importanceRank: 1 },
      { featureId: 'f2', featureName: 'F2', category: 'promotion', contributionValue: -10, normalizedPercentage: 0, direction: 'NEGATIVE', baselineValue: 0, currentValue: 5, importanceRank: 2 },
    ];

    const processed = contributionEngine.processContributions(raw);
    const sum = processed.normalizedAttributions.reduce((a, b) => a + b.normalizedPercentage, 0);

    assert.equal(Math.round(sum), 100);
    assert.equal(processed.positiveDrivers.length, 1);
    assert.equal(processed.negativeDrivers.length, 1);
  });
});
