/**
 * Raw Pricing Feature Builder
 */

import {
  IFeatureBuilder,
  FeatureBuildContext,
  FeatureBuildResult,
  ModelCompatibility,
} from '../../feature-types';
import { FeatureLineageTracker } from '../../feature-lineage';

export class RawPricingFeatureBuilder implements IFeatureBuilder {
  public readonly name = 'RawPricingFeatureBuilder';
  public readonly version = '1.0.0';
  public readonly stage = 'raw' as const;
  public readonly dependencies: string[] = [];
  public readonly compatibility: ModelCompatibility[] = ['All Models'];

  public async build(context: FeatureBuildContext): Promise<FeatureBuildResult> {
    const pr = context.rawInput.pricing || {
      currentSellingPrice: 100,
      purchasePrice: 70,
      mrp: 100,
      discountAmount: 0,
      historicalPriceChangesCount: 0,
      historicalPriceSeries: [100],
    };

    const features = {
      raw_current_selling_price: Math.max(0, pr.currentSellingPrice),
      raw_purchase_price: Math.max(0, pr.purchasePrice),
      raw_mrp: Math.max(0, pr.mrp),
      raw_discount_amount: Math.max(0, pr.discountAmount),
      raw_historical_price_changes_count: Math.max(0, pr.historicalPriceChangesCount),
    };

    const lineage = {
      raw_current_selling_price: FeatureLineageTracker.createLineage('raw_current_selling_price', 'products', 'selling_price', this.name, this.version),
      raw_purchase_price: FeatureLineageTracker.createLineage('raw_purchase_price', 'products', 'purchase_price', this.name, this.version),
    };

    return { features, lineage };
  }
}
