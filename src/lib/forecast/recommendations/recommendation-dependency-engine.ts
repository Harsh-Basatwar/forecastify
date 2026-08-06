/**
 * Recommendation Dependency Engine
 * Evaluates relationship constraints (requires, blocks, supersedes, duplicates)
 * across recommendations in a Decision Graph.
 */

import { Recommendation, RecommendationDependencyType, RecommendationGraph } from './recommendation-types';

export class RecommendationDependencyEngine {
  public evaluateDependencies(graph: RecommendationGraph): {
    executableNodes: Recommendation[];
    blockedNodes: Map<string, string[]>;
  } {
    const blockedNodes = new Map<string, string[]>();

    for (const edge of graph.edges) {
      const source = graph.nodes.find(n => n.id === edge.sourceRecommendationId);
      const target = graph.nodes.find(n => n.id === edge.targetRecommendationId);
      if (!source || !target) continue;

      if (edge.dependencyType === RecommendationDependencyType.BLOCKS && source.status !== 'EXECUTED') {
        const list = blockedNodes.get(target.id) || [];
        list.push(`Blocked by non-executed recommendation [${source.type}] (${source.id})`);
        blockedNodes.set(target.id, list);
      }

      if (edge.dependencyType === RecommendationDependencyType.REQUIRES && source.status !== 'EXECUTED') {
        const list = blockedNodes.get(target.id) || [];
        list.push(`Requires prerequisite recommendation [${source.type}] (${source.id}) to execute first`);
        blockedNodes.set(target.id, list);
      }
    }

    const executableNodes = graph.nodes.filter(node => !blockedNodes.has(node.id));

    return {
      executableNodes,
      blockedNodes,
    };
  }
}
