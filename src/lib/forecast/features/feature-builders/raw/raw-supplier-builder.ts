/**
 * Raw Supplier Feature Builder
 */

import {
  IFeatureBuilder,
  FeatureBuildContext,
  FeatureBuildResult,
  ModelCompatibility,
} from '../../feature-types';
import { FeatureLineageTracker } from '../../feature-lineage';

export class RawSupplierFeatureBuilder implements IFeatureBuilder {
  public readonly name = 'RawSupplierFeatureBuilder';
  public readonly version = '1.0.0';
  public readonly stage = 'raw' as const;
  public readonly dependencies: string[] = [];
  public readonly compatibility: ModelCompatibility[] = ['All Models'];

  public async build(context: FeatureBuildContext): Promise<FeatureBuildResult> {
    const supp = context.rawInput.supplier || {
      averagePrice: 0,
      priceVolatility: 0,
      supplierRating: 4.0,
      leadTimeDays: 7,
      isPreferredSupplier: false,
      supplierPerformanceScore: 0.85,
    };

    const features = {
      raw_supplier_average_price: supp.averagePrice,
      raw_supplier_price_volatility: supp.priceVolatility,
      raw_supplier_rating: supp.supplierRating,
      raw_supplier_lead_time_days: supp.leadTimeDays,
      raw_is_preferred_supplier: supp.isPreferredSupplier ? 1 : 0,
      raw_supplier_performance_score: supp.supplierPerformanceScore,
    };

    const lineage = {
      raw_supplier_rating: FeatureLineageTracker.createLineage('raw_supplier_rating', 'suppliers', 'rating', this.name, this.version),
      raw_supplier_performance_score: FeatureLineageTracker.createLineage('raw_supplier_performance_score', 'suppliers', 'performance_score', this.name, this.version),
    };

    return { features, lineage };
  }
}
