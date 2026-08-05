/**
 * Normalization Strategy Interface
 */

import { NormalizationMethod } from '../feature-types';

export interface ScalingBounds {
  min?: number;
  max?: number;
  mean?: number;
  stdDev?: number;
  median?: number;
  iqr?: number;
}

export interface INormalizationStrategy {
  readonly method: NormalizationMethod;
  normalize(features: Record<string, number>, boundsMap?: Record<string, ScalingBounds>): Record<string, number>;
}
