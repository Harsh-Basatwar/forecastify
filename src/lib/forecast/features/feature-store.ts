/**
 * Feature Store (Orchestration Layer for Validation, State Machine, Caching, Snapshots & Persistence Delegation)
 */

import { ForecastFeatureVector, FeatureQueryFilter, FeatureSnapshot } from './feature-types';
import { IForecastRepository, ICache } from '../interfaces';
import { FeatureValidator } from './feature-validator';

export class FeatureStore {
  private validator = new FeatureValidator();

  constructor(
    private readonly repository: IForecastRepository,
    private readonly cache?: ICache
  ) {}

  public async processAndSaveFeatureVector(
    vector: ForecastFeatureVector,
    rawInput?: any
  ): Promise<ForecastFeatureVector> {
    // 1. Transition state: VALIDATING
    let currentVector: ForecastFeatureVector = {
      ...vector,
      lifecycleState: 'VALIDATING',
    };

    // 2. Perform validation
    const validation = this.validator.validate(currentVector);
    currentVector.qualityMetrics = validation.qualityMetrics;

    if (!validation.isValid) {
      currentVector.lifecycleState = 'FAILED';
    } else {
      // 3. Transition state: NORMALIZING (if un-normalized or processed)
      currentVector.lifecycleState = 'NORMALIZING';
    }

    // 4. Mark state: READY
    if (currentVector.lifecycleState !== 'FAILED') {
      currentVector.lifecycleState = 'READY';
    }

    // 5. Create Feature Snapshot for ML training reproducibility
    const snapshot: FeatureSnapshot = {
      snapshotId: `snap-${vector.storeId}-${vector.productId}-${Date.now()}`,
      storeId: vector.storeId,
      productId: vector.productId,
      variantId: vector.variantId,
      timestamp: vector.timestamp,
      rawInput: rawInput || {},
      rawFeatures: vector.rawFeatures || {},
      derivedFeatures: vector.derivedFeatures || {},
      features: vector.features || {},
      qualityMetrics: currentVector.qualityMetrics,
      lineage: vector.lineage || {},
      metadata: vector.metadata,
      lifecycleState: currentVector.lifecycleState,
      createdAt: new Date().toISOString(),
    };

    currentVector.snapshot = snapshot;

    // 6. Delegate persistence to ForecastRepository (Persistence Only)
    const saved = await this.repository.saveFeatureVector(currentVector);

    // 7. Caching layer
    if (this.cache) {
      const cacheKey = this.getCacheKey(saved.storeId, saved.productId, saved.variantId);
      await this.cache.set(cacheKey, saved, 3600);
    }

    return saved;
  }

  public async saveFeatureVector(vector: ForecastFeatureVector): Promise<ForecastFeatureVector> {
    return this.processAndSaveFeatureVector(vector);
  }

  public async getLatestFeatureVector(
    storeId: string,
    productId: string,
    variantId?: string
  ): Promise<ForecastFeatureVector | null> {
    const cacheKey = this.getCacheKey(storeId, productId, variantId);

    // 1. Check Cache first
    if (this.cache) {
      const cached = await this.cache.get<ForecastFeatureVector>(cacheKey);
      if (cached) return cached;
    }

    // 2. Delegate query to Repository
    const fetched = await this.repository.getLatestFeatureVector(storeId, productId, variantId);
    if (fetched && this.cache) {
      await this.cache.set(cacheKey, fetched, 3600);
    }

    return fetched;
  }

  public async getHistoricalFeatureVectors(filter: FeatureQueryFilter): Promise<ForecastFeatureVector[]> {
    return this.repository.getHistoricalFeatureVectors(filter.storeId, filter.productId, filter.limit);
  }

  public async invalidateFeatureVector(storeId: string, productId: string, variantId?: string): Promise<void> {
    if (this.cache) {
      const cacheKey = this.getCacheKey(storeId, productId, variantId);
      await this.cache.delete(cacheKey);
    }
    await this.repository.deleteFeatureVector(storeId, productId);
  }

  private getCacheKey(storeId: string, productId: string, variantId?: string): string {
    return `forecast:features:${storeId}:${productId}${variantId ? `:${variantId}` : ''}`;
  }
}
