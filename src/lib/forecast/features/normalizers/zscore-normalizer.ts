/**
 * Z-Score Normalization Strategy (Standardization to mean = 0, std = 1)
 */

import { INormalizationStrategy, ScalingBounds } from './normalization-strategy.interface';
import { NormalizationMethod } from '../feature-types';

export class ZScoreNormalizationStrategy implements INormalizationStrategy {
  public readonly method: NormalizationMethod = 'ZScore';

  public normalize(features: Record<string, number>, boundsMap?: Record<string, ScalingBounds>): Record<string, number> {
    const normalized: Record<string, number> = {};

    for (const [key, val] of Object.entries(features)) {
      if (typeof val !== 'number' || Number.isNaN(val)) {
        normalized[key] = val;
        continue;
      }

      const bounds = boundsMap?.[key];
      const mean = bounds?.mean ?? 0;
      const stdDev = bounds?.stdDev ?? 1;

      if (stdDev === 0) {
        normalized[key] = 0;
      } else {
        const scaled = (val - mean) / stdDev;
        normalized[key] = Math.round(scaled * 10000) / 10000;
      }
    }

    return normalized;
  }
}
