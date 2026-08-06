/**
 * Contribution Engine
 * Milestone 5 - Forecastify XAI
 */

import { FeatureContribution } from './explanation-types';

export class ContributionEngine {
  public processContributions(contributions: FeatureContribution[]): {
    positiveDrivers: FeatureContribution[];
    negativeDrivers: FeatureContribution[];
    normalizedAttributions: FeatureContribution[];
    featureImportanceRanking: { featureName: string; rank: number; percentage: number }[];
  } {
    const positiveDrivers = contributions.filter((c) => c.direction === 'POSITIVE');
    const negativeDrivers = contributions.filter((c) => c.direction === 'NEGATIVE');

    const totalAbsSum = contributions.reduce((acc, c) => acc + Math.abs(c.contributionValue), 0) || 1;

    const normalizedAttributions = contributions.map((c) => {
      const pct = Math.round((Math.abs(c.contributionValue) / totalAbsSum) * 1000) / 10;
      return {
        ...c,
        normalizedPercentage: pct,
      };
    });

    const featureImportanceRanking = [...normalizedAttributions]
      .sort((a, b) => b.normalizedPercentage - a.normalizedPercentage)
      .map((c, idx) => ({
        featureName: c.featureName,
        rank: idx + 1,
        percentage: c.normalizedPercentage,
      }));

    return {
      positiveDrivers,
      negativeDrivers,
      normalizedAttributions,
      featureImportanceRanking,
    };
  }
}

export const contributionEngine = new ContributionEngine();
