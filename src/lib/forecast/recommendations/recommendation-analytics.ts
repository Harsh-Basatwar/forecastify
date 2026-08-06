/**
 * Recommendation Analytics Engine
 * Computes decision intelligence KPIs, category breakdowns, financial potential summaries,
 * and risk heatmap distributions.
 */

import { Recommendation, RecommendationCategory } from './recommendation-types';
import { ROITracker } from './roi-tracker';
import { RecommendationHistoryEngine } from './recommendation-history';

export interface AnalyticsSummary {
  totalRecommendations: number;
  criticalRecommendations: number;
  totalPotentialSavings: number;
  totalPotentialProfit: number;
  totalBlockedCapitalReleased: number;
  acceptanceRatePct: number;
  executionRatePct: number;
  categoryBreakdown: Record<RecommendationCategory, number>;
  riskHeatmap: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export class RecommendationAnalyticsEngine {
  private roiTracker = new ROITracker();
  private historyEngine = new RecommendationHistoryEngine();

  public generateAnalytics(recommendations: Recommendation[]): AnalyticsSummary {
    const historyMetrics = this.historyEngine.calculateMetrics(recommendations);
    const roiMetrics = this.roiTracker.calculateROI(recommendations);

    const categoryBreakdown: Record<RecommendationCategory, number> = {
      [RecommendationCategory.INVENTORY]: 0,
      [RecommendationCategory.PROCUREMENT]: 0,
      [RecommendationCategory.PRICING]: 0,
      [RecommendationCategory.EXPIRY]: 0,
      [RecommendationCategory.FINANCIAL]: 0,
      [RecommendationCategory.RISK]: 0,
    };

    const riskHeatmap = { critical: 0, high: 0, medium: 0, low: 0 };
    let criticalCount = 0;

    for (const rec of recommendations) {
      if (categoryBreakdown[rec.category] !== undefined) {
        categoryBreakdown[rec.category]++;
      }

      if (rec.priority === 'CRITICAL') criticalCount++;

      if (rec.riskScore >= 75) riskHeatmap.critical++;
      else if (rec.riskScore >= 50) riskHeatmap.high++;
      else if (rec.riskScore >= 25) riskHeatmap.medium++;
      else riskHeatmap.low++;
    }

    return {
      totalRecommendations: recommendations.length,
      criticalRecommendations: criticalCount,
      totalPotentialSavings: roiMetrics.totalSuggestedSavings,
      totalPotentialProfit: roiMetrics.totalSuggestedProfit,
      totalBlockedCapitalReleased: roiMetrics.totalBlockedCapitalReleased,
      acceptanceRatePct: historyMetrics.acceptanceRatePct,
      executionRatePct: historyMetrics.executionRatePct,
      categoryBreakdown,
      riskHeatmap,
    };
  }
}
