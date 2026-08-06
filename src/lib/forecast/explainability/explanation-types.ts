/**
 * Enterprise Explainability (XAI) & Decision Transparency Engine Types
 * Milestone 5 - Forecastify
 */

export enum ExplanationType {
  PREDICTION = 'PREDICTION',
  RECOMMENDATION = 'RECOMMENDATION',
  FEATURE = 'FEATURE',
  STORE = 'STORE',
  CATEGORY = 'CATEGORY',
}

export enum EvidenceType {
  PREDICTION = 'PREDICTION',
  FEATURE_VECTOR = 'FEATURE_VECTOR',
  INVENTORY_SNAPSHOT = 'INVENTORY_SNAPSHOT',
  SUPPLIER_SNAPSHOT = 'SUPPLIER_SNAPSHOT',
  PRICING_SNAPSHOT = 'PRICING_SNAPSHOT',
  MODEL_METADATA = 'MODEL_METADATA',
  RECOMMENDATION = 'RECOMMENDATION',
  WEATHER = 'WEATHER',
  PROMOTION = 'PROMOTION',
  HOLIDAY = 'HOLIDAY',
}

export enum ConfidenceLevel {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  CRITICAL = 'CRITICAL',
}

export enum ExplanationAudience {
  EXECUTIVE = 'EXECUTIVE',
  MANAGER = 'MANAGER',
  ANALYST = 'ANALYST',
  DEVELOPER = 'DEVELOPER',
  API = 'API',
}

export enum CounterfactualStatus {
  SIMULATED = 'SIMULATED',
  APPLIED = 'APPLIED',
  REJECTED = 'REJECTED',
  PENDING = 'PENDING',
}

export enum AttributionStrategyType {
  COEFFICIENT = 'COEFFICIENT',
  PERMUTATION = 'PERMUTATION',
  GAIN_BASED = 'GAIN_BASED',
  SHAP_ADAPTER = 'SHAP_ADAPTER',
  INTEGRATED_GRADIENTS = 'INTEGRATED_GRADIENTS',
}

export enum ExplanationQualityRating {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
}

export interface FeatureContribution {
  featureId: string;
  featureName: string;
  category: 'lag' | 'promotion' | 'holiday' | 'inventory' | 'supplier' | 'pricing' | 'weather' | 'calendar';
  contributionValue: number; // Raw attribution delta
  normalizedPercentage: number; // Normalized % (0 to 100)
  direction: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  baselineValue: number;
  currentValue: number;
  importanceRank: number;
}

export interface EvidenceConfidenceMap {
  inventorySnapshotConfidence: number; // 0 to 100
  supplierReliabilityConfidence: number;
  weatherConfidence: number;
  promotionConfidence: number;
  pricingConfidence: number;
  overallEvidenceConfidence: number;
}

export interface Evidence {
  evidenceId: string;
  type: EvidenceType;
  entityId: string;
  title: string;
  description: string;
  confidence: number;
  timestamp: string;
  sourceSystem: string;
  metadata: Record<string, unknown>;
}

export interface ConfidenceBreakdown {
  overallConfidence: number; // 0 to 100
  level: ConfidenceLevel;
  components: {
    predictionConfidence: number;
    modelQuality: number;
    featureCompleteness: number;
    dataFreshness: number;
    supplierReliability: number;
    inventoryAccuracy: number;
    weatherReliability: number;
  };
  evidenceConfidenceMap: EvidenceConfidenceMap;
  rationale: string;
}

export interface Assumption {
  assumptionId: string;
  category: 'supplier' | 'weather' | 'pricing' | 'promotion' | 'inventory' | 'general';
  statement: string;
  riskRating: 'LOW' | 'MEDIUM' | 'HIGH';
  impactScope: string;
  valueExpected: string | number;
  isVerified: boolean;
}

export interface AlternativeDecision {
  alternativeId: string;
  title: string;
  actionType: string;
  description: string;
  reasonNotChosen: string;
  relativeConfidence: number;
  financialImpactDelta: number;
  tradeOffs: string[];
}

export interface RecommendationComparison {
  primaryRecommendationId: string;
  primaryTitle: string;
  alternatives: AlternativeDecision[];
  selectionCriteria: {
    roiWeight: number;
    riskWeight: number;
    leadTimeWeight: number;
    winningMarginPercentage: number;
  };
  comparisonSummary: string;
}

