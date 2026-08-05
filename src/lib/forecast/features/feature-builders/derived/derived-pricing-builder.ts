/**
 * Derived Pricing Feature Builder (Price Elasticity Placeholder, Historical Price Variations)
 */

import {
  IFeatureBuilder,
  FeatureBuildContext,
  FeatureBuildResult,
  ModelCompatibility,
} from '../../feature-types';
import { FeatureLineageTracker } from '../../feature-lineage';

export class DerivedPricingFeatureBuilder implements IFeatureBuilder {
  public readonly name = 'DerivedPricingFeatureBuilder';
  public readonly version = '1.0.0';
  public readonly stage = 'derived' as const;
  public readonly dependencies: string[] = ['RawPricingFeatureBuilder', 'RawSalesFeatureBuilder'];
  public readonly compatibility: ModelCompatibility[] = ['All Models'];

  public async build(context: FeatureBuildContext): Promise<FeatureBuildResult> {
    const sellingPrice = Number(context.existingRawFeatures?.raw_current_selling_price ?? 100);
    const purchasePrice = Number(context.existingRawFeatures?.raw_purchase_price ?? 70);
    const mrp = Number(context.existingRawFeatures?.raw_mrp ?? 100);

    const marginAmount = sellingPrice - purchasePrice;
    const marginPercentage = sellingPrice > 0 ? (marginAmount / sellingPrice) * 100 : 0;
    const discountPercentage = mrp > 0 ? ((mrp - sellingPrice) / mrp) * 100 : 0;

    // Price Elasticity Placeholder (-1.5 standard default elasticity)
    const priceElasticityPlaceholder = -1.5;

    const features = {
      derived_margin_amount: Math.round(marginAmount * 100) / 100,
      derived_margin_percentage: Math.round(marginPercentage * 100) / 100,
      derived_discount_percentage: Math.round(discountPercentage * 100) / 100,
      derived_price_elasticity_placeholder: priceElasticityPlaceholder,
    };

    const lineage = {
      derived_margin_percentage: FeatureLineageTracker.createLineage('derived_margin_percentage', 'products', 'selling_price, purchase_price', this.name, this.version, '(selling - purchase) / selling'),
      derived_price_elasticity_placeholder: FeatureLineageTracker.createLineage('derived_price_elasticity_placeholder', 'products', 'selling_price', this.name, this.version, 'log(Q)/log(P) placeholder'),
    };

    return { features, lineage };
  }
}
