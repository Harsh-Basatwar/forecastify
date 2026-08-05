/**
 * Feature Engineering Pipeline Orchestrator (Graph Resolution, Two-Stage Execution, State Transitions & Snapshots)
 */

import {
  ForecastFeatureVector,
  FeatureBuildContext,
  RawOperationalData,
  NormalizationMethod,
  FeatureLineageInfo,
  FeatureMetadata,
  FeatureLifecycleState,
  FeatureSnapshot,
} from './feature-types';
import { FeatureRegistry } from './feature-registry';
import { FeatureDependencyGraph } from './feature-graph';
import { FeatureExecutionPlanner } from './feature-execution-planner';
import { FeatureValidator } from './feature-validator';
import { FeatureNormalizer } from './feature-normalizer';
import { FeatureStore } from './feature-store';
import { PipelineHookManager, PipelineHooks } from './feature-hooks';
import { RawSalesFeatureBuilder } from './feature-builders/raw/raw-sales-builder';
import { RawInventoryFeatureBuilder } from './feature-builders/raw/raw-inventory-builder';
import { RawProcurementFeatureBuilder } from './feature-builders/raw/raw-procurement-builder';
import { RawSupplierFeatureBuilder } from './feature-builders/raw/raw-supplier-builder';
import { RawPricingFeatureBuilder } from './feature-builders/raw/raw-pricing-builder';
import { RawPromotionFeatureBuilder } from './feature-builders/raw/raw-promotion-builder';
import { RawWeatherFeatureBuilder } from './feature-builders/raw/raw-weather-builder';
import { RawExpiryFeatureBuilder } from './feature-builders/raw/raw-expiry-builder';
import { RawCalendarFeatureBuilder } from './feature-builders/raw/raw-calendar-builder';
import { DerivedSalesFeatureBuilder } from './feature-builders/derived/derived-sales-builder';
import { DerivedInventoryFeatureBuilder } from './feature-builders/derived/derived-inventory-builder';
import { DerivedPricingFeatureBuilder } from './feature-builders/derived/derived-pricing-builder';
import { DerivedExpiryFeatureBuilder } from './feature-builders/derived/derived-expiry-builder';

export class FeatureEngineeringPipeline {
  private registry = new FeatureRegistry();
  private graph = new FeatureDependencyGraph();
  private planner = new FeatureExecutionPlanner();
  private validator = new FeatureValidator();
  private normalizer = new FeatureNormalizer();
  private hookManager: PipelineHookManager;

  constructor(
    private readonly featureStore?: FeatureStore,
    hooks?: PipelineHooks
  ) {
    this.hookManager = new PipelineHookManager(hooks);
    this.registerDefaultBuilders();
  }

  public registerDefaultBuilders(): void {
    const defaultBuilders = [
      new RawSalesFeatureBuilder(),
      new RawInventoryFeatureBuilder(),
      new RawProcurementFeatureBuilder(),
      new RawSupplierFeatureBuilder(),
      new RawPricingFeatureBuilder(),
      new RawPromotionFeatureBuilder(),
      new RawWeatherFeatureBuilder(),
      new RawExpiryFeatureBuilder(),
      new RawCalendarFeatureBuilder(),
      new DerivedSalesFeatureBuilder(),
      new DerivedInventoryFeatureBuilder(),
      new DerivedPricingFeatureBuilder(),
      new DerivedExpiryFeatureBuilder(),
    ];

    for (const b of defaultBuilders) {
      this.registry.registerBuilder(b);
      this.graph.addNode(b);
    }
  }

  public getRegistry(): FeatureRegistry {
    return this.registry;
  }

  public getGraph(): FeatureDependencyGraph {
    return this.graph;
  }

