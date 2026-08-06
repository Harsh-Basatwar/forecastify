/**
 * Explanation Score Calculator
 * Milestone 5 - Forecastify XAI
 */

import { ExplainabilityScoreDetails, Evidence, FeatureContribution, Assumption, AlternativeDecision, ConfidenceBreakdown } from './explanation-types';

export class ExplanationScoreCalculator {
  public calculateScore(params: {
    evidenceList: Evidence[];
    featureAttributions: FeatureContribution[];
    confidenceBreakdown: ConfidenceBreakdown;
    assumptions: Assumption[];
    alternatives: AlternativeDecision[];
  }): ExplainabilityScoreDetails {
    // 1. Evidence Completeness (Max 25)
    const evidenceCount = params.evidenceList?.length ?? 0;
    const evidenceCompleteness = Math.min(25, evidenceCount >= 5 ? 25 : evidenceCount * 5);

    // 2. Feature Attribution Quality (Max 25)
    const attrCount = params.featureAttributions?.length ?? 0;
    const hasDirections = params.featureAttributions?.every((fa) => fa.direction) ?? false;
    const featureAttributionQuality = Math.min(25, (attrCount >= 5 ? 20 : attrCount * 4) + (hasDirections ? 5 : 0));

    // 3. Confidence Clarity (Max 20)
    const hasComponents = Boolean(params.confidenceBreakdown?.components);
    const hasRationale = Boolean(params.confidenceBreakdown?.rationale);
    const confidenceClarity = (hasComponents ? 12 : 0) + (hasRationale ? 8 : 0);

    // 4. Assumptions Specificity (Max 15)
    const asmCount = params.assumptions?.length ?? 0;
    const assumptionsSpecificity = Math.min(15, asmCount >= 3 ? 15 : asmCount * 5);

    // 5. Alternatives Evaluation (Max 15)
    const altCount = params.alternatives?.length ?? 0;
    const alternativesEvaluation = Math.min(15, altCount >= 2 ? 15 : altCount * 7.5);

    const totalScore = Math.round(
      evidenceCompleteness +
        featureAttributionQuality +
        confidenceClarity +
        assumptionsSpecificity +
        alternativesEvaluation
    );

    let grade: ExplainabilityScoreDetails['grade'] = 'A+';
    if (totalScore < 60) grade = 'F';
    else if (totalScore < 70) grade = 'D';
    else if (totalScore < 80) grade = 'C';
    else if (totalScore < 88) grade = 'B';
    else if (totalScore < 95) grade = 'A';

    return {
      totalScore,
      grade,
      breakdown: {
        evidenceCompleteness,
        featureAttributionQuality,
        confidenceClarity,
        assumptionsSpecificity,
        alternativesEvaluation,
      },
    };
  }
}

export const explanationScoreCalculator = new ExplanationScoreCalculator();
