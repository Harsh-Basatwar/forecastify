/**
 * Explanation Diff Engine
 * Milestone 5 - Forecastify XAI
 */

import { ExplanationDiff, Explanation } from './explanation-types';

export class ExplanationDiffEngine {
  public computeDiff(v1: Partial<Explanation>, v2: Partial<Explanation>): ExplanationDiff {
    const versionFrom = v1.metadata?.version ?? 1;
    const versionTo = v2.metadata?.version ?? 2;

    const conf1 = v1.confidenceBreakdown?.overallConfidence ?? 90;
    const conf2 = v2.confidenceBreakdown?.overallConfidence ?? 92;
    const confidenceDelta = conf2 - conf1;

    const score1 = v1.explainabilityScore?.totalScore ?? 85;
    const score2 = v2.explainabilityScore?.totalScore ?? 92;
    const scoreDelta = score2 - score1;

    const attrMap1 = new Map((v1.featureAttributions || []).map((f) => [f.featureId, f.normalizedPercentage]));
    const attrMap2 = new Map((v2.featureAttributions || []).map((f) => [f.featureId, f.normalizedPercentage]));

    const allFeatureIds = new Set([...attrMap1.keys(), ...attrMap2.keys()]);
    const attributionChanges: ExplanationDiff['attributionChanges'] = [];

    allFeatureIds.forEach((featId) => {
      const pct1 = attrMap1.get(featId) ?? 0;
      const pct2 = attrMap2.get(featId) ?? 0;
      const changeDelta = Math.round((pct2 - pct1) * 10) / 10;
      if (Math.abs(changeDelta) > 0.1) {
        const featName =
          (v2.featureAttributions || []).find((f) => f.featureId === featId)?.featureName ||
          (v1.featureAttributions || []).find((f) => f.featureId === featId)?.featureName ||
          featId;
        attributionChanges.push({
          featureId: featId,
          featureName: featName,
          percentageBefore: pct1,
          percentageAfter: pct2,
          changeDelta,
        });
      }
    });

    const asmStmt1 = new Set((v1.assumptions || []).map((a) => a.statement));
    const asmStmt2 = new Set((v2.assumptions || []).map((a) => a.statement));

    const assumptionsAdded = [...asmStmt2].filter((s) => !asmStmt1.has(s));
    const assumptionsRemoved = [...asmStmt1].filter((s) => !asmStmt2.has(s));

    const summary = `Version ${versionFrom} → Version ${versionTo}: Overall confidence shifted by ${confidenceDelta >= 0 ? '+' : ''}${confidenceDelta}%. Explainability Score shifted by ${scoreDelta >= 0 ? '+' : ''}${scoreDelta}. ${attributionChanges.length} feature attributions adjusted.`;

    return {
      explanationId: v2.explanationId || v1.explanationId || 'exp_default',
      versionFrom,
      versionTo,
      confidenceDelta,
      scoreDelta,
      attributionChanges,
      assumptionsAdded,
      assumptionsRemoved,
      summary,
      timestamp: new Date().toISOString(),
    };
  }
}

export const explanationDiffEngine = new ExplanationDiffEngine();
