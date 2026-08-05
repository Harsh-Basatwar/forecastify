import { SupabaseClient } from '@supabase/supabase-js';
import { ModelMetadata, ModelLifecycleStatus, ResourceMetadata, ModelHealthStatus } from '../interfaces';

export class ModelRepository {
  constructor(private client?: SupabaseClient) {}

  public async saveModelMetadata(storeId: string, meta: ModelMetadata): Promise<ModelMetadata> {
    if (!this.client) return meta;
    try {
      const { data, error } = await this.client
        .from('forecast_models')
        .insert({
          store_id: storeId,
          name: meta.name,
          model_type: meta.modelType,
          framework: meta.framework,
          version: meta.version,
          artifact_uri: meta.artifactUri,
          dataset_version: meta.datasetVersion,
          dataset_hash: meta.datasetHash,
          feature_snapshot_version: meta.featureSnapshotVersion,
          artifact_checksum: meta.artifactChecksum,
          framework_version: meta.frameworkVersion,
          serialization_format: meta.serializationFormat,
          status: meta.status,
          resource_metadata: meta.resourceMetadata || {},
        })
        .select()
        .single();

      if (error || !data) return meta;
      return this.mapRowToMetadata(data);
    } catch {
      return meta;
    }
  }

  public async updateModelStatus(
    modelId: string,
    status: ModelLifecycleStatus,
    deploymentNotes?: string
  ): Promise<boolean> {
    if (!this.client) return true;
    try {
      const { error } = await this.client
        .from('forecast_models')
        .update({
          status,
          deployment_notes: deploymentNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', modelId);

      return !error;
    } catch {
      return false;
    }
  }

  public async getModelMetadata(modelId: string): Promise<ModelMetadata | null> {
    if (!this.client) return null;
    try {
      const { data, error } = await this.client
        .from('forecast_models')
        .select('*')
        .eq('id', modelId)
        .maybeSingle();

      if (error || !data) return null;
      return this.mapRowToMetadata(data);
    } catch {
      return null;
    }
  }

  public async listStoreModels(storeId: string): Promise<ModelMetadata[]> {
    if (!this.client) return [];
    try {
      const { data, error } = await this.client
        .from('forecast_models')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (error || !data) return [];
      return data.map((row) => this.mapRowToMetadata(row));
    } catch {
      return [];
    }
  }

  private mapRowToMetadata(row: any): ModelMetadata {
    return {
      id: row.id,
      name: row.name,
      modelType: row.model_type,
      framework: row.framework,
      version: row.version,
      datasetVersion: row.dataset_version || '1.0.0',
      datasetHash: row.dataset_hash,
      featureSnapshotVersion: row.feature_snapshot_version || '1.0.0',
      status: row.status as ModelLifecycleStatus,
      artifactChecksum: row.artifact_checksum,
      artifactUri: row.artifact_uri,
      frameworkVersion: row.framework_version || '1.0.0',
      serializationFormat: row.serialization_format || 'json',
      resourceMetadata: row.resource_metadata || {},
      capabilities: {
        supportsMultivariate: true,
        supportsProbabilistic: true,
        supportsConfidenceInterval: true,
        supportsIncrementalLearning: true,
        supportsOnlineLearning: false,
        supportsMissingData: true,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
