/**
 * Schema Validator (Validates storeId, productId, timestamp, schema version)
 */

import { ForecastFeatureVector } from '../feature-types';

export class SchemaValidator {
  public validate(vector: Partial<ForecastFeatureVector>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!vector.storeId) {
      errors.push('SchemaValidationError: storeId is required');
    }
    if (!vector.productId) {
      errors.push('SchemaValidationError: productId is required');
    }
    if (!vector.timestamp) {
      errors.push('SchemaValidationError: timestamp is required');
    }
    if (!vector.metadata || !vector.metadata.schemaVersion) {
      errors.push('SchemaValidationError: metadata.schemaVersion is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
