/**
 * Forecast Engine 2.0 - Feature Engineering Pipeline Types & Data Contracts
 */

export type ModelCompatibility = 'Tree Models' | 'Linear Models' | 'Neural Networks' | 'All Models';
export type BuilderStage = 'raw' | 'derived';
export type NormalizationMethod = 'Identity' | 'MinMax' | 'ZScore' | 'RobustScaler';
export type FeatureLifecycleState = 'COLLECTING' | 'VALIDATING' | 'NORMALIZING' | 'READY' | 'ARCHIVED' | 'FAILED';

export interface FeatureLineageInfo {
  featureName: string;
  sourceTable: string;
  sourceField: string;
  builderName: string;
  builderVersion: string;
  transformation?: string;
}

export interface FeatureMetadata {
  schemaVersion: string;
  builderVersion: string;
  generatedVersion: string;
  normalizationVersion: string;
  normalizationMethod: NormalizationMethod;
  featureHash: string;
  sourceSnapshotId: string;
  generationDurationMs: number;
  generatedAt: string;
  featureCount: number;
  compatibility: ModelCompatibility[];
}

export interface FeatureQualityMetrics {
  qualityScore: number; // 0.0 to 1.0
  missingPercentage: number;
  imputedPercentage: number;
  freshnessMs: number;
  completenessScore: number;
  validationErrorCount: number;
  validationErrors: string[];
}

export interface FeatureSnapshot {
  snapshotId: string;
  storeId: string;
  productId: string;
  variantId?: string;
  timestamp: string;
  rawInput: RawOperationalData;
  rawFeatures: Record<string, number | boolean | string | null>;
  derivedFeatures: Record<string, number | boolean | string | null>;
  features: Record<string, number>;
  qualityMetrics: FeatureQualityMetrics;
  lineage: Record<string, FeatureLineageInfo>;
  metadata: FeatureMetadata;
  lifecycleState: FeatureLifecycleState;
  createdAt: string;
}

export interface ForecastFeatureVector {
  id?: string;
  storeId: string;
  productId: string;
  variantId?: string;
  timestamp: string;
  
  // Raw Feature Maps
  rawFeatures: Record<string, number | boolean | string | null>;
  
  // Derived Feature Maps
  derivedFeatures: Record<string, number | boolean | string | null>;
  
  // Flattened features map for fast ML consumption
  features: Record<string, number>;
  
  // Quality, Lineage, Metadata, State & Snapshot
  qualityMetrics: FeatureQualityMetrics;
  lineage: Record<string, FeatureLineageInfo>;
  metadata: FeatureMetadata;
  lifecycleState: FeatureLifecycleState;
  snapshot?: FeatureSnapshot;
}

export interface RawOperationalData {
  salesHistory?: Array<{ date: string; quantity: number; amount: number }>;
  inventory?: {
    currentStock: number;
    availableStock: number;
    reservedStock: number;
    incomingStock: number;
    onOrderStock: number;
    safetyStock: number;
    reorderPoint: number;
    stockCoverDays?: number;
    inventoryTurnover?: number;
    stockAgeDays?: number;
    expiredQuantity?: number;
    nearestExpiryDays?: number;
    batchCount?: number;
  };
  procurement?: {
    averageLeadTimeDays: number;
    supplierDelayDays: number;
    openPurchaseOrdersCount: number;
    incomingQuantity: number;
    procurementCost: number;
    supplierFillRate: number;
    supplierReliability: number;
  };
  supplier?: {
    averagePrice: number;
    priceVolatility: number;
    supplierRating: number;
    leadTimeDays: number;
    isPreferredSupplier: boolean;
    supplierPerformanceScore: number;
  };
  pricing?: {
    currentSellingPrice: number;
    purchasePrice: number;
    mrp: number;
    discountAmount: number;
    historicalPriceChangesCount: number;
    historicalPriceSeries?: number[];
  };
  promotion?: {
    isPromotionRunning: boolean;
    promotionTypes: string[];
    daysRemaining: number;
    discountPercentage: number;
    isFestivalPromotion: boolean;
  };
  weather?: {
    temperatureCelsius: number;
    humidityPercentage: number;
    rainfallMm: number;
    weatherCategory: string;
    heatIndex: number;
  };
  calendar?: {
    date: string;
    dayOfWeek: number;
    weekNumber: number;
    month: number;
    quarter: number;
    isWeekend: boolean;
    isHoliday: boolean;
    isFestival: boolean;
    financialYear: string;
    season: string;
  };
  expiry?: {
    nearestExpiryDate?: string;
    nearestExpiryDays?: number;
    averageShelfLifeDays?: number;
    expiredQuantity?: number;
    expiryRiskLevel?: 'low' | 'medium' | 'high' | 'critical';
    batchCount?: number;
    fefoPriorityScore?: number;
  };
}

export interface FeatureBuildContext {
  storeId: string;
  productId: string;
  variantId?: string;
  targetDate: string;
  rawInput: RawOperationalData;
  existingRawFeatures?: Record<string, number | boolean | string | null>;
}

export interface FeatureBuildResult {
  features: Record<string, number | boolean | string | null>;
  lineage: Record<string, FeatureLineageInfo>;
  imputedCount?: number;
  missingCount?: number;
}

export interface IFeatureBuilder {
  readonly name: string;
  readonly version: string;
  readonly stage: BuilderStage;
  readonly dependencies: string[];
  readonly compatibility: ModelCompatibility[];

  build(context: FeatureBuildContext): Promise<FeatureBuildResult>;
}

export interface FeatureValidationResult {
  isValid: boolean;
  qualityMetrics: FeatureQualityMetrics;
  errors: string[];
  warnings: string[];
}

export interface FeatureQueryFilter {
  storeId: string;
  productId?: string;
  variantId?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  featureVersion?: string;
}
