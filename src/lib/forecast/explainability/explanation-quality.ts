/**
 * Explanation Quality Evaluator
 * Milestone 5 - Forecastify XAI
 */

import { ExplanationQualityMetrics, ExplanationQualityRating, Explanation } from './explanation-types';

export class ExplanationQualityEvaluator {
  public evaluateQuality(explanation: Partial<Explanation>): ExplanationQualityMetrics {
    const textLength = (explanation.summary || '').length + (explanation.headline || '').length;
    const readabilityIndex = Math.min(100, Math.max(60, Math.round(100 - textLength / 20)));

    const evidenceCount = explanation.evidenceList?.length ?? 0;
    const evidenceDensity = Math.min(100, Math.round((evidenceCount / 6) * 100));

    const isDeterministic = Boolean(explanation.lineage?.lineageHash);
    const determinismScore = isDeterministic ? 100 : 70;

    const hasAllSections = Boolean(
      explanation.headline &&
        explanation.summary &&
        explanation.confidenceBreakdown &&
        explanation.featureAttributions
    );
    const structuralConsistency = hasAllSections ? 100 : 80;
    const schemaCompliance = 100;

    const qualityScore = Math.round(
      readabilityIndex * 0.2 +
        evidenceDensity * 0.25 +
        determinismScore * 0.25 +
        structuralConsistency * 0.15 +
        schemaCompliance * 0.15
    );

    let rating = ExplanationQualityRating.EXCELLENT;
    if (qualityScore < 60) rating = ExplanationQualityRating.POOR;
    else if (qualityScore < 75) rating = ExplanationQualityRating.FAIR;
    else if (qualityScore < 88) rating = ExplanationQualityRating.GOOD;

    return {
      qualityScore,
      rating,
      metrics: {
        readabilityIndex,
        evidenceDensity,
        determinismScore,
        structuralConsistency,
        schemaCompliance,
      },
    };
  }
}

export const explanationQualityEvaluator = new ExplanationQualityEvaluator();
