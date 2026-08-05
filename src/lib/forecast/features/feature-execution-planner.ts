/**
 * Feature Execution Planner (Consumes Feature Dependency Graph to produce Execution Stages)
 */

import { IFeatureBuilder } from './feature-types';
import { FeatureDependencyGraph } from './feature-graph';

export interface ExecutionStage {
  stageNumber: number;
  stageName: 'raw' | 'derived';
  builders: IFeatureBuilder[];
  isParallel: boolean;
}

export class FeatureExecutionPlanner {
  public planExecution(builders: IFeatureBuilder[], graph?: FeatureDependencyGraph): ExecutionStage[] {
    let resolvedBuilders = builders;
    if (graph) {
      resolvedBuilders = graph.resolveDependencies();
    } else {
      const tempGraph = new FeatureDependencyGraph();
      builders.forEach((b) => tempGraph.addNode(b));
      resolvedBuilders = tempGraph.resolveDependencies();
    }

    const rawBuilders = resolvedBuilders.filter((b) => b.stage === 'raw');
    const derivedBuilders = resolvedBuilders.filter((b) => b.stage === 'derived');

    const stages: ExecutionStage[] = [];

    // Stage 1: All Independent Raw Feature Builders run in Parallel
    if (rawBuilders.length > 0) {
      stages.push({
        stageNumber: 1,
        stageName: 'raw',
        builders: rawBuilders,
        isParallel: true,
      });
    }

    // Stage 2: Graph-Resolved Derived Builders run in dependency order
    if (derivedBuilders.length > 0) {
      stages.push({
        stageNumber: 2,
        stageName: 'derived',
        builders: derivedBuilders,
        isParallel: false,
      });
    }

    return stages;
  }
}
