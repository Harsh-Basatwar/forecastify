/**
 * Confidence Engine
 * Milestone 5 - Forecastify XAI
 */

import { ConfidenceBreakdown, ConfidenceLevel, EvidenceConfidenceMap } from './explanation-types';

export interface ConfidenceInputPayload {
  predictionConfidence?: number;
  modelQuality?: number;
  featureCompleteness?: number;
  dataFreshness?: number;
  supplierReliability?: number;
  inventoryAccuracy?: number;
  weatherReliability?: number;
  evidenceConfidenceMap?: EvidenceConfidenceMap;
}

export class ConfidenceEngine {
  public calculateConfidenceBreakdown(payload: ConfidenceInputPayload = {}): ConfidenceBreakdown {
    const components = {
      predictionConfidence: payload.predictionConfidence ?? 92,
      modelQuality: payload.modelQuality ?? 94,
      featureCompleteness: payload.featureCompleteness ?? 88,
      dataFreshness: payload.dataFreshness ?? 95,
      supplierReliability: payload.supplierReliability ?? 86,
      inventoryAccuracy: payload.inventoryAccuracy ?? 98,
      weatherReliability: payload.weatherReliability ?? 80,
    };

    // Weighted average computation
    const overallConfidence = Math.round(
      components.predictionConfidence * 0.25 +
        components.modelQuality * 0.2 +
        components.featureCompleteness * 0.15 +
        components.dataFreshness * 0.1 +
        components.supplierReliability * 0.1 +
        components.inventoryAccuracy * 0.1 +
        components.weatherReliability * 0.1
    );

    let level = ConfidenceLevel.HIGH;
    if (overallConfidence < 60) {
      level = ConfidenceLevel.CRITICAL;
    } else if (overallConfidence < 75) {
      level = ConfidenceLevel.LOW;
    } else if (overallConfidence < 85) {
      level = ConfidenceLevel.MEDIUM;
    }

    const evidenceConfidenceMap: EvidenceConfidenceMap = payload.evidenceConfidenceMap || {
      inventorySnapshotConfidence: components.inventoryAccuracy,
      supplierReliabilityConfidence: components.supplierReliability,
      weatherConfidence: components.weatherReliability,
      promotionConfidence: 95,
      pricingConfidence: 98,
      overallEvidenceConfidence: overallConfidence,
    };

    const rationale = `Decision confidence evaluated at ${overallConfidence}% (${level}). Key strength: Inventory Accuracy (${components.inventoryAccuracy}%). Primary risk factor: Weather Reliability (${components.weatherReliability}%).`;

    return {
      overallConfidence,
      level,
      components,
      evidenceConfidenceMap,
      rationale,
    };
  }
}

export const confidenceEngine = new ConfidenceEngine();
