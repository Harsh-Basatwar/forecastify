/**
 * Decision Graph Builder
 * Builds directed acyclic decision graphs (DAGs) representing dependencies and relationships
 * between recommendations.
 */

import { DependencyEdge, Recommendation, RecommendationDependencyType, RecommendationGraph } from './recommendation-types';

export class DecisionGraphBuilder {
  public buildGraph(recommendations: Recommendation[]): RecommendationGraph {
    const edges: DependencyEdge[] = [];

    // Map by product ID to build inter-recommendation dependency relationships
    const productMap = new Map<string, Recommendation[]>();
    for (const rec of recommendations) {
      if (rec.productId) {
        const list = productMap.get(rec.productId) || [];
        list.push(rec);
        productMap.set(rec.productId, list);
      }
    }

    for (const [, recs] of productMap.entries()) {
      if (recs.length <= 1) continue;

      const orderMore = recs.find(r => r.type === 'ORDER_MORE' || r.type === 'EMERGENCY_PURCHASE');
      const switchSupplier = recs.find(r => r.type === 'SWITCH_SUPPLIER');
      const markdown = recs.find(r => r.type === 'MARKDOWN' || r.type === 'MARKDOWN_PRODUCT');

      // Relationship 1: ORDER_MORE REQUIRES SwitchSupplier if supplier risk present
      if (orderMore && switchSupplier) {
        edges.push({
          storeId: orderMore.storeId,
          sourceRecommendationId: switchSupplier.id,
          targetRecommendationId: orderMore.id,
          dependencyType: RecommendationDependencyType.REQUIRES,
        });
      }

      // Relationship 2: MARKDOWN BLOCKS ORDER_MORE
      if (markdown && orderMore) {
        edges.push({
          storeId: markdown.storeId,
          sourceRecommendationId: markdown.id,
          targetRecommendationId: orderMore.id,
          dependencyType: RecommendationDependencyType.BLOCKS,
        });
      }
    }

    return {
      nodes: recommendations,
      edges,
    };
  }
}
