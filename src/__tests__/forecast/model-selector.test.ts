import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { ModelSelector } from '../../lib/forecast/models/manager/model-selector';
import { EvaluationReport } from '../../lib/forecast/models/interfaces';

describe('ModelSelector Unit Tests', () => {
  test('should pick best model based on LowestMAPE strategy', () => {
    const selector = new ModelSelector();

    const reportA: EvaluationReport = {
      modelId: 'model-a',
      modelType: 'naive',
      version: '1.0.0',
      datasetVersion: '1.0.0',
      evaluatedAt: new Date().toISOString(),
      sampleCount: 10,
      metrics: { mae: 10, rmse: 12, mape: 15, smape: 14, r2: 0.8, bias: 1 },
      passedThresholds: true,
    };

    const reportB: EvaluationReport = {
      modelId: 'model-b',
      modelType: 'moving_average',
      version: '1.0.0',
      datasetVersion: '1.0.0',
      evaluatedAt: new Date().toISOString(),
      sampleCount: 10,
      metrics: { mae: 5, rmse: 6, mape: 8, smape: 7, r2: 0.95, bias: 0.2 },
      passedThresholds: true,
    };

    const result = selector.selectBestModel([reportA, reportB], 'LowestMAPE');
    assert.equal(result.selectedModelId, 'model-b');
  });
});
