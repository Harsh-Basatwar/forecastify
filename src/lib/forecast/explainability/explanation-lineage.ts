/**
 * Explanation Lineage Tracker
 * Milestone 5 - Forecastify XAI
 */

import { ExplanationLineage } from './explanation-types';
import { createHash } from 'node:crypto';

export interface LineagePayload {
  explanationId: string;
  predictionId?: string;
  featureVectorId?: string;
  modelVersionId?: string;
  trainingDatasetId?: string;
  featureSchemaId?: string;
  recommendationId?: string;
}

export class ExplanationLineageTracker {
  public createLineage(payload: LineagePayload): ExplanationLineage {
    const timestamp = new Date().toISOString();
    const modelVersionId = payload.modelVersionId || 'model_ens_v2.1.0';
    const trainingDatasetId = payload.trainingDatasetId || 'ds_retail_sales_2026_q2';
    const featureSchemaId = payload.featureSchemaId || 'schema_feat_v1.4.0';

    const featureVectorId = payload.featureVectorId || `fv_${payload.predictionId || '101'}`;

    const hashInput = [
      payload.explanationId,
      payload.predictionId || '',
      featureVectorId,
      modelVersionId,
      trainingDatasetId,
      featureSchemaId,
      payload.recommendationId || '',
    ].join('|');

    const lineageHash = createHash('sha256').update(hashInput).digest('hex');

    return {
      lineageId: `lin_${payload.explanationId}`,
      explanationId: payload.explanationId,
      predictionId: payload.predictionId,
      featureVectorId: payload.featureVectorId || `fv_${payload.predictionId || '101'}`,
      modelVersionId,
      trainingDatasetId,
      featureSchemaId,
      recommendationId: payload.recommendationId,
      lineageHash,
      timestamp,
    };
  }

  public verifyLineage(lineage: ExplanationLineage): boolean {
    const hashInput = [
      lineage.explanationId,
      lineage.predictionId || '',
      lineage.featureVectorId || '',
      lineage.modelVersionId,
      lineage.trainingDatasetId,
      lineage.featureSchemaId,
      lineage.recommendationId || '',
    ].join('|');

    const expectedHash = createHash('sha256').update(hashInput).digest('hex');
    return expectedHash === lineage.lineageHash;
  }
}

export const explanationLineageTracker = new ExplanationLineageTracker();
