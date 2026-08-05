import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { ForecastCacheAdapter } from '../../lib/forecast/forecast-cache-adapter';

describe('ForecastCacheAdapter - Unit Tests', () => {
  test('should set and retrieve values from cache', async () => {
    const cache = new ForecastCacheAdapter();
    await cache.set('test-key', { sample: 'data' }, 60);

    const val = await cache.get<{ sample: string }>('test-key');
    assert.deepEqual(val, { sample: 'data' });
  });

  test('should return null for expired cache items', async () => {
    const cache = new ForecastCacheAdapter();
    await cache.set('expired-key', 'data', -1); // expired 1s ago

    const val = await cache.get('expired-key');
    assert.equal(val, null);
  });

  test('should invalidate store specific cache entries', async () => {
    const cache = new ForecastCacheAdapter();
    const storeId = 'store-uuid-123';

    await cache.set(`store:${storeId}:forecast:7d`, [1, 2, 3], 60);
    await cache.set(`store:other-store:forecast:7d`, [4, 5, 6], 60);

    await cache.invalidateStoreCache(storeId);

    const val1 = await cache.get(`store:${storeId}:forecast:7d`);
    const val2 = await cache.get(`store:other-store:forecast:7d`);

    assert.equal(val1, null);
    assert.deepEqual(val2, [4, 5, 6]);
  });
});
