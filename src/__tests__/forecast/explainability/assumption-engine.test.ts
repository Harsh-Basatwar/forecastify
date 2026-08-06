import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { assumptionEngine } from '../../../lib/forecast/explainability/assumption-engine';

describe('Assumption Engine Unit Tests', () => {
  test('should generate explicit domain assumptions with risk ratings', () => {
    const list = assumptionEngine.generateAssumptions({ promotionActive: true }, 3);

    assert.equal(list.length >= 4, true);
    assert.equal(list.some((a) => a.category === 'supplier'), true);
    assert.equal(list.some((a) => a.category === 'weather'), true);
    assert.equal(list.every((a) => a.statement && a.riskRating), true);
  });
});
