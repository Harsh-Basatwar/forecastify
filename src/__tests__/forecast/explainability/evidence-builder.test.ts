import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { evidenceBuilder } from '../../../lib/forecast/explainability/evidence-builder';
import { EvidenceType } from '../../../lib/forecast/explainability/explanation-types';

describe('Evidence Builder Unit Tests', () => {
  test('should collect complete structured evidence list with per-item confidence', () => {
    const res = evidenceBuilder.buildEvidenceList({
      predictionId: 'pred_ev_1',
      recommendationId: 'rec_ev_1',
      inventoryLevel: 50,
      supplierLeadTimeDays: 3,
    });

    assert.equal(res.evidenceList.length >= 6, true);
    assert.equal(res.evidenceConfidenceMap.inventorySnapshotConfidence, 98);
    assert.equal(res.evidenceConfidenceMap.supplierReliabilityConfidence, 88);

    const types = res.evidenceList.map((e) => e.type);
    assert.equal(types.includes(EvidenceType.PREDICTION), true);
    assert.equal(types.includes(EvidenceType.INVENTORY_SNAPSHOT), true);
    assert.equal(types.includes(EvidenceType.SUPPLIER_SNAPSHOT), true);
  });
});
