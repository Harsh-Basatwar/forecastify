import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { counterfactualEngine } from '../../../lib/forecast/explainability/counterfactual-engine';

describe('Counterfactual Engine Unit Tests', () => {
  test('should simulate what-if price reduction and return prediction delta', () => {
    const scen = counterfactualEngine.simulateScenario({
      originalPrediction: 100,
      originalRecommendation: 'Order 30 Units',
      modifiedInputs: { priceChangePercentage: -10 },
    });

    assert.equal(scen.simulatedOutputs.simulatedPrediction > 100, true);
    assert.equal(scen.simulatedOutputs.predictionDelta > 0, true);
    assert.equal(scen.explanationSummary.includes('100 to'), true);
  });
});
