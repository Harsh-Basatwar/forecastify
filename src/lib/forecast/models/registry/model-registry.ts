import { IForecastModel, ModelMetadata, ModelLifecycleStatus } from '../interfaces';
import { ModelVersion } from './model-version';

export class ModelRegistry {
  private registeredModels: Map<string, IForecastModel> = new Map();
  private metadataMap: Map<string, ModelMetadata> = new Map();
  private activeStoreModels: Map<string, string> = new Map(); // key: storeId, val: modelId

  public registerModel(model: IForecastModel, initialStatus: ModelLifecycleStatus = 'DRAFT'): ModelMetadata {
    const meta = model.getMetadata();
    meta.status = initialStatus;
    meta.updatedAt = new Date().toISOString();

    this.registeredModels.set(model.id, model);
    this.metadataMap.set(model.id, meta);

    return meta;
  }

  public getModel(modelId: string): IForecastModel | null {
    return this.registeredModels.get(modelId) || null;
  }

  public getMetadata(modelId: string): ModelMetadata | null {
    return this.metadataMap.get(modelId) || null;
  }

  public updateStatus(modelId: string, status: ModelLifecycleStatus): ModelMetadata | null {
    const meta = this.metadataMap.get(modelId);
    if (!meta) return null;
    meta.status = status;
    meta.updatedAt = new Date().toISOString();
    this.metadataMap.set(modelId, meta);
    return meta;
  }

  public setDeployed(storeId: string, modelId: string): boolean {
    const model = this.registeredModels.get(modelId);
    if (!model) return false;

    // Retire previous DEPLOYED model for store
    for (const [id, meta] of this.metadataMap.entries()) {
      if (meta.status === 'DEPLOYED') {
        meta.status = 'RETIRED';
      }
    }

    this.updateStatus(modelId, 'DEPLOYED');
    this.activeStoreModels.set(storeId, modelId);
    return true;
  }

  public getActiveModel(storeId: string): IForecastModel | null {
    const modelId = this.activeStoreModels.get(storeId);
    if (modelId) {
      return this.getModel(modelId);
    }
    // Fallback to any DEPLOYED or READY model
    for (const meta of this.metadataMap.values()) {
      if (meta.status === 'DEPLOYED' || meta.status === 'READY') {
        return this.getModel(meta.id);
      }
    }
    return null;
  }

  public listModels(status?: ModelLifecycleStatus): ModelMetadata[] {
    const list = Array.from(this.metadataMap.values());
    if (status) {
      return list.filter((m) => m.status === status);
    }
    return list;
  }

  public hasModel(modelId: string): boolean {
    return this.registeredModels.has(modelId);
  }
}
