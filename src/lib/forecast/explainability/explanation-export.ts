/**
 * Explanation Export Service
 * Milestone 5 - Forecastify XAI
 */

import { Explanation } from './explanation-types';

export class ExplanationExportService {
  public exportJSON(explanation: Explanation): string {
    return JSON.stringify(explanation, null, 2);
  }

  public exportCSV(explanation: Explanation): string {
    const headers = ['Feature ID', 'Feature Name', 'Category', 'Contribution Value', 'Normalized %', 'Direction', 'Baseline', 'Current'];
    const rows = explanation.featureAttributions.map((f) => [
      f.featureId,
      `"${f.featureName}"`,
      f.category,
      f.contributionValue,
      `${f.normalizedPercentage}%`,
      f.direction,
      f.baselineValue,
      f.currentValue,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  public exportAuditPackage(explanation: Explanation): {
    filename: string;
    contentType: string;
    auditManifest: {
      explanationId: string;
      lineageHash: string;
      score: number;
      generatedAt: string;
      evidenceCount: number;
      policyCompliant: boolean;
    };
    rawJson: string;
    csvAttribution: string;
  } {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return {
      filename: `xai_audit_package_${explanation.explanationId}_${timestamp}`,
      contentType: 'application/json',
      auditManifest: {
        explanationId: explanation.explanationId,
        lineageHash: explanation.lineage.lineageHash,
        score: explanation.explainabilityScore.totalScore,
        generatedAt: explanation.metadata.generatedAt,
        evidenceCount: explanation.evidenceList.length,
        policyCompliant: explanation.explainabilityScore.totalScore >= 60,
      },
      rawJson: this.exportJSON(explanation),
      csvAttribution: this.exportCSV(explanation),
    };
  }
}

export const explanationExportService = new ExplanationExportService();
