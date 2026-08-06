/**
 * Explanation Policy Engine
 * Milestone 5 - Forecastify XAI
 */

import { ExplainabilityPolicyConfig, Explanation } from './explanation-types';

export interface PolicyValidationResult {
  passed: boolean;
  violations: string[];
  warnings: string[];
}

export class ExplanationPolicyEngine {
  private defaultConfig: ExplainabilityPolicyConfig = {
    minimumEvidenceCount: 3,
    minimumConfidenceThreshold: 60,
    requireDeterministicValidation: true,
    allowMissingFeatures: false,
    maxAssumptionsAllowed: 10,
  };

  public validatePolicy(explanation: Partial<Explanation>, config?: Partial<ExplainabilityPolicyConfig>): PolicyValidationResult {
    const activeConfig = { ...this.defaultConfig, ...config };
    const violations: string[] = [];
    const warnings: string[] = [];

    // 1. Evidence Threshold Check
    const evidenceCount = explanation.evidenceList?.length ?? 0;
    if (evidenceCount < activeConfig.minimumEvidenceCount) {
      violations.push(`Policy Failure: Evidence count (${evidenceCount}) is below the required minimum threshold of ${activeConfig.minimumEvidenceCount}.`);
    }

    // 2. Confidence Threshold Check
    const confidence = explanation.confidenceBreakdown?.overallConfidence ?? 0;
    if (confidence < activeConfig.minimumConfidenceThreshold) {
      violations.push(`Policy Failure: Overall confidence (${confidence}%) is below minimum required threshold of ${activeConfig.minimumConfidenceThreshold}%.`);
    }

    // 3. Deterministic Lineage Verification
    if (activeConfig.requireDeterministicValidation && !explanation.lineage?.lineageHash) {
      violations.push('Policy Failure: Explanation lacks a deterministic cryptographic SHA256 lineage hash.');
    }

    // 4. Assumptions Cap Check
    const asmCount = explanation.assumptions?.length ?? 0;
    if (asmCount > activeConfig.maxAssumptionsAllowed) {
      warnings.push(`Policy Warning: Assumptions count (${asmCount}) exceeds recommended limit of ${activeConfig.maxAssumptionsAllowed}.`);
    }

    return {
      passed: violations.length === 0,
      violations,
      warnings,
    };
  }
}

export const explanationPolicyEngine = new ExplanationPolicyEngine();
