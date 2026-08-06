/**
 * Recommendation Builder
 * Fluent builder pattern constructing recommendation entities from rule evaluations,
 * financial models, and confidence/explainability scoring engines.
 */

import {
  ExplanationDetails,
  FinancialImpact,
  Recommendation,
  RecommendationCategory,
  RecommendationPriority,
  RecommendationRisk,
  RecommendationStatus,
  RecommendationType,
  SimulationResult,
} from './recommendation-types';
import { RecommendationPriorityEngine } from './recommendation-priority';
import { RecommendationScoringEngine } from './recommendation-scoring';
import { RecommendationTTL } from './recommendation-ttl';

export class RecommendationBuilder {
  private rec: Partial<Recommendation> = {
    version: 1,
    status: RecommendationStatus.GENERATED,
    confidence: 0.85,
    explainabilityScore: 85,
    riskScore: 20,
    generatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  private priorityEngine = new RecommendationPriorityEngine();
  private scoringEngine = new RecommendationScoringEngine();
  private ttlEngine = new RecommendationTTL();

  public setStoreId(storeId: string): this {
    this.rec.storeId = storeId;
    return this;
  }

  public setProduct(productId?: string, variantId?: string): this {
    this.rec.productId = productId;
    this.rec.variantId = variantId;
    return this;
  }

  public setForecastTrace(predictionId?: string, featureSnapshotId?: string): this {
    this.rec.forecastPredictionId = predictionId;
    this.rec.featureSnapshotId = featureSnapshotId;
    return this;
  }

  public setTypeAndCategory(type: RecommendationType, category: RecommendationCategory): this {
    this.rec.type = type;
    this.rec.category = category;
    return this;
  }

  public setFinancialImpact(impact: FinancialImpact): this {
    this.rec.financialImpact = impact;
    return this;
  }

  public setConfidenceAndScores(confidence: number, explainabilityScore: number, riskScore: number): this {
    this.rec.confidence = confidence;
    this.rec.explainabilityScore = explainabilityScore;
    this.rec.riskScore = riskScore;
    return this;
  }

  public setReason(reason: string): this {
    this.rec.reason = reason;
    return this;
  }

  public setExplanationDetails(details: ExplanationDetails): this {
    this.rec.explanationDetails = details;
    return this;
  }

  public setSimulationResults(simulation: SimulationResult): this {
    this.rec.simulationResults = simulation;
    return this;
  }

  public build(): Recommendation {
    if (!this.rec.id) {
      this.rec.id = `REC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }

    const impact = this.rec.financialImpact || {
      expectedProfit: 0,
      expectedSavings: 0,
      expectedRevenue: 0,
      expectedCost: 0,
      expectedInventoryReduction: 0,
      blockedCapitalReleased: 0,
    };

    let riskLevel = RecommendationRisk.LOW;
    if ((this.rec.riskScore || 0) >= 75) riskLevel = RecommendationRisk.CRITICAL;
    else if ((this.rec.riskScore || 0) >= 50) riskLevel = RecommendationRisk.HIGH;
    else if ((this.rec.riskScore || 0) >= 25) riskLevel = RecommendationRisk.MEDIUM;

    this.rec.priority = this.priorityEngine.calculatePriority(riskLevel, impact, this.rec.confidence || 0.85);

    this.rec.score = this.scoringEngine.calculateScore(
      this.rec.priority,
      this.rec.confidence || 0.85,
      this.rec.explainabilityScore || 85,
      this.rec.riskScore || 20,
      impact
    );

    this.rec.validUntil = this.ttlEngine.calculateValidUntil(48);

    return this.rec as Recommendation;
  }
}
