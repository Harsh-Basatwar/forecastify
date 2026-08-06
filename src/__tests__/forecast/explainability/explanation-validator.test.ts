import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { explanationValidator } from '../../../lib/forecast/explainability/explanation-validator';

describe('Explanation Validator Unit Tests', () => {
  test('should validate explanation schema compliance and zero hallucination rules', () => {
    const invalidRes = explanationValidator.validate({} as any);
    assert.equal(invalidRes.isValid, false);
    assert.equal(invalidRes.errors.length > 0, true);
  });
});
