/**
 * Feature Normalizer Facade
 */

import { ForecastFeatureVector, NormalizationMethod } from './feature-types';
import { INormalizationStrategy, ScalingBounds } from './normalizers/normalization-strategy.interface';
import { IdentityNormalizationStrategy } from './normalizers/identity-normalizer';
import { MinMaxNormalizationStrategy } from './normalizers/minmax-normalizer';
import { ZScoreNormalizationStrategy } from './normalizers/zscore-normalizer';
import { RobustScalerNormalizationStrategy } from './normalizers/robust-scaler-normalizer';

export class FeatureNormalizer {
  private strategies: Map<NormalizationMethod, INormalizationStrategy> = new Map();

  constructor() {
    this.registerStrategy(new IdentityNormalizationStrategy());
    this.registerStrategy(new MinMaxNormalizationStrategy());
    this.registerStrategy(new ZScoreNormalizationStrategy());
    this.registerStrategy(new RobustScalerNormalizationStrategy());
  }

  public registerStrategy(strategy: INormalizationStrategy): void {
    this.strategies.set(strategy.method, strategy);
  }

  public normalize(
    vector: ForecastFeatureVector,
    method: NormalizationMethod = 'Identity',
    boundsMap?: Record<string, ScalingBounds>
  ): ForecastFeatureVector {
    const strategy = this.strategies.get(method) || new IdentityNormalizationStrategy();
    const normalizedFeatures = strategy.normalize(vector.features, boundsMap);

    return {
      ...vector,
      features: normalizedFeatures,
      metadata: {
        ...vector.metadata,
        normalizationMethod: strategy.method,
      },
    };
  }
}
