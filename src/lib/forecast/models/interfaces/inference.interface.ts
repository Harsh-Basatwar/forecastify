import { ForecastFeatureVector } from '../../types';

export interface InferenceConfig {
  horizon: string;
  confidenceIntervalAlpha?: number; // e.g. 0.95 for 95% interval
  includeHistories?: boolean;
  predictionType?: 'point' | 'probabilistic' | 'quantile';
}

export interface InferenceContext {
  storeId: string;
  productId: string;
  horizon: string; // e.g., '7d', '30d'
  predictionType: 'point' | 'probabilistic' | 'quantile';
  timestamp: string;
  featureVector?: ForecastFeatureVector;
  config?: InferenceConfig;
}

export interface PredictionPoint {
  date: string;
  predictedValue: number;
  lowerBound?: number;
  upperBound?: number;
  quantile?: number;
}

export interface PredictionInterval {
  confidenceLevel: number; // e.g., 0.95
  lower: number[];
  upper: number[];
}

export interface PredictionStatistics {
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
}

export interface ModelPredictionMetadata {
  latencyMs: number;
  featureVectorTimestamp?: string;
  featuresUsed?: string[];
  predictionGeneratedAt: string;
}

export interface PredictionResult {
  predictionSchemaVersion: string; // e.g. '1.0.0'
  featureSchemaVersion: string;
  modelVersion: string;
  modelId: string;
  modelType: string;
  storeId: string;
  productId: string;
  horizon: string;
  predictions: PredictionPoint[];
  intervals?: PredictionInterval;
  statistics?: PredictionStatistics;
  metadata: ModelPredictionMetadata;
}
