/**
 * Robust Scaler Normalization Strategy (Outlier-robust scaling using Median & IQR)
 */

import { INormalizationStrategy, ScalingBounds } from './normalization-strategy.interface';
import { NormalizationMethod } from '../feature-types';

export class RobustScalerNormalizationStrategy implements INormalizationStrategy {
  public readonly method: NormalizationMethod = 'RobustScaler';

  public normalize(features: Record<string, number>, boundsMap?: Record<string, ScalingBounds>): Record<string, number> {
    const normalized: Record<string, number> = {};

    for (const [key, val] of Object.entries(features)) {
      if (typeof val !== 'number' || Number.isNaN(val)) {
        normalized[key] = val;
        continue;
      }

      const bounds = boundsMap?.[key];
      const median = bounds?.median ?? 0;
      const iqr = bounds?.iqr ?? 1;

      if (iqr === 0) {
        normalized[key] = 0;
      } else {
        const scaled = (val - median) / iqr;
        normalized[key] = Math.round(scaled * 10000) / 10000;
      }
    }

    return normalized;
  }
}
