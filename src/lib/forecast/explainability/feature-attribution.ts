/**
 * Feature Attribution Engine
 * Milestone 5 - Forecastify XAI
 */

import { FeatureContribution, AttributionStrategyType } from './explanation-types';
import {
  FeatureInputVector,
  AttributionStrategyFactory,
} from './feature-attribution-strategy';

export class FeatureAttributionEngine {
  public calculateAttribution(
    features: FeatureInputVector,
    predictionValue: number,
    baseValue: number = 100,
    strategyType: AttributionStrategyType = AttributionStrategyType.COEFFICIENT
  ): FeatureContribution[] {
    const strategy = AttributionStrategyFactory.getStrategy(strategyType);
    return strategy.calculateAttribution(features, predictionValue, baseValue);
  }

  public getPositiveContributors(contributions: FeatureContribution[]): FeatureContribution[] {
    return contributions.filter((c) => c.direction === 'POSITIVE');
  }

  public getNegativeContributors(contributions: FeatureContribution[]): FeatureContribution[] {
    return contributions.filter((c) => c.direction === 'NEGATIVE');
  }

  public getTopDrivers(contributions: FeatureContribution[], limit: number = 3): FeatureContribution[] {
    return [...contributions]
      .sort((a, b) => b.normalizedPercentage - a.normalizedPercentage)
      .slice(0, limit);
  }
}

export const featureAttributionEngine = new FeatureAttributionEngine();
