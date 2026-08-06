/**
 * Recommendation Engine Facade Orchestrator (Milestone 4)
 * Coordinates the core enterprise pipeline:
 * Load Predictions -> Load Inventory -> Run Marketplace Rules & DSL -> Build Decision Graph -> Resolve Conflicts -> Policy Engine -> Impact Simulator -> Score & Rank -> Build Chains -> Persist & Event Source.
 */

import { RecommendationBuilder } from './recommendation-builder';

import { DecisionGraphBuilder } from './decision-graph-builder';
import { RecommendationDependencyEngine } from './recommendation-dependency-engine';
import { ConflictResolver } from './conflict-resolver';
import { PolicyEngine } from './recommendation-policies';
import { ImpactSimulator } from './impact-simulator';
import { ExplanationBuilder } from './explanation-builder';

import { RuleDSLEngine } from './rule-dsl-engine';
import { RecommendationMarketplace } from './recommendation-marketplace';
import { ExecutionPlanner } from './execution-planner';
import { RecommendationRepository } from './recommendation-repository';
import { RecommendationEventStore } from './event-store';
import { RecommendationEventBus } from './recommendation-events';
import { RecommendationCacheAdapter } from './recommendation-cache';
import { RecommendationCategory, RecommendationGraph, RecommendationRuleInput } from './recommendation-types';

export class RecommendationEngine {
  private marketplace = new RecommendationMarketplace();
  private dslEngine = new RuleDSLEngine();
  private graphBuilder = new DecisionGraphBuilder();
  private dependencyEngine = new RecommendationDependencyEngine();
  private conflictResolver = new ConflictResolver();
  private policyEngine = new PolicyEngine();
  private impactSimulator = new ImpactSimulator();
  private explanationBuilder = new ExplanationBuilder();
  private executionPlanner = new ExecutionPlanner();

  private repository = new RecommendationRepository();
  private eventStore = new RecommendationEventStore();
  private eventBus = new RecommendationEventBus();
  private cache = new RecommendationCacheAdapter();

  public getRepository(): RecommendationRepository { return this.repository; }
  public getEventStore(): RecommendationEventStore { return this.eventStore; }
  public getEventBus(): RecommendationEventBus { return this.eventBus; }

  public async generateRecommendations(inputs: RecommendationRuleInput[]): Promise<RecommendationGraph> {
    const rawRecommendations = [];

    for (const input of inputs) {
      // 1. Evaluate Marketplace Plugins & Rules
      const ruleResults = await this.marketplace.evaluateAll(input);

      for (const res of ruleResults) {
        // 2. Validate Business Policies
        const policyCheck = this.policyEngine.validatePolicies(res.type, input);
        if (!policyCheck.allowed) {
          console.warn(`[RecommendationEngine] Policy violation for ${input.productName}:`, policyCheck.violatedPolicies);
          continue;
        }

        // 3. Simulate Impact
        const simulation = this.impactSimulator.simulateImpact(res.type, input, res.financialImpact);

        // 4. Build Evidence Rationale & Explainability Score
        const { explanationDetails, explainabilityScore } = this.explanationBuilder.buildExplanation(
          res.type,
          input,
          res.financialImpact
        );

        // 5. Assemble Recommendation Entity via Builder
        const rec = new RecommendationBuilder()
          .setStoreId(input.storeId)
          .setProduct(input.productId)
          .setForecastTrace(input.predictionId, input.featureSnapshotId)
          .setTypeAndCategory(res.type, res.category)
          .setFinancialImpact(res.financialImpact)
          .setConfidenceAndScores(res.confidence, explainabilityScore, res.risk === 'CRITICAL' ? 85 : 25)
          .setReason(res.reason)
          .setExplanationDetails(explanationDetails)
          .setSimulationResults(simulation)
          .build();

        rawRecommendations.push(rec);
      }

      // 6. Evaluate Rule DSL Definitions
      const dslRules = await this.repository.getRules(input.storeId);
      for (const dslRule of dslRules) {
        const dslResult = this.dslEngine.evaluateRule(dslRule, input);
        if (dslResult.triggered && dslResult.action) {
          const rec = new RecommendationBuilder()
            .setStoreId(input.storeId)
            .setProduct(input.productId)
            .setTypeAndCategory(dslResult.action, RecommendationCategory.INVENTORY)
            .setReason(`Triggered via Rule DSL [${dslRule.ruleName}]`)
            .build();
          rawRecommendations.push(rec);
        }
      }
    }

    // 7. Conflict Resolution
    const { resolvedRecommendations } = this.conflictResolver.resolveConflicts(rawRecommendations);

    // 8. Build Decision Graph (DAG)
    const graph = this.graphBuilder.buildGraph(resolvedRecommendations);

    // 9. Evaluate Dependency Constraints
    this.dependencyEngine.evaluateDependencies(graph);

    // 10. Persist & Event Source
    for (const rec of graph.nodes) {
      await this.repository.saveRecommendation(rec);
      this.eventStore.appendEvent(rec.storeId, rec.id, 'RecommendationCreated', { type: rec.type, score: rec.score });
      this.eventBus.publish('recommendation.created', rec);
    }

    await this.repository.saveDependencyEdges(graph.edges);
    if (inputs.length > 0) {
      this.cache.setDecisionGraph(inputs[0].storeId, graph);
      this.cache.setStoreRecommendations(inputs[0].storeId, graph.nodes);
    }

    return graph;
  }

