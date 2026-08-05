import { SupabaseClient } from '@supabase/supabase-js';
import { PredictionResult } from '../interfaces';

export interface SavedPredictionRow {
  id: string;
  storeId: string;
  productId: string;
  modelId: string;
  modelVersion: string;
  predictionSchemaVersion: string;
  featureSchemaVersion: string;
  horizon: string;
  predictionResult: PredictionResult;
  latencyMs: number;
  createdAt: string;
}

export class PredictionRepository {
  private inMemoryHistory: SavedPredictionRow[] = [];

  constructor(private client?: SupabaseClient) {}

  public async savePrediction(result: PredictionResult): Promise<SavedPredictionRow> {
    const row: SavedPredictionRow = {
      id: `pred-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      storeId: result.storeId,
      productId: result.productId,
      modelId: result.modelId,
      modelVersion: result.modelVersion,
      predictionSchemaVersion: result.predictionSchemaVersion || '1.0.0',
      featureSchemaVersion: result.featureSchemaVersion || '1.0.0',
      horizon: result.horizon,
      predictionResult: result,
      latencyMs: result.metadata?.latencyMs || 0,
      createdAt: new Date().toISOString(),
    };

    this.inMemoryHistory.unshift(row);
    if (this.inMemoryHistory.length > 500) {
      this.inMemoryHistory.pop();
    }

    if (this.client) {
      try {
        await this.client.from('forecast_predictions').insert({
          store_id: result.storeId,
          product_id: result.productId,
          model_id: result.modelId,
          model_version: result.modelVersion,
          prediction_schema_version: result.predictionSchemaVersion || '1.0.0',
          feature_schema_version: result.featureSchemaVersion || '1.0.0',
          horizon: result.horizon,
          prediction_result: result,
          latency_ms: result.metadata?.latencyMs || 0,
        });
      } catch {
        // Fallback to in-memory history
      }
    }

    return row;
  }

  public async getProductPredictionHistory(storeId: string, productId: string, limit: number = 20): Promise<SavedPredictionRow[]> {
    if (this.client) {
      try {
        const { data, error } = await this.client
          .from('forecast_predictions')
          .select('*')
          .eq('store_id', storeId)
          .eq('product_id', productId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (!error && data) {
          return data.map((d) => ({
            id: d.id,
            storeId: d.store_id,
            productId: d.product_id,
            modelId: d.model_id,
            modelVersion: d.model_version,
            predictionSchemaVersion: d.prediction_schema_version,
            featureSchemaVersion: d.feature_schema_version,
            horizon: d.horizon,
            predictionResult: d.prediction_result,
            latencyMs: d.latency_ms,
            createdAt: d.created_at,
          }));
        }
      } catch {
        // Fallback to in-memory history
      }
    }

    return this.inMemoryHistory
      .filter((p) => p.storeId === storeId && p.productId === productId)
      .slice(0, limit);
  }
}
