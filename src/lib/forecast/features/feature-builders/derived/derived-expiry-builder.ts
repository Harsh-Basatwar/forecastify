/**
 * Derived Expiry Feature Builder (FEFO Priority, Expiry Risk Score)
 */

import {
  IFeatureBuilder,
  FeatureBuildContext,
  FeatureBuildResult,
  ModelCompatibility,
} from '../../feature-types';
import { FeatureLineageTracker } from '../../feature-lineage';

export class DerivedExpiryFeatureBuilder implements IFeatureBuilder {
  public readonly name = 'DerivedExpiryFeatureBuilder';
  public readonly version = '1.0.0';
  public readonly stage = 'derived' as const;
  public readonly dependencies: string[] = ['RawExpiryFeatureBuilder', 'RawInventoryFeatureBuilder'];
  public readonly compatibility: ModelCompatibility[] = ['All Models'];

  public async build(context: FeatureBuildContext): Promise<FeatureBuildResult> {
    const nearestExpiryDays = Number(context.existingRawFeatures?.raw_nearest_expiry_days ?? 90);
    const shelfLifeDays = Number(context.existingRawFeatures?.raw_average_shelf_life_days ?? 180);

    const safeShelfLife = shelfLifeDays > 0 ? shelfLifeDays : 180;

    // Remaining shelf life ratio (0 to 1)
    const shelfLifeRatio = Math.max(0, Math.min(1, nearestExpiryDays / safeShelfLife));

    // Expiry Risk Level Score: 1.0 (highest risk / imminent expiry) to 0.0 (low risk)
    const expiryRiskScore = Math.round((1 - shelfLifeRatio) * 100) / 100;

    // FEFO (First Expired, First Out) Priority Rank Score (0 to 100, higher means urgent dispatch)
    const fefoPriorityScore = Math.round((1 - shelfLifeRatio) * 100);

    const features = {
      derived_shelf_life_ratio: Math.round(shelfLifeRatio * 1000) / 1000,
      derived_expiry_risk_score: expiryRiskScore,
      derived_fefo_priority_score: fefoPriorityScore,
    };

    const lineage = {
      derived_expiry_risk_score: FeatureLineageTracker.createLineage('derived_expiry_risk_score', 'inventory_batches', 'expiry_date', this.name, this.version, '1 - (expiry_days / shelf_life)'),
      derived_fefo_priority_score: FeatureLineageTracker.createLineage('derived_fefo_priority_score', 'inventory_batches', 'expiry_date', this.name, this.version, 'FEFO priority rank'),
    };

    return { features, lineage };
  }
}
