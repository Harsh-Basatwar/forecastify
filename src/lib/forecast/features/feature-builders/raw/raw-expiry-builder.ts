/**
 * Raw Expiry Feature Builder
 */

import {
  IFeatureBuilder,
  FeatureBuildContext,
  FeatureBuildResult,
  ModelCompatibility,
} from '../../feature-types';
import { FeatureLineageTracker } from '../../feature-lineage';

export class RawExpiryFeatureBuilder implements IFeatureBuilder {
  public readonly name = 'RawExpiryFeatureBuilder';
  public readonly version = '1.0.0';
  public readonly stage = 'raw' as const;
  public readonly dependencies: string[] = [];
  public readonly compatibility: ModelCompatibility[] = ['All Models'];

  public async build(context: FeatureBuildContext): Promise<FeatureBuildResult> {
    const exp = context.rawInput.expiry || {
      nearestExpiryDays: 90,
      averageShelfLifeDays: 180,
      expiredQuantity: 0,
      batchCount: 1,
    };

    const features = {
      raw_nearest_expiry_days: Math.max(0, exp.nearestExpiryDays ?? 90),
      raw_average_shelf_life_days: Math.max(1, exp.averageShelfLifeDays ?? 180),
      raw_expired_quantity: Math.max(0, exp.expiredQuantity ?? 0),
      raw_batch_count: Math.max(0, exp.batchCount ?? 1),
    };

    const lineage = {
      raw_nearest_expiry_days: FeatureLineageTracker.createLineage('raw_nearest_expiry_days', 'inventory_batches', 'expiry_date', this.name, this.version),
      raw_expired_quantity: FeatureLineageTracker.createLineage('raw_expired_quantity', 'inventory_batches', 'expired_qty', this.name, this.version),
    };

    return { features, lineage };
  }
}