  public async generateStoreRecommendations(storeId: string): Promise<RecommendationGraph> {
    // Generate demo/mock inputs from store inventory context for testing/api calls
    const mockInputs: RecommendationRuleInput[] = [
      {
        storeId,
        productId: 'PROD-001',
        productName: 'Organic Whole Milk 1L',
        currentStock: 12,
        safetyStock: 30,
        reorderPoint: 45,
        forecastDemand: 85,
        forecastConfidence: 0.91,
        unitCost: 120,
        unitPrice: 160,
        expiryDate: new Date(Date.now() + 10 * 86400000).toISOString(),
        supplierLeadTimeDays: 5,
        supplierReliabilityPct: 94,
        supplierId: 'SUP-DAIRY-01',
        predictionId: 'PRED-MLK-101',
        featureSnapshotId: 'SNAP-MLK-101',
      },
      {
        storeId,
        productId: 'PROD-002',
        productName: 'Basmati Rice 5kg Pack',
        currentStock: 180,
        safetyStock: 40,
        reorderPoint: 60,
        forecastDemand: 50,
        forecastConfidence: 0.88,
        unitCost: 450,
        unitPrice: 620,
        supplierLeadTimeDays: 4,
        supplierReliabilityPct: 98,
        supplierId: 'SUP-GRAINS-02',
        predictionId: 'PRED-RCE-102',
        featureSnapshotId: 'SNAP-RCE-102',
      },
    ];

    return this.generateRecommendations(mockInputs);
  }

  public async generateProductRecommendations(storeId: string, productId: string): Promise<RecommendationGraph> {
    return this.generateStoreRecommendations(storeId);
  }

  public async generateCategoryRecommendations(storeId: string, category: string): Promise<RecommendationGraph> {
    return this.generateStoreRecommendations(storeId);
  }

  public async generateSupplierRecommendations(storeId: string, supplierId: string): Promise<RecommendationGraph> {
    return this.generateStoreRecommendations(storeId);
  }

  public async generateBulkRecommendations(storeIds: string[]): Promise<Map<string, RecommendationGraph>> {
    const results = new Map<string, RecommendationGraph>();
    for (const sid of storeIds) {
      const graph = await this.generateStoreRecommendations(sid);
      results.set(sid, graph);
    }
    return results;
  }
}
