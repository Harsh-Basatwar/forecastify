/**
 * Feature Validator (Unified Orchestrator for Schema, Statistical, and Business Validation)
 */

import { ForecastFeatureVector, FeatureValidationResult, FeatureQualityMetrics } from './feature-types';
import { SchemaValidator } from './validators/schema-validator';
import { StatisticalValidator } from './validators/statistical-validator';
import { BusinessValidator } from './validators/business-validator';

export class FeatureValidator {
  private schemaValidator = new SchemaValidator();
  private statisticalValidator = new StatisticalValidator();
  private businessValidator = new BusinessValidator();

  public validate(vector: ForecastFeatureVector): FeatureValidationResult {
    const schemaRes = this.schemaValidator.validate(vector);
    const statRes = this.statisticalValidator.validate(vector);
    const busRes = this.businessValidator.validate(vector);

    const allErrors = [...schemaRes.errors, ...statRes.errors, ...busRes.errors];
    const warnings = [...busRes.warnings];

    const totalFeatures = Object.keys(vector.features || {}).length || 1;
    const missingPct = Math.min(100, Math.round((statRes.missingCount / totalFeatures) * 100));
    const completenessScore = Math.max(0, 1 - statRes.missingCount / totalFeatures);

    // Calculate overall Quality Score (1.0 = perfect)
    let qualityScore = 1.0;
    if (allErrors.length > 0) {
      qualityScore -= 0.3 * Math.min(allErrors.length, 3);
    }
    if (missingPct > 0) {
      qualityScore -= (missingPct / 100) * 0.4;
    }
    qualityScore = Math.max(0.0, Math.min(1.0, Math.round(qualityScore * 100) / 100));

    const freshnessMs = Date.now() - new Date(vector.timestamp || Date.now()).getTime();

    const qualityMetrics: FeatureQualityMetrics = {
      qualityScore,
      missingPercentage: missingPct,
      imputedPercentage: 0,
      freshnessMs: Math.max(0, freshnessMs),
      completenessScore: Math.round(completenessScore * 100) / 100,
      validationErrorCount: allErrors.length,
      validationErrors: allErrors,
    };

    return {
      isValid: allErrors.length === 0,
      qualityMetrics,
      errors: allErrors,
      warnings,
    };
  }
}
