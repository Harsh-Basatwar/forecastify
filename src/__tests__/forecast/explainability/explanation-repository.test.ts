import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { explanationRepository } from '../../../lib/forecast/explainability/explanation-repository';

describe('Explanation Repository Unit Tests', () => {
  test('should persist and retrieve explanations in store', async () => {
    const dummyExp: any = {
      explanationId: 'exp_repo_1',
      predictionId: 'pred_1',
      lineage: { modelVersionId: 'v1', featureSchemaId: 's1', lineageHash: 'abc' },
      explainabilityScore: { totalScore: 90 },
      qualityMetrics: { qualityScore: 95 },
      confidenceBreakdown: { evidenceConfidenceMap: {} },
      featureAttributions: [],
      evidenceList: [],
      metadata: { generatedAt: new Date().toISOString(), version: 1 },
    };

    await explanationRepository.saveExplanation(dummyExp);
    const retrieved = await explanationRepository.getExplanation('exp_repo_1');

    assert.equal(retrieved?.explanationId, 'exp_repo_1');
  });
});
