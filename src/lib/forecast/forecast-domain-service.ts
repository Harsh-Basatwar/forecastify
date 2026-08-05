/**
 * Forecast Domain Service (Core Facade Orchestrator for Forecast Engine 2.0)
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  IForecastDomainService,
  IForecastRepository,
  IForecastPredictionService,
  IForecastJobScheduler,
  IForecastEventConsumer,
  ICache,
} from './interfaces';
import {
  ForecastModel,
  ForecastJob,
  ForecastSettings,
  ForecastPrediction,
  ForecastRecommendation,
  ForecastJobType,
  ForecastHorizon,
} from './types';
import { ForecastConfig } from './forecast-config';
import { ForecastContext } from './forecast-context';
import { ForecastRepository } from './forecast-repository';
import { ForecastCacheAdapter } from './forecast-cache-adapter';
import { ForecastJobScheduler } from './forecast-job-scheduler';
import { ForecastEventConsumer } from './forecast-event-consumer';
import { ForecastPredictionService } from './forecast-prediction-service';

import { ForecastFeatureVector } from './types';
import { FeatureStore } from './features/feature-store';
import { FeatureEngineeringPipeline } from './features/feature-engineering-pipeline';
import { ForecastModelManager } from './models/manager/forecast-model-manager';

export class ForecastDomainService implements IForecastDomainService {
  private featureStore: FeatureStore;
  private pipeline: FeatureEngineeringPipeline;
  private modelManager: ForecastModelManager;

  constructor(
    private readonly repository: IForecastRepository,
    private readonly predictionService: IForecastPredictionService,
    private readonly scheduler: IForecastJobScheduler,
    private readonly eventConsumer: IForecastEventConsumer,
    private readonly cache: ICache
  ) {
    this.featureStore = new FeatureStore(this.repository, this.cache);
    this.pipeline = new FeatureEngineeringPipeline(this.featureStore);
    this.modelManager = ForecastModelManager.getSharedInstance();
  }

  public getModelManager(): ForecastModelManager {
    return this.modelManager;
  }

  /**
   * Factory method providing clean dependency injection for default implementation
   */
  public static createDefault(client?: SupabaseClient): ForecastDomainService {
    const repository = new ForecastRepository(client);
    const cache = new ForecastCacheAdapter();
    const predictionService = new ForecastPredictionService(repository, cache);
    const scheduler = new ForecastJobScheduler(repository);
    const eventConsumer = new ForecastEventConsumer();

    return new ForecastDomainService(repository, predictionService, scheduler, eventConsumer, cache);
  }

  public async initialize(): Promise<void> {
    // Initialization hooks for scheduler job types or event listener setup
    console.info('[ForecastDomainService] Infrastructure initialized.');
  }

  public async getConfiguration(storeId: string): Promise<ForecastConfig> {
    try {
      const settings = await this.repository.getSettings(storeId);
      if (!settings) {
        return ForecastConfig.defaultConfig(storeId);
      }
      return ForecastConfig.fromSettings(settings);
    } catch {
      return ForecastConfig.defaultConfig(storeId);
    }
  }

  public async updateConfiguration(storeId: string, updates: Partial<ForecastSettings>): Promise<ForecastConfig> {
    const existing = await this.repository.getSettings(storeId);
    const newSettings: ForecastSettings = {
      ...(existing || ForecastConfig.defaultConfig(storeId).toSettings()),
      ...updates,
      storeId,
    };

    const saved = await this.repository.saveSettings(newSettings);
    await this.cache.invalidateStoreCache(storeId);
    return ForecastConfig.fromSettings(saved);
  }

  public async scheduleForecastJob(
    storeId: string,
    jobType: ForecastJobType,
    parameters: Record<string, unknown> = {}
  ): Promise<ForecastJob> {
    return this.scheduler.scheduleJob(storeId, jobType, parameters);
  }

  public async getForecastJob(jobId: string, storeId: string): Promise<ForecastJob | null> {
    return this.scheduler.getJobStatus(jobId, storeId);
  }

  public async getAvailableModels(storeId: string): Promise<ForecastModel[]> {
    return this.repository.getAvailableModels(storeId);
  }

  public async registerModel(model: Omit<ForecastModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<ForecastModel> {
    const saved = await this.repository.saveModel(model);
    await this.cache.invalidateStoreCache(model.storeId);
    return saved;
  }

  public async generateForecast(contextProps: {
    storeId: string;
    horizon?: string;
  }): Promise<{ predictions: ForecastPrediction[]; recommendations: ForecastRecommendation[] }> {
    const config = await this.getConfiguration(contextProps.storeId);
    const context = new ForecastContext({
      storeId: contextProps.storeId,
      horizon: (contextProps.horizon as ForecastHorizon) || config.forecastHorizon,
      config,
    });

    return this.predictionService.generateForecast(context);
  }

  public async getForecast(contextProps: { storeId: string; horizon?: string }): Promise<ForecastPrediction[]> {
    const { predictions } = await this.generateForecast(contextProps);
    return predictions;
  }

  // Feature Engineering Pipeline Facade Implementation
  public async generateFeatures(params: {
    storeId: string;
    productId: string;
    variantId?: string;
    rawInput?: any;
  }): Promise<ForecastFeatureVector> {
    return this.pipeline.executePipeline(params);
  }

  public async getFeatureVector(params: {
    storeId: string;
    productId: string;
    variantId?: string;
  }): Promise<ForecastFeatureVector | null> {
    return this.featureStore.getLatestFeatureVector(params.storeId, params.productId, params.variantId);
  }

  public async getHistoricalFeatures(params: {
    storeId: string;
    productId?: string;
    limit?: number;
  }): Promise<ForecastFeatureVector[]> {
    return this.featureStore.getHistoricalFeatureVectors(params);
  }

  public async refreshFeatures(params: {
    storeId: string;
    productId: string;
    variantId?: string;
  }): Promise<ForecastFeatureVector> {
    await this.featureStore.invalidateFeatureVector(params.storeId, params.productId, params.variantId);
    return this.generateFeatures(params);
  }
}
