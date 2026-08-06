import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { RecommendationEngine, RecommendationExecutor } from '../../../lib/forecast/recommendations';

describe('Recommendation System Full Integration Test', () => {
  test('should run end-to-end generation, DAG building, conflict resolution, and execution', async () => {
    const engine = new RecommendationEngine();

    const graph = await engine.generateStoreRecommendations('integration-store-001');

    assert.ok(graph.nodes.length > 0);
    const firstNode = graph.nodes[0];

    const executor = new RecommendationExecutor(engine.getRepository(), engine.getEventStore());
    const result = await executor.executeRecommendation(firstNode);

    assert.strictEqual(result.status, 'SUCCESS');

    const events = engine.getEventStore().getEventsForRecommendation(firstNode.id);
    assert.ok(events.length > 0);
    assert.strictEqual(events.some(e => e.eventType === 'RecommendationExecuted'), true);
  });
});
