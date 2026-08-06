/**
 * Explanation Graph Builder (DAG)
 * Milestone 5 - Forecastify XAI
 */

import {
  ExplanationGraph,
  ExplanationGraphNode,
  ExplanationGraphEdge,
  FeatureContribution,
} from './explanation-types';

export interface BuildGraphParams {
  explanationId: string;
  predictionId?: string;
  predictionValue?: number;
  recommendationId?: string;
  recommendationTitle?: string;
  featureAttributions?: FeatureContribution[];
}

export class ExplanationGraphBuilder {
  public buildExplanationGraph(params: BuildGraphParams): ExplanationGraph {
    const nodes: ExplanationGraphNode[] = [];
    const edges: ExplanationGraphEdge[] = [];

    const rootId = `node_pred_${params.predictionId || '101'}`;

    // Root Prediction Node
    nodes.push({
      id: rootId,
      label: `Forecast Prediction: ${params.predictionValue ?? 120} Units`,
      type: 'PREDICTION',
      value: params.predictionValue ?? 120,
      confidence: 94,
    });

    // Top Feature Drivers
    const attributions = (params.featureAttributions && params.featureAttributions.length > 0)
      ? params.featureAttributions
      : [
          { featureId: 'feat_lag_7d', featureName: 'Recent 7-Day Sales Trend', category: 'lag' as const, contributionValue: 25, normalizedPercentage: 35.4, direction: 'POSITIVE' as const, baselineValue: 100, currentValue: 125, importanceRank: 1 },
          { featureId: 'feat_promo', featureName: 'Active Promotional Campaign', category: 'promotion' as const, contributionValue: 18, normalizedPercentage: 28.2, direction: 'POSITIVE' as const, baselineValue: 0, currentValue: 15, importanceRank: 2 },
        ];
    const topAttributions = attributions.slice(0, 4);

    topAttributions.forEach((attr, index) => {
      const featureNodeId = `node_feat_${index}_${attr.featureId}`;
      nodes.push({
        id: featureNodeId,
        label: `${attr.featureName} (${attr.direction === 'POSITIVE' ? '+' : '-'}${attr.normalizedPercentage}%)`,
        type: 'FEATURE',
        value: attr.contributionValue,
        metadata: {
          category: attr.category,
          baseline: attr.baselineValue,
          current: attr.currentValue,
        },
      });

      edges.push({
        sourceId: rootId,
        targetId: featureNodeId,
        relation: attr.direction === 'POSITIVE' ? 'DRIVES_UP' : 'DRIVES_DOWN',
        weight: attr.normalizedPercentage,
      });
    });

    // Insight Node
    const insightNodeId = `node_insight_${params.explanationId}`;
    nodes.push({
      id: insightNodeId,
      label: 'Inventory Safety Threshold & Lead Time Analysis',
      type: 'INSIGHT',
      confidence: 90,
    });

    edges.push({
      sourceId: rootId,
      targetId: insightNodeId,
      relation: 'TRIGGERS_INSIGHT',
    });

    // Recommendation Node
    if (params.recommendationId || params.recommendationTitle) {
      const recNodeId = `node_rec_${params.recommendationId || '101'}`;
      nodes.push({
        id: recNodeId,
        label: params.recommendationTitle || 'Order Replenishment Stock (50 Units)',
        type: 'RECOMMENDATION',
        confidence: 92,
      });

      edges.push({
        sourceId: insightNodeId,
        targetId: recNodeId,
        relation: 'GENERATES_RECOMMENDATION',
      });

      // Action Node
      const actionNodeId = `node_act_${params.explanationId}`;
      nodes.push({
        id: actionNodeId,
        label: 'Dispatch PO to Apex Logistics',
        type: 'ACTION',
      });

      edges.push({
        sourceId: recNodeId,
        targetId: actionNodeId,
        relation: 'REQUIRES_ACTION',
      });
    }

    return {
      nodes,
      edges,
      rootId,
    };
  }
}

export const explanationGraphBuilder = new ExplanationGraphBuilder();
