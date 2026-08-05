/**
 * Forecast Engine 2.0 Abstraction Interfaces (Dependency Inversion)
 */

import {
  ForecastModel,
  ForecastJob,
  ForecastSettings,
  ForecastPrediction,
  ForecastFeatureVector,
  ForecastRecommendation,
  ForecastJobType,
} from './types';
import { ForecastContext } from './forecast-context';
import { ForecastConfig } from './forecast-config';

export interface ICache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  invalidateStoreCache(storeId: string): Promise<void>;
}

export interface IForecastRepository {
  // Model Persistence
  saveModel(model: Omit<ForecastModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<ForecastModel>;
  getModel(modelId: string, storeId: string): Promise<ForecastModel | null>;
  getAvailableModels(storeId: string): Promise<ForecastModel[]>;

  // Job Persistence
  saveJob(job: Omit<ForecastJob, 'id' | 'createdAt' | 'updatedAt'>): Promise<ForecastJob>;
  getJob(jobId: string, storeId: string): Promise<ForecastJob | null>;
  getJobs(storeId: string, jobType?: ForecastJobType): Promise<ForecastJob[]>;
  updateJob(jobId: string, storeId: string, updates: Partial<ForecastJob>): Promise<ForecastJob>;

  // Settings Persistence
  saveSettings(settings: ForecastSettings): Promise<ForecastSettings>;
  getSettings(storeId: string): Promise<ForecastSettings | null>;

  // Feature Persistence (Feature Store)
  saveFeatureVector(vector: ForecastFeatureVector): Promise<ForecastFeatureVector>;
  getLatestFeatureVector(storeId: string, productId: string, variantId?: string): Promise<ForecastFeatureVector | null>;
  getHistoricalFeatureVectors(storeId: string, productId?: string, limit?: number): Promise<ForecastFeatureVector[]>;
  deleteFeatureVector(storeId: string, productId: string): Promise<boolean>;
}

export interface IForecastJobScheduler {
  scheduleJob(storeId: string, jobType: ForecastJobType, parameters?: Record<string, unknown>): Promise<ForecastJob>;
  cancelJob(jobId: string, storeId: string): Promise<boolean>;
  retryJob(jobId: string, storeId: string): Promise<ForecastJob>;
  getJobStatus(jobId: string, storeId: string): Promise<ForecastJob | null>;
  registerJobHandler(jobType: ForecastJobType, handler: (job: ForecastJob) => Promise<void>): void;
}

export interface IForecastEventConsumer {
  handleSalesCreated(payload: Record<string, unknown>): Promise<void>;
  handleInventoryUpdated(payload: Record<string, unknown>): Promise<void>;
  handlePurchaseCompleted(payload: Record<string, unknown>): Promise<void>;
  handleSupplierUpdated(payload: Record<string, unknown>): Promise<void>;
  handlePromotionChanged(payload: Record<string, unknown>): Promise<void>;
  handleWeatherUpdated(payload: Record<string, unknown>): Promise<void>;
}

export interface IForecastPredictionService {
  generateForecast(context: ForecastContext): Promise<{ predictions: ForecastPrediction[]; recommendations: ForecastRecommendation[] }>;
  getForecast(context: ForecastContext): Promise<ForecastPrediction[]>;
  getPredictionHistory(storeId: string, productId?: string): Promise<ForecastPrediction[]>;
}

export interface IForecastDomainService {
  initialize(): Promise<void>;
  getConfiguration(storeId: string): Promise<ForecastConfig>;
  updateConfiguration(storeId: string, updates: Partial<ForecastSettings>): Promise<ForecastConfig>;
  scheduleForecastJob(storeId: string, jobType: ForecastJobType, parameters?: Record<string, unknown>): Promise<ForecastJob>;
  getForecastJob(jobId: string, storeId: string): Promise<ForecastJob | null>;
  getAvailableModels(storeId: string): Promise<ForecastModel[]>;
  registerModel(model: Omit<ForecastModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<ForecastModel>;
  generateForecast(contextProps: { storeId: string; horizon?: string }): Promise<{ predictions: ForecastPrediction[]; recommendations: ForecastRecommendation[] }>;
  getForecast(contextProps: { storeId: string; horizon?: string }): Promise<ForecastPrediction[]>;

  // Feature Engineering Pipeline Facade Methods
  generateFeatures(params: { storeId: string; productId: string; variantId?: string; rawInput?: any }): Promise<ForecastFeatureVector>;
  getFeatureVector(params: { storeId: string; productId: string; variantId?: string }): Promise<ForecastFeatureVector | null>;
  getHistoricalFeatures(params: { storeId: string; productId?: string; limit?: number }): Promise<ForecastFeatureVector[]>;
  refreshFeatures(params: { storeId: string; productId: string; variantId?: string }): Promise<ForecastFeatureVector>;
}
