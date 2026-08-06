import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { alternativeEngine } from '../../../lib/forecast/explainability/alternative-engine';

describe('Alternative Engine Unit Tests', () => {
  test('should generate trade-off alternatives with reasonNotChosen', () => {
    const list = alternativeEngine.generateAlternatives('Order Stock', 120, 45);

    assert.equal(list.length >= 2, true);
    assert.equal(list.every((alt) => alt.reasonNotChosen.length > 0), true);
    assert.equal(list.every((alt) => alt.tradeOffs.length >= 2), true);
  });
});
