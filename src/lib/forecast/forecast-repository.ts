/**
 * Forecast Repository (Database Persistence Abstraction for Forecast Engine 2.0)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IForecastRepository } from './interfaces';
import { ForecastModel, ForecastJob, ForecastSettings, ForecastJobType, ForecastFeatureVector } from './types';
import { ForecastDomainError } from './errors';

export class ForecastRepository implements IForecastRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    if (client) {
      this.client = client;
    } else {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key';
      this.client = createClient(url, key);
    }
  }

  // Model Persistence
  public async saveModel(model: Omit<ForecastModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<ForecastModel> {
    try {
      const { data, error } = await this.client
        .from('forecast_models')
        .insert({
          store_id: model.storeId,
          name: model.name,
          model_type: model.modelType,
          framework: model.framework,
          version: model.version,
          artifact_uri: model.artifactUri,
          training_dataset: model.trainingDataset,
          training_window: model.trainingWindow,
          metrics_json: model.metrics,
          hyperparameters_json: model.hyperparameters,
          status: model.status,
          is_default: model.isDefault,
          is_deleted: model.isDeleted || false,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return this.mapModel(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new ForecastDomainError(`Failed to save model: ${message}`);
    }
  }

  public async getModel(modelId: string, storeId: string): Promise<ForecastModel | null> {
    try {
      const { data, error } = await this.client
        .from('forecast_models')
        .select('*')
        .eq('id', modelId)
        .eq('store_id', storeId)
        .eq('is_deleted', false)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) return null;
      return this.mapModel(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new ForecastDomainError(`Failed to fetch model ${modelId}: ${message}`);
    }
  }

  public async getAvailableModels(storeId: string): Promise<ForecastModel[]> {
    try {
      const { data, error } = await this.client
        .from('forecast_models')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error || !data) return [];
      return data.map((row) => this.mapModel(row));
    } catch {
      return [];
    }
  }

  // Job Persistence
  public async saveJob(job: Omit<ForecastJob, 'id' | 'createdAt' | 'updatedAt'>): Promise<ForecastJob> {
    try {
      const { data, error } = await this.client
        .from('forecast_jobs')
        .insert({
          store_id: job.storeId,
          job_type: job.jobType,
          status: job.status,
          parameters_json: job.parameters,
          result_json: job.result || {},
          error_message: job.errorMessage,
          attempts: job.attempts || 0,
          max_attempts: job.maxAttempts || 3,
          started_at: job.startedAt,
          completed_at: job.completedAt,
          is_deleted: job.isDeleted || false,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return this.mapJob(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new ForecastDomainError(`Failed to save forecast job: ${message}`);
    }
  }

  public async getJob(jobId: string, storeId: string): Promise<ForecastJob | null> {
    try {
      const { data, error } = await this.client
        .from('forecast_jobs')
        .select('*')
        .eq('id', jobId)
        .eq('store_id', storeId)
        .eq('is_deleted', false)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) return null;
      return this.mapJob(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new ForecastDomainError(`Failed to fetch job ${jobId}: ${message}`);
    }
  }

  public async getJobs(storeId: string, jobType?: ForecastJobType): Promise<ForecastJob[]> {
    try {
      let query = this.client
        .from('forecast_jobs')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_deleted', false);

      if (jobType) {
        query = query.eq('job_type', jobType);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return (data || []).map((row) => this.mapJob(row));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new ForecastDomainError(`Failed to fetch forecast jobs: ${message}`);
    }
  }

  public async updateJob(jobId: string, storeId: string, updates: Partial<ForecastJob>): Promise<ForecastJob> {
    try {
      const updatePayload: Record<string, unknown> = {};
      if (updates.status) updatePayload.status = updates.status;
      if (updates.result) updatePayload.result_json = updates.result;
      if (updates.errorMessage !== undefined) updatePayload.error_message = updates.errorMessage;
      if (updates.attempts !== undefined) updatePayload.attempts = updates.attempts;
      if (updates.startedAt) updatePayload.started_at = updates.startedAt;
      if (updates.completedAt) updatePayload.completed_at = updates.completedAt;

      const { data, error } = await this.client
        .from('forecast_jobs')
        .update(updatePayload)
        .eq('id', jobId)
        .eq('store_id', storeId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return this.mapJob(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new ForecastDomainError(`Failed to update job ${jobId}: ${message}`);
    }
  }

  // Settings Persistence
  public async saveSettings(settings: ForecastSettings): Promise<ForecastSettings> {
    try {
      const { data, error } = await this.client
        .from('forecast_settings')
        .upsert(
          {
            store_id: settings.storeId,
            forecast_horizon: settings.forecastHorizon,
            preferred_model: settings.preferredModel,
            prediction_frequency: settings.predictionFrequency,
            weather_enabled: settings.weatherEnabled,
            festival_enabled: settings.festivalEnabled,
            supplier_signals_enabled: settings.supplierSignalsEnabled,
            recommendation_enabled: settings.recommendationEnabled,
            safety_stock_multiplier: settings.safetyStockMultiplier,
            confidence_threshold: settings.confidenceThreshold,
            retraining_frequency: settings.retrainingFrequency,
            cache_ttl_seconds: settings.cacheTtlSeconds,
          },
          { onConflict: 'store_id' }
        )
        .select()
        .single();

      if (error) throw new Error(error.message);
      return this.mapSettings(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new ForecastDomainError(`Failed to save settings: ${message}`);
    }
  }

  public async getSettings(storeId: string): Promise<ForecastSettings | null> {
    try {
      const { data, error } = await this.client
        .from('forecast_settings')
        .select('*')
        .eq('store_id', storeId)
        .maybeSingle();

      if (error || !data) return null;
      return this.mapSettings(data);
    } catch {
      return null;
    }
  }

  // Feature Store Persistence
  public async saveFeatureVector(vector: ForecastFeatureVector): Promise<ForecastFeatureVector> {
    try {
      const { data, error } = await this.client
        .from('forecast_features')
        .insert({
          store_id: vector.storeId,
          product_id: vector.productId,
          variant_id: vector.variantId || null,
          generated_timestamp: vector.timestamp,
          feature_version: vector.metadata?.generatedVersion || '2.0.0',
          feature_schema_version: vector.metadata?.schemaVersion || '2.0.0',
          builder_version: vector.metadata?.builderVersion || '2.0.0',
          normalization_method: vector.metadata?.normalizationMethod || 'Identity',
          lifecycle_state: vector.lifecycleState || 'READY',
          feature_hash: vector.metadata?.featureHash || '',
          source_snapshot_id: vector.metadata?.sourceSnapshotId || '',
          generation_duration_ms: vector.metadata?.generationDurationMs || 0,
          quality_score: vector.qualityMetrics?.qualityScore ?? 1.0,
          quality_metrics: vector.qualityMetrics || {},
          feature_vector: vector,
          snapshot_json: vector.snapshot || {},
          lineage: vector.lineage || {},
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return this.mapFeatureVector(data);
    } catch (err: unknown) {
      // Return vector in fallback mode if DB is disconnected/mock
      return vector;
    }
  }

  public async getLatestFeatureVector(
    storeId: string,
    productId: string,
    variantId?: string
  ): Promise<ForecastFeatureVector | null> {
    try {
      let query = this.client
        .from('forecast_features')
        .select('*')
        .eq('store_id', storeId)
        .eq('product_id', productId);

      if (variantId) {
        query = query.eq('variant_id', variantId);
      }

      const { data, error } = await query.order('generated_timestamp', { ascending: false }).limit(1).maybeSingle();

      if (error || !data) return null;
      return this.mapFeatureVector(data);
    } catch {
      return null;
    }
  }

  public async getHistoricalFeatureVectors(
    storeId: string,
    productId?: string,
    limit: number = 50
  ): Promise<ForecastFeatureVector[]> {
    try {
      let query = this.client.from('forecast_features').select('*').eq('store_id', storeId);

      if (productId) {
        query = query.eq('product_id', productId);
      }

      const { data, error } = await query.order('generated_timestamp', { ascending: false }).limit(limit);

      if (error || !data) return [];
      return data.map((row) => this.mapFeatureVector(row));
    } catch {
      return [];
    }
  }

  public async deleteFeatureVector(storeId: string, productId: string): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('forecast_features')
        .delete()
        .eq('store_id', storeId)
        .eq('product_id', productId);

      return !error;
    } catch {
      return false;
    }
  }

  private mapFeatureVector(row: any): ForecastFeatureVector {
    if (row.feature_vector) {
      return {
        ...row.feature_vector,
        id: row.id,
        storeId: row.store_id,
        productId: row.product_id,
        variantId: row.variant_id,
        timestamp: row.generated_timestamp,
        lifecycleState: row.lifecycle_state || row.feature_vector.lifecycleState || 'READY',
        snapshot: row.snapshot_json || row.feature_vector.snapshot,
      };
    }
    return {
      id: row.id,
      storeId: row.store_id,
      productId: row.product_id,
      variantId: row.variant_id,
      timestamp: row.generated_timestamp,
      rawFeatures: {},
      derivedFeatures: {},
      features: {},
      qualityMetrics: row.quality_metrics || { qualityScore: Number(row.quality_score) || 1.0 },
      lineage: row.lineage || {},
      metadata: {
        schemaVersion: row.feature_schema_version || '2.0.0',
        builderVersion: row.builder_version || '2.0.0',
        generatedVersion: row.feature_version || '2.0.0',
        normalizationVersion: '1.0.0',
        normalizationMethod: row.normalization_method || 'Identity',
        featureHash: row.feature_hash || '',
        sourceSnapshotId: row.source_snapshot_id || '',
        generationDurationMs: row.generation_duration_ms || 0,
        generatedAt: row.created_at,
        featureCount: 0,
        compatibility: ['All Models'],
      },
      lifecycleState: row.lifecycle_state || 'READY',
      snapshot: row.snapshot_json,
    };
  }

  // Mapper utilities
  private mapModel(row: any): ForecastModel {
    return {
      id: row.id,
      storeId: row.store_id,
      name: row.name,
      modelType: row.model_type,
      framework: row.framework,
      version: row.version,
      artifactUri: row.artifact_uri,
      trainingDataset: row.training_dataset,
      trainingWindow: row.training_window,
      metrics: row.metrics_json || {},
      hyperparameters: row.hyperparameters_json || {},
      status: row.status,
      isDefault: row.is_default || false,
      isDeleted: row.is_deleted || false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapJob(row: any): ForecastJob {
    return {
      id: row.id,
      storeId: row.store_id,
      jobType: row.job_type,
      status: row.status,
      parameters: row.parameters_json || {},
      result: row.result_json,
      errorMessage: row.error_message,
      attempts: row.attempts || 0,
      maxAttempts: row.max_attempts || 3,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      isDeleted: row.is_deleted || false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapSettings(row: any): ForecastSettings {
    return {
      id: row.id,
      storeId: row.store_id,
      forecastHorizon: row.forecast_horizon,
      preferredModel: row.preferred_model,
      predictionFrequency: row.prediction_frequency,
      weatherEnabled: row.weather_enabled,
      festivalEnabled: row.festival_enabled,
      supplierSignalsEnabled: row.supplier_signals_enabled,
      recommendationEnabled: row.recommendation_enabled,
      safetyStockMultiplier: Number(row.safety_stock_multiplier),
      confidenceThreshold: Number(row.confidence_threshold),
      retrainingFrequency: row.retraining_frequency,
      cacheTtlSeconds: row.cache_ttl_seconds,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
