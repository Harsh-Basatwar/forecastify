/**
 * Forecast Engine 2.0 TypeScript Definitions
 */

import {
  ForecastHorizon,
  ForecastOutputType,
  RecommendationType,
  ModelType,
  ModelStatus,
  ForecastJobType,
  ForecastJobStatus,
} from './constants';

export type {
  ForecastHorizon,
  ForecastOutputType,
  RecommendationType,
  ModelType,
  ModelStatus,
  ForecastJobType,
  ForecastJobStatus,
};

export interface PredictionConfidence {
  score: number; // 0.0 to 1.0
  intervalUpper: number;
  intervalLower: number;
  stdError?: number;
}

export interface PredictionMetadata {
  modelId: string;
  modelUsed: ModelType;
  modelVersion: string;
  generatedAt: string;
  sampleSize?: number;
  featureWeights?: Record<string, number>;
}

export interface ForecastPrediction {
  id: string;
  storeId: string;
  productId?: string;
  categoryId?: string;
  horizon: ForecastHorizon;
  outputType: ForecastOutputType;
  predictedValue: number;
  confidence: PredictionConfidence;
  metadata: PredictionMetadata;
  targetDate: string;
  createdAt: string;
}

export type { ForecastFeatureVector, FeatureQualityMetrics, FeatureMetadata, FeatureLineageInfo } from './features/feature-types';

export interface ForecastRecommendation {
  id: string;
  storeId: string;
  productId?: string;
  type: RecommendationType;
  priority: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  confidence: number;
  businessImpact: string;
  riskScore: number;
  expectedSavings?: number;
  expectedProfit?: number;
  suggestedAction: Record<string, unknown>;
  createdAt: string;
}

export interface ForecastModel {
  id: string;
  storeId: string;
  name: string;
  modelType: ModelType;
  framework: string;
  version: string;
  artifactUri?: string;
  trainingDataset?: string;
  trainingWindow?: string;
  metrics: {
    mae?: number;
    rmse?: number;
    mape?: number;
    smape?: number;
    r2?: number;
    bias?: number;
  };
  hyperparameters: Record<string, unknown>;
  status: ModelStatus;
  isDefault: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ForecastJob {
  id: string;
  storeId: string;
  jobType: ForecastJobType;
  status: ForecastJobStatus;
  parameters: Record<string, unknown>;
  result?: Record<string, unknown>;
  errorMessage?: string;
  attempts: number;
  maxAttempts: number;
  startedAt?: string;
  completedAt?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ForecastSettings {
  id?: string;
  storeId: string;
  forecastHorizon: ForecastHorizon;
  preferredModel: ModelType;
  predictionFrequency: 'hourly' | 'daily' | 'weekly';
  weatherEnabled: boolean;
  festivalEnabled: boolean;
  supplierSignalsEnabled: boolean;
  recommendationEnabled: boolean;
  safetyStockMultiplier: number;
  confidenceThreshold: number;
  retrainingFrequency: 'daily' | 'weekly' | 'monthly';
  cacheTtlSeconds: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ForecastDriftLog {
  id: string;
  storeId: string;
  modelId: string;
  metricName: string;
  metricValue: number;
  threshold: number;
  driftDetected: boolean;
  actionTriggered?: string;
  createdAt: string;
}
