import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { LocalArtifactStore } from '../../lib/forecast/models/artifacts/local-artifact-store';
import { SupabaseArtifactStore } from '../../lib/forecast/models/artifacts/supabase-artifact-store';
import { ModelArtifact } from '../../lib/forecast/models/interfaces';

describe('Artifact Store & Manifest Unit Tests', () => {
  test('should store, retrieve, check existence, and manage manifests', async () => {
    const store = new LocalArtifactStore();
    const artifact: ModelArtifact = {
      modelId: 'art-001',
      version: '1.0.0',
      serializedData: JSON.stringify({ weights: [1, 2, 3] }),
      checksum: 'fake-checksum-12345678',
      frameworkVersion: '1.0.0',
      format: 'json',
      createdTimestamp: new Date().toISOString(),
    };

    const uri = await store.saveArtifact(artifact);
    assert.ok(uri.startsWith('local://'));

    const exists = await store.hasArtifact(uri);
    assert.equal(exists, true);

    const loaded = await store.loadArtifact(uri);
    assert.equal(loaded.modelId, 'art-001');

    const deleted = await store.deleteArtifact(uri);
    assert.equal(deleted, true);
    assert.equal(await store.hasArtifact(uri), false);
  });
});
