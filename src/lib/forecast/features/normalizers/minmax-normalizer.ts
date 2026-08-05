/**
 * Min-Max Normalization Strategy (Scales feature values into [0, 1] range)
 */

import { INormalizationStrategy, ScalingBounds } from './normalization-strategy.interface';
import { NormalizationMethod } from '../feature-types';

export class MinMaxNormalizationStrategy implements INormalizationStrategy {
  public readonly method: NormalizationMethod = 'MinMax';

  public normalize(features: Record<string, number>, boundsMap?: Record<string, ScalingBounds>): Record<string, number> {
    const normalized: Record<string, number> = {};

    for (const [key, val] of Object.entries(features)) {
      if (typeof val !== 'number' || Number.isNaN(val)) {
        normalized[key] = val;
        continue;
      }

      const bounds = boundsMap?.[key];
      const min = bounds?.min ?? 0;
      const max = bounds?.max ?? 100;

      if (max === min) {
        normalized[key] = 0.5;
      } else {
        const scaled = (val - min) / (max - min);
        normalized[key] = Math.max(0, Math.min(1, Math.round(scaled * 10000) / 10000));
      }
    }

    return normalized;
  }
}
