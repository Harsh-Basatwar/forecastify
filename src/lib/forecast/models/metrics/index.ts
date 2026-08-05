import { EvaluationMetrics, ModelEvaluationData } from '../interfaces';
import { calculateMAE } from './mae';
import { calculateRMSE } from './rmse';
import { calculateMAPE } from './mape';
import { calculateSMAPE } from './smape';
import { calculateR2 } from './r2';
import { calculateBias } from './bias';
import { calculateWAPE } from './wape';
import { calculatePinballLoss } from './pinball-loss';
import { calculateCoverageProbability } from './coverage-probability';
import { calculateIntervalWidth } from './interval-width';

export * from './mae';
export * from './rmse';
export * from './mape';
export * from './smape';
export * from './r2';
export * from './bias';
export * from './wape';
export * from './pinball-loss';
export * from './coverage-probability';
export * from './interval-width';

export function computeEvaluationMetrics(data: ModelEvaluationData): EvaluationMetrics {
  const { actuals, predictions, lowerBounds, upperBounds, quantileAlpha } = data;

  const mae = calculateMAE(actuals, predictions);
  const rmse = calculateRMSE(actuals, predictions);
  const mape = calculateMAPE(actuals, predictions);
  const smape = calculateSMAPE(actuals, predictions);
  const r2 = calculateR2(actuals, predictions);
  const bias = calculateBias(actuals, predictions);
  const wape = calculateWAPE(actuals, predictions);

  let pinballLoss: number | undefined;
  if (quantileAlpha !== undefined) {
    pinballLoss = calculatePinballLoss(actuals, predictions, quantileAlpha);
  }

  let coverageProbability: number | undefined;
  let predictionIntervalWidth: number | undefined;
  if (lowerBounds && upperBounds && lowerBounds.length === actuals.length) {
    coverageProbability = calculateCoverageProbability(actuals, lowerBounds, upperBounds);
    predictionIntervalWidth = calculateIntervalWidth(lowerBounds, upperBounds);
  }

  return {
    mae,
    rmse,
    mape,
    smape,
    r2,
    bias,
    wape,
    pinballLoss,
    coverageProbability,
    predictionIntervalWidth,
  };
}
