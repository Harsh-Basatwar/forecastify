import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { explanationGraphBuilder } from '../../../lib/forecast/explainability/explanation-graph';

describe('Explanation Graph Builder Unit Tests', () => {
  test('should build Directed Acyclic Graph (DAG) for explanation visual rendering', () => {
    const graph = explanationGraphBuilder.buildExplanationGraph({
      explanationId: 'exp_g_1',
      predictionId: 'pred_g_1',
      predictionValue: 150,
    });

    assert.equal(graph.nodes.length >= 3, true);
    assert.equal(graph.edges.length >= 2, true);
    assert.equal(graph.rootId.includes('pred_g_1'), true);
  });
});
