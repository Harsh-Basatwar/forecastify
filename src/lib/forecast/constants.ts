/**
 * Forecast Engine 2.0 System Constants
 */

export const FORECAST_HORIZONS = ['1d', '3d', '7d', '14d', '30d', '60d', '90d'] as const;
export type ForecastHorizon = typeof FORECAST_HORIZONS[number];

export const FORECAST_OUTPUT_TYPES = [
  'demand',
  'revenue',
  'profit',
  'inventory',
  'cash_flow',
  'purchase',
  'supplier',
  'expiry',
  'stockout',
  'blocked_capital',
  'safety_stock',
] as const;
export type ForecastOutputType = typeof FORECAST_OUTPUT_TYPES[number];

export const RECOMMENDATION_TYPES = [
  'ORDER',
  'WAIT',
  'DISCOUNT',
  'INCREASE_PRICE',
  'TRANSFER_STOCK',
  'SWITCH_SUPPLIER',
  'DELAY_PURCHASE',
  'EMERGENCY_PURCHASE',
  'LIQUIDATE_INVENTORY',
] as const;
export type RecommendationType = typeof RECOMMENDATION_TYPES[number];

export const MODEL_TYPES = [
  'naive',
  'moving_average',
  'linear_regression',
  'xgboost',
  'lightgbm',
  'prophet',
  'random_forest',
  'lstm',
  'transformer',
  'ensemble',
] as const;
export type ModelType = typeof MODEL_TYPES[number];

export const MODEL_STATUSES = ['draft', 'training', 'active', 'evaluating', 'retired', 'failed'] as const;
export type ModelStatus = typeof MODEL_STATUSES[number];

export const JOB_TYPES = [
  'TRAIN_MODEL',
  'GENERATE_FORECAST',
  'CACHE_REFRESH',
  'FEATURE_REFRESH',
  'DRIFT_ANALYSIS',
] as const;
export type ForecastJobType = typeof JOB_TYPES[number];

export const JOB_STATUSES = ['Queued', 'Running', 'Completed', 'Failed', 'Cancelled'] as const;
export type ForecastJobStatus = typeof JOB_STATUSES[number];

export const DEFAULT_FORECAST_CONFIG = {
  forecastHorizon: '7d' as ForecastHorizon,
  preferredModel: 'ensemble' as ModelType,
  predictionFrequency: 'daily' as 'hourly' | 'daily' | 'weekly',
  weatherEnabled: true,
  festivalEnabled: true,
  supplierSignalsEnabled: true,
  recommendationEnabled: true,
  safetyStockMultiplier: 1.25,
  confidenceThreshold: 0.8,
  retrainingFrequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
  cacheTtlSeconds: 3600,
} as const;

export const DEFAULT_CACHE_TTL = 3600; // 1 hour in seconds
