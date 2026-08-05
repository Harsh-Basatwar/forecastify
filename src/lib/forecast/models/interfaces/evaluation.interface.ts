export type ModelSelectionStrategyType =
  | 'LowestMAE'
  | 'LowestRMSE'
  | 'LowestMAPE'
  | 'WeightedScore'
  | 'Custom';

export interface MetricWeights {
  mae?: number;
  rmse?: number;
  mape?: number;
  smape?: number;
  r2?: number;
  bias?: number;
}

export interface EvaluationConfig {
  metrics: string[];
  selectionStrategy: ModelSelectionStrategyType;
  weights?: MetricWeights;
  minR2Threshold?: number;
  maxMapeThreshold?: number;
}

export interface EvaluationMetrics {
  mae: number;
  rmse: number;
  mape: number;
  smape: number;
  r2: number;
  bias: number;
  pinballLoss?: number;
  coverageProbability?: number;
  predictionIntervalWidth?: number;
  wape?: number;
}

export interface ModelEvaluationData {
  actuals: number[];
  predictions: number[];
  lowerBounds?: number[];
  upperBounds?: number[];
  quantileAlpha?: number;
}

export interface EvaluationReport {
  modelId: string;
  modelType: string;
  version: string;
  datasetVersion: string;
  evaluatedAt: string;
  sampleCount: number;
  metrics: EvaluationMetrics;
  passedThresholds: boolean;
  score?: number;
}
