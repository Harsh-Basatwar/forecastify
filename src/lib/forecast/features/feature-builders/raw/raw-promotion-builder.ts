/**
 * Raw Promotion Feature Builder
 */

import {
  IFeatureBuilder,
  FeatureBuildContext,
  FeatureBuildResult,
  ModelCompatibility,
} from '../../feature-types';
import { FeatureLineageTracker } from '../../feature-lineage';

export class RawPromotionFeatureBuilder implements IFeatureBuilder {
  public readonly name = 'RawPromotionFeatureBuilder';
  public readonly version = '1.0.0';
  public readonly stage = 'raw' as const;
  public readonly dependencies: string[] = [];
  public readonly compatibility: ModelCompatibility[] = ['All Models'];

  public async build(context: FeatureBuildContext): Promise<FeatureBuildResult> {
    const promo = context.rawInput.promotion || {
      isPromotionRunning: false,
      promotionTypes: [],
      daysRemaining: 0,
      discountPercentage: 0,
      isFestivalPromotion: false,
    };

    const features = {
      raw_is_promotion_running: promo.isPromotionRunning ? 1 : 0,
      raw_promotion_days_remaining: promo.daysRemaining,
      raw_promotion_discount_percentage: promo.discountPercentage,
      raw_is_festival_promotion: promo.isFestivalPromotion ? 1 : 0,
      raw_promotion_type: promo.promotionTypes.join(',') || 'none',
    };

    const lineage = {
      raw_is_promotion_running: FeatureLineageTracker.createLineage('raw_is_promotion_running', 'promotions', 'is_active', this.name, this.version),
    };

    return { features, lineage };
  }
}
