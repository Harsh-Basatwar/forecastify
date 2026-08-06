/**
 * Enterprise AI Recommendation & Decision Intelligence Engine Domain Types
 * (Milestone 4)
 */

export enum RecommendationType {
  // Inventory Optimization
  ORDER_MORE = 'ORDER_MORE',
  REDUCE_ORDER = 'REDUCE_ORDER',
  TRANSFER_STOCK = 'TRANSFER_STOCK',
  REBALANCE_STOCK = 'REBALANCE_STOCK',
  SAFETY_STOCK_UPDATE = 'SAFETY_STOCK_UPDATE',
  EMERGENCY_PURCHASE = 'EMERGENCY_PURCHASE',
  STOCK_CONSOLIDATION = 'STOCK_CONSOLIDATION',
  WAREHOUSE_REALLOCATION = 'WAREHOUSE_REALLOCATION',

  // Procurement
  SWITCH_SUPPLIER = 'SWITCH_SUPPLIER',
  SPLIT_PURCHASE = 'SPLIT_PURCHASE',
  MERGE_PURCHASE = 'MERGE_PURCHASE',
  DELAY_PURCHASE = 'DELAY_PURCHASE',
  BULK_BUY = 'BULK_BUY',
  EARLY_PURCHASE = 'EARLY_PURCHASE',
  CONTRACT_PURCHASE = 'CONTRACT_PURCHASE',

  // Pricing
  INCREASE_PRICE = 'INCREASE_PRICE',
  REDUCE_PRICE = 'REDUCE_PRICE',
  MARKDOWN = 'MARKDOWN',
  REMOVE_DISCOUNT = 'REMOVE_DISCOUNT',
  START_PROMOTION = 'START_PROMOTION',
  STOP_PROMOTION = 'STOP_PROMOTION',
  PRICE_OPTIMIZATION = 'PRICE_OPTIMIZATION',

  // Expiry
  FEFO_PRIORITY = 'FEFO_PRIORITY',
  MARKDOWN_PRODUCT = 'MARKDOWN_PRODUCT',
  RETURN_SUPPLIER = 'RETURN_SUPPLIER',
  DONATE_STOCK = 'DONATE_STOCK',
  LIQUIDATE = 'LIQUIDATE',
  DISPOSE = 'DISPOSE',

  // Financial
  REDUCE_CARRYING_COST = 'REDUCE_CARRYING_COST',
  REDUCE_BLOCKED_CAPITAL = 'REDUCE_BLOCKED_CAPITAL',
  INCREASE_MARGIN = 'INCREASE_MARGIN',
  CASHFLOW_OPTIMIZATION = 'CASHFLOW_OPTIMIZATION',
  HIGH_MARGIN_OPPORTUNITY = 'HIGH_MARGIN_OPPORTUNITY',

  // Risk Detection
  STOCKOUT_RISK = 'STOCKOUT_RISK',
  OVERSTOCK_RISK = 'OVERSTOCK_RISK',
  SUPPLIER_RISK = 'SUPPLIER_RISK',
  EXPIRY_RISK = 'EXPIRY_RISK',
  DEMAND_SPIKE = 'DEMAND_SPIKE',
  DEMAND_DROP = 'DEMAND_DROP',
  LEAD_TIME_RISK = 'LEAD_TIME_RISK',
}

export enum RecommendationCategory {
  INVENTORY = 'INVENTORY',
  PROCUREMENT = 'PROCUREMENT',
  PRICING = 'PRICING',
  EXPIRY = 'EXPIRY',
  FINANCIAL = 'FINANCIAL',
  RISK = 'RISK',
}

export enum RecommendationPriority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFO = 'INFO',
}

export enum RecommendationRisk {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum RecommendationStatus {
  GENERATED = 'GENERATED',
  REVIEWED = 'REVIEWED',
  ACCEPTED = 'ACCEPTED',
  SCHEDULED = 'SCHEDULED',
  EXECUTING = 'EXECUTING',
  EXECUTED = 'EXECUTED',
  VERIFIED = 'VERIFIED',
  CLOSED = 'CLOSED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
  DISMISSED = 'DISMISSED',
}

export enum RecommendationDependencyType {
  REQUIRES = 'REQUIRES',
  BLOCKS = 'BLOCKS',
  SUPERSEDES = 'SUPERSEDES',
  DUPLICATES = 'DUPLICATES',
}

export enum RecommendationExecutionStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  ROLLED_BACK = 'ROLLED_BACK',
  IN_PROGRESS = 'IN_PROGRESS',
}

export interface FinancialImpact {
  expectedProfit: number;
  expectedSavings: number;
  expectedRevenue: number;
  expectedCost: number;
  expectedInventoryReduction: number;
  blockedCapitalReleased: number;
  carryingCostReduction?: number;
  marginImprovementPct?: number;
  cashFlowImprovement?: number;
  turnoverGainPct?: number;
}

