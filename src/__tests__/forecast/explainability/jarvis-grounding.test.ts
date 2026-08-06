import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { POST as jarvisHandler } from '../../../app/api/jarvis/route';

describe('Jarvis AI Grounding Unit Tests', () => {
  test('Jarvis API handler should acknowledge explainability query and return action', async () => {
    const req = new Request('http://localhost/api/jarvis', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Explain this prediction and show evidence',
        userId: 'usr_test_jarvis',
      }),
    });

    const res = await jarvisHandler(req);
    const json = await res.json();

    assert.equal(res.status, 200);
    assert.equal(Boolean(json.response), true);
  });
});
