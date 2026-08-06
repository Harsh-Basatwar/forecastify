/**
 * Explanation Validator
 * Milestone 5 - Forecastify XAI
 */

import { Explanation } from './explanation-types';
import { explanationLineageTracker } from './explanation-lineage';
import { explanationPolicyEngine } from './explanation-policy';

export class ExplanationValidator {
  public validate(explanation: Explanation): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!explanation.explanationId) {
      errors.push('Explanation ID is required.');
    }

    if (!explanation.headline || explanation.headline.trim().length === 0) {
      errors.push('Headline cannot be empty.');
    }

    if (!explanation.evidenceList || explanation.evidenceList.length === 0) {
      errors.push('Evidence list cannot be empty.');
    }

    if (!explanation.featureAttributions || explanation.featureAttributions.length === 0) {
      errors.push('Feature attributions list cannot be empty.');
    }

    if (!explanation.lineage || !explanation.lineage.lineageHash) {
      errors.push('Lineage tracking hash is missing.');
    } else {
      const validHash = explanationLineageTracker.verifyLineage(explanation.lineage);
      if (!validHash) {
        errors.push('Lineage hash verification failed (corrupted or tampered lineage vector).');
      }
    }

    const policyRes = explanationPolicyEngine.validatePolicy(explanation);
    if (!policyRes.passed) {
      errors.push(...policyRes.violations);
    }
    warnings.push(...policyRes.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

export const explanationValidator = new ExplanationValidator();
