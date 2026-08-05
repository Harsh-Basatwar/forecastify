/**
 * Feature Lineage tracker utility
 */

import { FeatureLineageInfo } from './feature-types';

export class FeatureLineageTracker {
  public static createLineage(
    featureName: string,
    sourceTable: string,
    sourceField: string,
    builderName: string,
    builderVersion: string,
    transformation?: string
  ): FeatureLineageInfo {
    return {
      featureName,
      sourceTable,
      sourceField,
      builderName,
      builderVersion,
      transformation: transformation || 'identity',
    };
  }
}