  public async executePipeline(params: {
    storeId: string;
    productId: string;
    variantId?: string;
    targetDate?: string;
    rawInput?: RawOperationalData;
    normalizationMethod?: NormalizationMethod;
  }): Promise<ForecastFeatureVector> {
    const startTime = Date.now();
    const targetDate = params.targetDate || new Date().toISOString();
    const rawInput: RawOperationalData = params.rawInput || {};

    const rawFeaturesMap: Record<string, number | boolean | string | null> = {};
    const derivedFeaturesMap: Record<string, number | boolean | string | null> = {};
    const flattenedFeaturesMap: Record<string, number> = {};
    const lineageMap: Record<string, FeatureLineageInfo> = {};

    let currentState: FeatureLifecycleState = 'COLLECTING';

    const allBuilders = this.registry.getAllBuilders();
    const executionPlan = this.planner.planExecution(allBuilders, this.graph);

    const context: FeatureBuildContext = {
      storeId: params.storeId,
      productId: params.productId,
      variantId: params.variantId,
      targetDate,
      rawInput,
      existingRawFeatures: rawFeaturesMap,
    };

    // Execute Stages (COLLECTING raw & derived features)
    for (const stage of executionPlan) {
      if (stage.stageName === 'raw' && stage.isParallel) {
        const results = await Promise.all(stage.builders.map((b) => b.build(context)));
        for (const res of results) {
          Object.assign(rawFeaturesMap, res.features);
          Object.assign(lineageMap, res.lineage);
        }
      } else {
        for (const builder of stage.builders) {
          const res = await builder.build(context);
          Object.assign(derivedFeaturesMap, res.features);
          Object.assign(lineageMap, res.lineage);
        }
      }
    }

    // Flatten into numeric ML features map
    for (const [key, val] of Object.entries(rawFeaturesMap)) {
      if (typeof val === 'number') flattenedFeaturesMap[key] = val;
      else if (typeof val === 'boolean') flattenedFeaturesMap[key] = val ? 1 : 0;
    }
    for (const [key, val] of Object.entries(derivedFeaturesMap)) {
      if (typeof val === 'number') flattenedFeaturesMap[key] = val;
      else if (typeof val === 'boolean') flattenedFeaturesMap[key] = val ? 1 : 0;
    }

    const durationMs = Date.now() - startTime;
    const featureCount = Object.keys(flattenedFeaturesMap).length;

    const metadata: FeatureMetadata = {
      schemaVersion: '2.0.0',
      builderVersion: '2.0.0',
      generatedVersion: `gen-${Date.now()}`,
      normalizationVersion: '1.0.0',
      normalizationMethod: params.normalizationMethod || 'Identity',
      featureHash: this.calculateHash(flattenedFeaturesMap),
      sourceSnapshotId: `snap-${params.storeId}-${Date.now()}`,
      generationDurationMs: durationMs,
      generatedAt: new Date().toISOString(),
      featureCount,
      compatibility: ['All Models'],
    };

    let vector: ForecastFeatureVector = {
      storeId: params.storeId,
      productId: params.productId,
      variantId: params.variantId,
      timestamp: targetDate,
      rawFeatures: rawFeaturesMap,
      derivedFeatures: derivedFeaturesMap,
      features: flattenedFeaturesMap,
      qualityMetrics: {
        qualityScore: 1.0,
        missingPercentage: 0,
        imputedPercentage: 0,
        freshnessMs: 0,
        completenessScore: 1.0,
        validationErrorCount: 0,
        validationErrors: [],
      },
      lineage: lineageMap,
      metadata,
      lifecycleState: currentState,
    };

    // Transition State: VALIDATING
    currentState = 'VALIDATING';
    vector.lifecycleState = currentState;

    await this.hookManager.triggerBeforeValidation(vector);
    const validation = this.validator.validate(vector);
    vector.qualityMetrics = validation.qualityMetrics;
    await this.hookManager.triggerAfterValidation(vector, validation);

    if (!validation.isValid) {
      vector.lifecycleState = 'FAILED';
      return vector;
    }

    // Transition State: NORMALIZING
    currentState = 'NORMALIZING';
    vector.lifecycleState = currentState;

    await this.hookManager.triggerBeforeNormalization(vector);
    if (params.normalizationMethod && params.normalizationMethod !== 'Identity') {
      vector = this.normalizer.normalize(vector, params.normalizationMethod);
    }
    await this.hookManager.triggerAfterNormalization(vector);

    // Transition State: READY
    currentState = 'READY';
    vector.lifecycleState = currentState;

    // Create Feature Snapshot for ML training reproducibility
    const snapshot: FeatureSnapshot = {
      snapshotId: `snap-${params.storeId}-${params.productId}-${Date.now()}`,
      storeId: params.storeId,
      productId: params.productId,
      variantId: params.variantId,
      timestamp: targetDate,
      rawInput,
      rawFeatures: rawFeaturesMap,
      derivedFeatures: derivedFeaturesMap,
      features: flattenedFeaturesMap,
      qualityMetrics: vector.qualityMetrics,
      lineage: lineageMap,
      metadata: vector.metadata,
      lifecycleState: currentState,
      createdAt: new Date().toISOString(),
    };
    vector.snapshot = snapshot;

    await this.hookManager.triggerBeforeSave(vector);
    if (this.featureStore) {
      vector = await this.featureStore.processAndSaveFeatureVector(vector, rawInput);
    }
    await this.hookManager.triggerAfterSave(vector);

    return vector;
  }

  private calculateHash(features: Record<string, number>): string {
    const str = Object.keys(features)
      .sort()
      .map((k) => `${k}:${features[k]}`)
      .join('|');

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `h_${Math.abs(hash).toString(16)}`;
  }
}
