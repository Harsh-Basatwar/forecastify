import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { GET as getRecommendations } from '../../../app/api/forecast/recommendations/route';

describe('Recommendation REST API Tests', () => {
  test('should return 200 OK with recommendation nodes and decision graph', async () => {
    const req = new Request('http://localhost:3000/api/forecast/recommendations?storeId=demo-store-001');
    const response = await getRecommendations(req as any);
    assert.strictEqual(response.status, 200);

    const body = await response.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.recommendations.length > 0);
    assert.ok(body.graph !== undefined);
  });
});
