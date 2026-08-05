/**
 * Identity Normalization Strategy (Pass-through unscaled raw features)
 */

import { INormalizationStrategy, ScalingBounds } from './normalization-strategy.interface';
import { NormalizationMethod } from '../feature-types';

export class IdentityNormalizationStrategy implements INormalizationStrategy {
  public readonly method: NormalizationMethod = 'Identity';

  public normalize(features: Record<string, number>, _boundsMap?: Record<string, ScalingBounds>): Record<string, number> {
    return { ...features };
  }
}
