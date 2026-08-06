import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { DecisionGraphBuilder, RecommendationDependencyEngine, Recommendation, RecommendationType, RecommendationCategory, RecommendationPriority, RecommendationStatus, RecommendationDependencyType } from '../../../lib/forecast/recommendations';

describe('Decision Graph & Dependency Engine Tests', () => {
  test('should build graph and evaluate blocking dependencies', () => {
    const builder = new DecisionGraphBuilder();
    const depEngine = new RecommendationDependencyEngine();

    const recs: Recommendation[] = [
      {
        id: 'REC-1',
        storeId: 'store-1',
        productId: 'PROD-1',
        type: RecommendationType.MARKDOWN,
        category: RecommendationCategory.EXPIRY,
        priority: RecommendationPriority.HIGH,
        status: RecommendationStatus.GENERATED,
        version: 1,
        confidence: 0.90,
        explainabilityScore: 90,
        riskScore: 30,
        score: 85,
        reason: 'Near expiry',
        financialImpact: { expectedProfit: 100, expectedSavings: 50, expectedRevenue: 200, expectedCost: 100, expectedInventoryReduction: 10, blockedCapitalReleased: 100 },
        generatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'REC-2',
        storeId: 'store-1',
        productId: 'PROD-1',
        type: RecommendationType.ORDER_MORE,
        category: RecommendationCategory.INVENTORY,
        priority: RecommendationPriority.MEDIUM,
        status: RecommendationStatus.GENERATED,
        version: 1,
        confidence: 0.85,
        explainabilityScore: 85,
        riskScore: 20,
        score: 75,
        reason: 'Low stock',
        financialImpact: { expectedProfit: 500, expectedSavings: 0, expectedRevenue: 1000, expectedCost: 500, expectedInventoryReduction: 0, blockedCapitalReleased: 0 },
        generatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const graph = builder.buildGraph(recs);
    assert.ok(graph.edges.length > 0);
    assert.strictEqual(graph.edges[0].dependencyType, RecommendationDependencyType.BLOCKS);

    const { blockedNodes } = depEngine.evaluateDependencies(graph);
    assert.strictEqual(blockedNodes.has('REC-2'), true);
  });
});
