/**
 * Raw Sales Feature Builder
 */

import {
  IFeatureBuilder,
  FeatureBuildContext,
  FeatureBuildResult,
  ModelCompatibility,
} from '../../feature-types';
import { FeatureLineageTracker } from '../../feature-lineage';

export class RawSalesFeatureBuilder implements IFeatureBuilder {
  public readonly name = 'RawSalesFeatureBuilder';
  public readonly version = '1.0.0';
  public readonly stage = 'raw' as const;
  public readonly dependencies: string[] = [];
  public readonly compatibility: ModelCompatibility[] = ['All Models'];

  public async build(context: FeatureBuildContext): Promise<FeatureBuildResult> {
    const salesHistory = context.rawInput.salesHistory || [];
    const latestSales = salesHistory.length > 0 ? salesHistory[salesHistory.length - 1] : { quantity: 0, amount: 0 };

    const features = {
      raw_daily_sales_quantity: latestSales.quantity,
      raw_daily_sales_amount: latestSales.amount,
      raw_sales_history_length: salesHistory.length,
    };

    const lineage = {
      raw_daily_sales_quantity: FeatureLineageTracker.createLineage(
        'raw_daily_sales_quantity',
        'sales_transactions',
        'quantity',
        this.name,
        this.version
      ),
      raw_daily_sales_amount: FeatureLineageTracker.createLineage(
        'raw_daily_sales_amount',
        'sales_transactions',
        'total_amount',
        this.name,
        this.version
      ),
    };

    return {
      features,
      lineage,
      imputedCount: salesHistory.length === 0 ? 2 : 0,
      missingCount: 0,
    };
  }
}
