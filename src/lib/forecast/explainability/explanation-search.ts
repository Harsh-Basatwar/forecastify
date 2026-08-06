/**
 * Explanation Search Service
 * Milestone 5 - Forecastify XAI
 */

import { Explanation } from './explanation-types';

export interface ExplanationSearchQuery {
  storeId?: string;
  predictionId?: string;
  recommendationId?: string;
  featureId?: string;
  supplierName?: string;
  minConfidence?: number;
  minExplainabilityScore?: number;
  startDate?: string;
  endDate?: string;
  queryText?: string;
}

export class ExplanationSearchService {
  public searchExplanations(
    explanations: Explanation[],
    query: ExplanationSearchQuery
  ): Explanation[] {
    return explanations.filter((exp) => {
      if (query.storeId && exp.metadata.storeId !== query.storeId) return false;
      if (query.predictionId && exp.predictionId !== query.predictionId) return false;
      if (query.recommendationId && exp.recommendationId !== query.recommendationId) return false;

      if (query.minConfidence && exp.confidenceBreakdown.overallConfidence < query.minConfidence) return false;
      if (query.minExplainabilityScore && exp.explainabilityScore.totalScore < query.minExplainabilityScore) return false;

      if (query.featureId) {
        const hasFeat = exp.featureAttributions.some((f) => f.featureId === query.featureId);
        if (!hasFeat) return false;
      }

      if (query.supplierName) {
        const hasSup = exp.evidenceList.some((e) =>
          JSON.stringify(e.metadata || {}).toLowerCase().includes(query.supplierName!.toLowerCase())
        );
        if (!hasSup) return false;
      }

      if (query.startDate) {
        if (new Date(exp.metadata.generatedAt).getTime() < new Date(query.startDate).getTime()) return false;
      }

      if (query.endDate) {
        if (new Date(exp.metadata.generatedAt).getTime() > new Date(query.endDate).getTime()) return false;
      }

      if (query.queryText) {
        const text = `${exp.headline} ${exp.summary} ${exp.detailedRationale}`.toLowerCase();
        if (!text.includes(query.queryText.toLowerCase())) return false;
      }

      return true;
    });
  }
}

export const explanationSearchService = new ExplanationSearchService();
