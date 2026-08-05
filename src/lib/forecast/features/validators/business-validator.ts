/**
 * Business Validator (Enforces domain business rules: negative stock, impossible price, zero lead time)
 */

import { ForecastFeatureVector } from '../feature-types';

export class BusinessValidator {
  public validate(vector: ForecastFeatureVector): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const feats = vector.features || {};

    // Negative stock check
    if (feats['raw_current_stock'] !== undefined && feats['raw_current_stock'] < 0) {
      errors.push('BusinessValidationError: Stock quantity cannot be negative');
    }
    if (feats['raw_available_stock'] !== undefined && feats['raw_available_stock'] < 0) {
      errors.push('BusinessValidationError: Available stock quantity cannot be negative');
    }

    // Pricing checks
    if (feats['raw_current_selling_price'] !== undefined && feats['raw_current_selling_price'] < 0) {
      errors.push('BusinessValidationError: Selling price cannot be negative');
    }
    if (feats['raw_purchase_price'] !== undefined && feats['raw_purchase_price'] < 0) {
      errors.push('BusinessValidationError: Purchase price cannot be negative');
    }

    // Lead time checks
    if (feats['raw_average_lead_time_days'] !== undefined && feats['raw_average_lead_time_days'] < 0) {
      errors.push('BusinessValidationError: Lead time days cannot be negative');
    }

    // Expiry check
    if (feats['raw_nearest_expiry_days'] !== undefined && feats['raw_nearest_expiry_days'] < 0) {
      warnings.push('BusinessValidationWarning: Item has already expired (negative expiry days)');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
