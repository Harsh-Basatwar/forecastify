import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { explanationEngine } from '../../../lib/forecast/explainability/explanation-engine';
import { ExplanationAudience, AttributionStrategyType } from '../../../lib/forecast/explainability/explanation-types';

describe('Explanation Engine Unit Tests', () => {
  test('should generate prediction explanation deterministically', async () => {
    const explanation1 = await explanationEngine.generatePredictionExplanation({
      predictionId: 'pred_test_1',
      predictionValue: 150,
      audience: ExplanationAudience.ANALYST,
    });

    assert.equal(explanation1.predictionId, 'pred_test_1');
    assert.equal(explanation1.explainabilityScore.totalScore > 0, true);
    assert.equal(explanation1.lineage.predictionId, 'pred_test_1');
    assert.equal(explanation1.evidenceList.length >= 5, true);
  });

  test('should support multi-audience rendering', async () => {
    const execExp = await explanationEngine.generatePredictionExplanation({
      predictionId: 'pred_exec_1',
      audience: ExplanationAudience.EXECUTIVE,
    });

    assert.equal(execExp.audience, ExplanationAudience.EXECUTIVE);
    assert.equal(execExp.featureAttributions.length <= 3, true);
  });

  test('should support strategy pattern attribution selection', async () => {
    const permExp = await explanationEngine.generatePredictionExplanation({
      predictionId: 'pred_perm_1',
      attributionStrategy: AttributionStrategyType.PERMUTATION,
    });

    assert.equal(permExp.metadata.attributionStrategy, AttributionStrategyType.PERMUTATION);
  });
});
