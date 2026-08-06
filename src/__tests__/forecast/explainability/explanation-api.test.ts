import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { GET as getExplain } from '../../../app/api/forecast/explain/route';
import { GET as getPredictionExplain } from '../../../app/api/forecast/explain/prediction/route';
import { POST as postWhatIf } from '../../../app/api/forecast/explain/what-if/route';

describe('Explainability REST API Unit Tests', () => {
  test('GET /api/forecast/explain should return unified explanation object', async () => {
    const req = new Request('http://localhost/api/forecast/explain?predictionId=pred_api_1');
    const res = await getExplain(req);
    const json = await res.json();

    assert.equal(res.status, 200);
    assert.equal(json.success, true);
    assert.equal(Boolean(json.explanation), true);
  });

  test('GET /api/forecast/explain/prediction should return prediction-specific explanation', async () => {
    const req = new Request('http://localhost/api/forecast/explain/prediction?predictionId=pred_api_2');
    const res = await getPredictionExplain(req);
    const json = await res.json();

    assert.equal(res.status, 200);
    assert.equal(json.success, true);
  });

  test('POST /api/forecast/explain/what-if should execute counterfactual simulation', async () => {
    const req = new Request('http://localhost/api/forecast/explain/what-if', {
      method: 'POST',
      body: JSON.stringify({
        scenarioName: 'Test Price Shift',
        originalPrediction: 100,
        modifiedInputs: { priceChangePercentage: -5 },
      }),
    });

    const res = await postWhatIf(req);
    const json = await res.json();

    assert.equal(res.status, 200);
    assert.equal(json.success, true);
    assert.equal(json.scenario.simulatedOutputs.predictionDelta > 0, true);
  });
});
