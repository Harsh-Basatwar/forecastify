import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { explanationScoreCalculator } from '../../../lib/forecast/explainability/explanation-score';

describe('Explanation Score Calculator Unit Tests', () => {
  test('should calculate 0-100 score and assign letter grade', () => {
    const score = explanationScoreCalculator.calculateScore({
      evidenceList: [{} as any, {} as any, {} as any, {} as any, {} as any],
      featureAttributions: [{ direction: 'POSITIVE' } as any, { direction: 'NEGATIVE' } as any],
      confidenceBreakdown: { components: {}, rationale: 'Good' } as any,
      assumptions: [{} as any, {} as any, {} as any],
      alternatives: [{} as any, {} as any],
    });

    assert.equal(score.totalScore >= 70, true);
    assert.equal(['A+', 'A', 'B', 'C', 'D', 'F'].includes(score.grade), true);
  });
});