export interface ExplanationLineage {
  lineageId: string;
  explanationId: string;
  predictionId?: string;
  featureVectorId?: string;
  modelVersionId: string;
  trainingDatasetId: string;
  featureSchemaId: string;
  recommendationId?: string;
  lineageHash: string;
  timestamp: string;
}

export interface ExplanationGraphNode {
  id: string;
  label: string;
  type: 'PREDICTION' | 'FEATURE' | 'INSIGHT' | 'RECOMMENDATION' | 'ACTION';
  value?: string | number;
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export interface ExplanationGraphEdge {
  sourceId: string;
  targetId: string;
  relation: string;
  weight?: number;
}

export interface ExplanationGraph {
  nodes: ExplanationGraphNode[];
  edges: ExplanationGraphEdge[];
  rootId: string;
}

export interface ExplanationDiff {
  explanationId: string;
  versionFrom: number;
  versionTo: number;
  confidenceDelta: number;
  scoreDelta: number;
  attributionChanges: {
    featureId: string;
    featureName: string;
    percentageBefore: number;
    percentageAfter: number;
    changeDelta: number;
  }[];
  assumptionsAdded: string[];
  assumptionsRemoved: string[];
  summary: string;
  timestamp: string;
}

export interface ExplanationQualityMetrics {
  qualityScore: number; // 0 to 100
  rating: ExplanationQualityRating;
  metrics: {
    readabilityIndex: number;
    evidenceDensity: number;
    determinismScore: number;
    structuralConsistency: number;
    schemaCompliance: number;
  };
}

export interface ExplainabilityPolicyConfig {
  minimumEvidenceCount: number;
  minimumConfidenceThreshold: number;
  requireDeterministicValidation: boolean;
  allowMissingFeatures: boolean;
  maxAssumptionsAllowed: number;
}

export interface CounterfactualScenario {
  scenarioId: string;
  runId: string;
  sessionId?: string;
  name: string;
  modifiedInputs: Record<string, unknown>;
  simulatedOutputs: {
    originalPrediction: number;
    simulatedPrediction: number;
    predictionDelta: number;
    predictionPercentageChange: number;
    originalRecommendation: string;
    simulatedRecommendation: string;
    recommendationChanged: boolean;
  };
  assumptions: Assumption[];
  explanationSummary: string;
  status: CounterfactualStatus;
  timestamp: string;
}

export interface CounterfactualSession {
  sessionId: string;
  storeId: string;
  title: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'SAVED';
  baselineExplanationId: string;
  scenarios: CounterfactualScenario[];
  createdAt: string;
  updatedAt: string;
}

export interface ExplanationMetadata {
  generatedAt: string;
  version: number;
  storeId?: string;
  productId?: string;
  modelType?: string;
  audience: ExplanationAudience;
  attributionStrategy: AttributionStrategyType;
  ttlExpiresAt?: string;
}

export interface ExplainabilityScoreDetails {
  totalScore: number; // 0 to 100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  breakdown: {
    evidenceCompleteness: number; // max 25
    featureAttributionQuality: number; // max 25
    confidenceClarity: number; // max 20
    assumptionsSpecificity: number; // max 15
    alternativesEvaluation: number; // max 15
  };
}

export interface Explanation {
  explanationId: string;
  predictionId?: string;
  recommendationId?: string;
  predictionValue?: number;
  explanationType: ExplanationType;
  audience: ExplanationAudience;
  headline: string;
  summary: string;
  detailedRationale: string[];
  evidenceList: Evidence[];
  featureAttributions: FeatureContribution[];
  confidenceBreakdown: ConfidenceBreakdown;
  assumptions: Assumption[];
  alternatives: AlternativeDecision[];
  recommendationComparison?: RecommendationComparison;
  explainabilityScore: ExplainabilityScoreDetails;
  qualityMetrics: ExplanationQualityMetrics;
  lineage: ExplanationLineage;
  graph: ExplanationGraph;
  metadata: ExplanationMetadata;
}

export interface AudienceTemplate {
  templateKey: string; // 'executive', 'manager', 'analyst', 'developer', 'api'
  audience: ExplanationAudience;
  sections: {
    headline: boolean;
    summary: boolean;
    detailedRationale: boolean;
    featureWaterfall: boolean;
    confidenceBreakdown: boolean;
    assumptions: boolean;
    alternatives: boolean;
    lineageHash: boolean;
    graphData: boolean;
    rawEvidence: boolean;
  };
}
