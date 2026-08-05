import { ResourceMetadata } from './resource-metadata.interface';

export type CrossValidationStrategyType =
  | 'TrainTestSplit'
  | 'RollingWindowValidation'
  | 'ExpandingWindowValidation'
  | 'BlockedTimeSeriesValidation';

export interface CrossValidationConfig {
  strategy: CrossValidationStrategyType;
  folds?: number;
  testRatio?: number;
  windowSize?: number;
  stepSize?: number;
  blockGap?: number;
}

export interface FeatureConfig {
  featureSchemaVersion: string;
  includedFeatures: string[];
  excludedFeatures?: string[];
  normalizationMethod?: string;
  imputationStrategy?: string;
}

export interface TrainingConfig {
  hyperparameters?: Record<string, unknown>;
  featureConfig?: FeatureConfig;
  crossValidationConfig?: CrossValidationConfig;
  datasetVersion: string;
  datasetHash?: string;
  featureSnapshotVersion?: string;
  trainingWindow: string;
  validationWindow?: string;
  testWindow?: string;
  seed?: number;
}

export interface TimeSeriesPoint {
  date: string;
  target: number;
  features?: Record<string, number>;
}

export interface ModelTrainingData {
  storeId: string;
  productId?: string;
  datasetVersion: string;
  datasetHash?: string;
  featureSnapshotVersion?: string;
  timeSeries: TimeSeriesPoint[];
  additionalMetadata?: Record<string, unknown>;
}

export interface CrossValidationFoldResult {
  foldIndex: number;
  trainSize: number;
  testSize: number;
  metrics: {
    mae: number;
    rmse: number;
    mape: number;
    smape: number;
    r2: number;
    bias: number;
    wape?: number;
  };
}

export interface TrainingResult {
  modelId: string;
  modelVersion: string;
  status: 'SUCCESS' | 'FAILED';
  trainingDurationMs: number;
  artifactChecksum: string;
  artifactUri: string;
  resourceMetadata?: ResourceMetadata;
  cvResults?: CrossValidationFoldResult[];
  errorMessage?: string;
  completedAt: string;
}
