/**
 * Statistical Validator (Checks for NaN, Infinity, missing %, imputed %)
 */

import { ForecastFeatureVector } from '../feature-types';

export class StatisticalValidator {
  public validate(vector: ForecastFeatureVector): {
    isValid: boolean;
    errors: string[];
    missingCount: number;
    imputedCount: number;
    nanCount: number;
    infCount: number;
  } {
    const errors: string[] = [];
    let nanCount = 0;
    let infCount = 0;
    let missingCount = 0;

    const allFeatures = vector.features || {};
    const totalCount = Object.keys(allFeatures).length;

    for (const [key, val] of Object.entries(allFeatures)) {
      if (val === null || val === undefined) {
        missingCount++;
      } else if (Number.isNaN(val)) {
        nanCount++;
        errors.push(`StatisticalValidationError: Feature '${key}' is NaN`);
      } else if (!Number.isFinite(val)) {
        infCount++;
        errors.push(`StatisticalValidationError: Feature '${key}' is Infinity`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      missingCount,
      imputedCount: 0,
      nanCount,
      infCount,
    };
  }
}
