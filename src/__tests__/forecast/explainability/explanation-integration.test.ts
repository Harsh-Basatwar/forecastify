import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { explanationEngine } from '../../../lib/forecast/explainability/explanation-engine';
import { explanationValidator } from '../../../lib/forecast/explainability/explanation-validator';

describe('Explainability Integration End-to-End Tests', () => {
  test('should execute full pipeline: Prediction -> Recommendation -> Evidence -> Attribution -> Confidence -> Rationale -> Lineage -> Graph', async () => {
    const explanation = await explanationEngine.generatePredictionExplanation({
      predictionId: 'pred_e2e_100',
      recommendationId: 'rec_e2e_100',
      predictionValue: 180,
      inventoryLevel: 30,
      supplierLeadTimeDays: 4,
    });

    const validation = explanationValidator.validate(explanation);
    assert.equal(validation.isValid, true);
    assert.equal(explanation.graph.nodes.length >= 4, true);
    assert.equal(explanation.alternatives.length >= 2, true);
  });
});
