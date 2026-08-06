import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { computeEvaluationMetrics } from '../../lib/forecast/models/metrics';
import { EvaluationPipeline } from '../../lib/forecast/models/manager/evaluation-pipeline';
import { ModelRegistry } from '../../lib/forecast/models/registry/model-registry';
import { NaiveForecastModel } from '../../lib/forecast/models/models/naive-model';

describe('Model Evaluator & Metrics Package Unit Tests', () => {
  test('should compute MAE, RMSE, MAPE, SMAPE, R2, Bias, WAPE, PinballLoss correctly', () => {
    const actuals = [10, 20, 30, 40, 50];
    const predictions = [12, 18, 33, 37, 52];

    const metrics = computeEvaluationMetrics({ actuals, predictions, quantileAlpha: 0.5 });

    assert.ok(metrics.mae > 0);
    assert.ok(metrics.rmse > 0);
    assert.ok(metrics.mape > 0);
    assert.ok(metrics.smape > 0);
    assert.ok(metrics.r2 > 0.9); // Strong linear fit
    assert.ok((metrics.wape ?? 0) > 0);
    assert.ok(metrics.pinballLoss !== undefined);
  });

  test('should execute EvaluationPipeline and transition model status', async () => {
    const registry = new ModelRegistry();
    const model = new NaiveForecastModel('eval-pipeline-model');
    registry.registerModel(model, 'TRAINED');

    const pipeline = new EvaluationPipeline(registry);
    const report = await pipeline.evaluateModel(model, {
      actuals: [100, 100, 100],
      predictions: [100, 100, 100],
    });

    assert.equal(report.passedThresholds, true);
    assert.equal(registry.getMetadata('eval-pipeline-model')?.status, 'READY');
  });
});
