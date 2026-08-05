/**
 * Feature Graph (Graph-based Builder Dependency Management & Topological Resolution)
 */

import { IFeatureBuilder } from './feature-types';

export interface GraphNode {
  name: string;
  builder: IFeatureBuilder;
  dependencies: string[];
}

export class FeatureDependencyGraph {
  private nodes: Map<string, GraphNode> = new Map();

  public addNode(builder: IFeatureBuilder): void {
    this.nodes.set(builder.name, {
      name: builder.name,
      builder,
      dependencies: builder.dependencies || [],
    });
  }

  public removeNode(name: string): boolean {
    return this.nodes.delete(name);
  }

  public getNode(name: string): GraphNode | undefined {
    return this.nodes.get(name);
  }

  public getAllNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }

  public resolveDependencies(): IFeatureBuilder[] {
    const sorted: IFeatureBuilder[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (nodeName: string) => {
      if (visiting.has(nodeName)) {
        throw new Error(`Cycle detected in Feature Graph for builder '${nodeName}'`);
      }
      if (!visited.has(nodeName)) {
        visiting.add(nodeName);
        const node = this.nodes.get(nodeName);
        if (node) {
          for (const dep of node.dependencies) {
            if (this.nodes.has(dep)) {
              visit(dep);
            }
          }
          visiting.delete(nodeName);
          visited.add(nodeName);
          sorted.push(node.builder);
        }
      }
    };

    for (const nodeName of this.nodes.keys()) {
      if (!visited.has(nodeName)) {
        visit(nodeName);
      }
    }

    return sorted;
  }

  public clear(): void {
    this.nodes.clear();
  }
}
