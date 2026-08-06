import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { RecommendationEventStore } from '../../../lib/forecast/recommendations';

describe('RecommendationEventStore Sourcing Tests', () => {
  test('should record immutable event stream logs', () => {
    const eventStore = new RecommendationEventStore();

    eventStore.appendEvent('store-1', 'REC-1', 'RecommendationCreated', { priority: 'HIGH' });
    eventStore.appendEvent('store-1', 'REC-1', 'RecommendationExecuted', { ref: 'PO-101' });

    const events = eventStore.getEventsForRecommendation('REC-1');
    assert.strictEqual(events.length, 2);
    assert.strictEqual(events[0].eventType, 'RecommendationCreated');
    assert.strictEqual(events[1].eventType, 'RecommendationExecuted');
  });
});