export interface ConfidenceBreakdown {
  overall: number; // 0 to 1
  predictionConfidence: number;
  inventoryConfidence: number;
  supplierConfidence: number;
  pricingConfidence: number;
}

export interface ExplanationDetails {
  whyGenerated: string;
  supportingForecasts: string[];
  supportingFeatures: Record<string, unknown>;
  supportingInventory: Record<string, unknown>;
  supportingSupplier?: Record<string, unknown>;
  supportingPricing?: Record<string, unknown>;
  expectedOutcome: string;
  riskAssessment: string;
  confidenceJustification: string;
  alternativeActions: string[];
}

export interface SimulationDelta {
  inventoryDelta: number;
  cashDelta: number;
  supplierCapacityDelta: number;
  forecastImpactDelta: number;
  expectedProfitDelta: number;
}

export interface SimulationResult {
  before: {
    inventoryLevel: number;
    cashAvailable: number;
    holdingCost: number;
    expectedRevenue: number;
  };
  after: {
    inventoryLevel: number;
    cashAvailable: number;
    holdingCost: number;
    expectedRevenue: number;
  };
  delta: SimulationDelta;
}

export interface Recommendation {
  id: string;
  storeId: string;
  productId?: string;
  variantId?: string;
  forecastPredictionId?: string;
  featureSnapshotId?: string;
  type: RecommendationType;
  category: RecommendationCategory;
  priority: RecommendationPriority;
  status: RecommendationStatus;
  version: number;
  confidence: number; // 0–1
  explainabilityScore: number; // 0–100
  riskScore: number; // 0–100
  score: number; // 0–100 overall composite recommendation score
  reason: string;
  validUntil?: string; // ISO date for TTL
  financialImpact: FinancialImpact;
  simulationResults?: SimulationResult;
  explanationDetails?: ExplanationDetails;
  supportingFeatures?: Record<string, unknown>;
  chainId?: string;
  parentRecommendationId?: string;
  rejectionReason?: string;
  createdBy?: string;
  generatedAt: string;
  reviewedAt?: string;
  acceptedAt?: string;
  scheduledAt?: string;
  executingAt?: string;
  executedAt?: string;
  verifiedAt?: string;
  dismissedAt?: string;
  expiredAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DependencyEdge {
  id?: string;
  storeId: string;
  sourceRecommendationId: string;
  targetRecommendationId: string;
  dependencyType: RecommendationDependencyType;
  createdAt?: string;
}

export interface RecommendationGraph {
  nodes: Recommendation[];
  edges: DependencyEdge[];
}

export interface RuleDSLDefinition {
  id: string;
  storeId: string;
  ruleName: string;
  category: RecommendationCategory;
  whenClause: string; // e.g. "forecast > stock AND supplierDelay > 5"
  thenAction: RecommendationType;
  priority: RecommendationPriority;
  enabled: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RecommendationRuleInput {
  storeId: string;
  productId: string;
  productName: string;
  currentStock: number;
  safetyStock: number;
  reorderPoint: number;
  forecastDemand: number;
  forecastConfidence?: number;
  unitCost: number;
  unitPrice: number;
  expiryDate?: string;
  supplierLeadTimeDays?: number;
  supplierReliabilityPct?: number;
  supplierId?: string;
  supplierCreditLimit?: number;
  warehouseCapacityMax?: number;
  predictionId?: string;
  featureSnapshotId?: string;
  customFeatures?: Record<string, unknown>;
}

export interface RecommendationRuleResult {
  triggered: boolean;
  type: RecommendationType;
  category: RecommendationCategory;
  priority: RecommendationPriority;
  risk: RecommendationRisk;
  confidence: number;
  reason: string;
  financialImpact: FinancialImpact;
  suggestedActionPayload?: Record<string, unknown>;
}

export interface RecommendationPlugin {
  id: string;
  name: string;
  description: string;
  category: RecommendationCategory;
  evaluate(input: RecommendationRuleInput): Promise<RecommendationRuleResult | null>;
}

export interface RecommendationVersion {
  id: string;
  storeId: string;
  recommendationId: string;
  version: number;
  forecastPredictionId?: string;
  snapshotData: Record<string, unknown>;
  createdAt: string;
}

export interface RecommendationEvent {
  id: string;
  storeId: string;
  recommendationId: string;
  eventType: string; // RecommendationCreated, RecommendationAccepted, etc.
  payload: Record<string, unknown>;
  actorId?: string;
  createdAt: string;
}

export interface RecommendationSettings {
  storeId: string;
  confidenceThreshold: number;
  explainabilityThreshold: number;
  priorityThreshold: RecommendationPriority;
  autoExecuteEnabled: boolean;
  autoExecuteThreshold: number;
  enabledCategories: RecommendationCategory[];
  enabledPlugins: string[];
  ttlHours: number;
  notificationSettings: {
    email: boolean;
    inApp: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
}
