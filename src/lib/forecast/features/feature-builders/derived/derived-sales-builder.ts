/**
 * Derived Sales Feature Builder (Time-series Lags, Rolling Aggregates, Growth & Trend)
 */

import {
  IFeatureBuilder,
  FeatureBuildContext,
  FeatureBuildResult,
  ModelCompatibility,
} from '../../feature-types';
import { FeatureLineageTracker } from '../../feature-lineage';

export class DerivedSalesFeatureBuilder implements IFeatureBuilder {
  public readonly name = 'DerivedSalesFeatureBuilder';
  public readonly version = '1.0.0';
  public readonly stage = 'derived' as const;
  public readonly dependencies: string[] = ['RawSalesFeatureBuilder'];
  public readonly compatibility: ModelCompatibility[] = ['All Models'];

  public async build(context: FeatureBuildContext): Promise<FeatureBuildResult> {
    const salesHistory = context.rawInput.salesHistory || [];
    const quantities = salesHistory.map((s) => s.quantity);

    // Default if empty
    if (quantities.length === 0) {
      quantities.push(0);
    }

    const n = quantities.length;
    const getLag = (lagDays: number): number => {
      const idx = n - 1 - lagDays;
      return idx >= 0 ? quantities[idx] : quantities[0] || 0;
    };

    const getSlice = (windowDays: number): number[] => {
      return quantities.slice(Math.max(0, n - windowDays));
    };

    const slice7 = getSlice(7);
    const slice30 = getSlice(30);

    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    const mean = (arr: number[]) => arr.length > 0 ? sum(arr) / arr.length : 0;
    
    const median = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };

    const stdDev = (arr: number[]) => {
      if (arr.length <= 1) return 0;
      const m = mean(arr);
      const variance = arr.reduce((acc, val) => acc + Math.pow(val - m, 2), 0) / (arr.length - 1);
      return Math.sqrt(variance);
    };

    const rollingMean7d = mean(slice7);
    const rollingMedian7d = median(slice7);
    const rollingStd7d = stdDev(slice7);
    const rollingMax7d = Math.max(...slice7);
    const rollingMin7d = Math.min(...slice7);

    const rollingMean30d = mean(slice30);
    const movingAverage14d = mean(getSlice(14));

    // Growth rate: (last 7 days mean vs previous 7 days mean)
    const prev7Slice = quantities.slice(Math.max(0, n - 14), Math.max(0, n - 7));
    const prev7Mean = mean(prev7Slice);
    const growthRate = prev7Mean > 0 ? (rollingMean7d - prev7Mean) / prev7Mean : 0;

    // Sales Velocity: average daily sales over last 7 days
    const salesVelocity = rollingMean7d;

    // Demand Trend: linear slope over last 7 days (or simple ratio)
    const demandTrend = rollingMean30d > 0 ? rollingMean7d / rollingMean30d : 1.0;

    const features = {
      derived_lag_1: getLag(1),
      derived_lag_3: getLag(3),
      derived_lag_7: getLag(7),
      derived_lag_14: getLag(14),
      derived_lag_30: getLag(30),
      derived_rolling_mean_7d: Math.round(rollingMean7d * 100) / 100,
      derived_rolling_median_7d: Math.round(rollingMedian7d * 100) / 100,
      derived_rolling_std_7d: Math.round(rollingStd7d * 100) / 100,
      derived_rolling_max_7d: rollingMax7d,
      derived_rolling_min_7d: rollingMin7d,
      derived_moving_average_14d: Math.round(movingAverage14d * 100) / 100,
      derived_sales_growth_rate: Math.round(growthRate * 1000) / 1000,
      derived_sales_velocity: Math.round(salesVelocity * 100) / 100,
      derived_demand_trend: Math.round(demandTrend * 1000) / 1000,
    };

    const lineage = {
      derived_lag_7: FeatureLineageTracker.createLineage('derived_lag_7', 'sales_history', 'quantity', this.name, this.version, 'lag(7)'),
      derived_rolling_mean_7d: FeatureLineageTracker.createLineage('derived_rolling_mean_7d', 'sales_history', 'quantity', this.name, this.version, 'rolling_mean(7)'),
      derived_sales_growth_rate: FeatureLineageTracker.createLineage('derived_sales_growth_rate', 'sales_history', 'quantity', this.name, this.version, 'pct_change(7d vs prev 7d)'),
    };

    return { features, lineage };
  }
}
