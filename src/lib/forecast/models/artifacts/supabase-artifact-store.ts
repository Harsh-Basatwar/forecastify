import { SupabaseClient } from '@supabase/supabase-js';
import { ModelArtifact } from '../interfaces';
import { IArtifactStore, ArtifactManifest } from './artifact-store.interface';
import { LocalArtifactStore } from './local-artifact-store';

export class SupabaseArtifactStore implements IArtifactStore {
  private fallbackStore: LocalArtifactStore = new LocalArtifactStore();

  constructor(private client?: SupabaseClient, private bucketName: string = 'model-artifacts') {}

  public async saveArtifact(artifact: ModelArtifact, manifest?: ArtifactManifest): Promise<string> {
    if (!this.client) {
      return this.fallbackStore.saveArtifact(artifact, manifest);
    }
    try {
      const filePath = `${artifact.modelId}/${artifact.version}.json`;
      const payload = JSON.stringify({ artifact, manifest });
      const { data, error } = await this.client.storage
        .from(this.bucketName)
        .upload(filePath, payload, { contentType: 'application/json', upsert: true });

      if (error) {
        return this.fallbackStore.saveArtifact(artifact, manifest);
      }
      return `supabase://${this.bucketName}/${data.path}`;
    } catch {
      return this.fallbackStore.saveArtifact(artifact, manifest);
    }
  }

  public async loadArtifact(artifactUri: string): Promise<ModelArtifact> {
    if (artifactUri.startsWith('local://')) {
      return this.fallbackStore.loadArtifact(artifactUri);
    }
    if (!this.client) {
      return this.fallbackStore.loadArtifact(artifactUri);
    }
    try {
      const path = artifactUri.replace(`supabase://${this.bucketName}/`, '');
      const { data, error } = await this.client.storage.from(this.bucketName).download(path);
      if (error || !data) {
        return this.fallbackStore.loadArtifact(artifactUri);
      }
      const text = await data.text();
      const parsed = JSON.parse(text);
      return parsed.artifact;
    } catch {
      return this.fallbackStore.loadArtifact(artifactUri);
    }
  }

  public async deleteArtifact(artifactUri: string): Promise<boolean> {
    if (artifactUri.startsWith('local://')) {
      return this.fallbackStore.deleteArtifact(artifactUri);
    }
    if (!this.client) return true;
    try {
      const path = artifactUri.replace(`supabase://${this.bucketName}/`, '');
      const { error } = await this.client.storage.from(this.bucketName).remove([path]);
      return !error;
    } catch {
      return false;
    }
  }

  public async hasArtifact(artifactUri: string): Promise<boolean> {
    if (artifactUri.startsWith('local://')) {
      return this.fallbackStore.hasArtifact(artifactUri);
    }
    return true;
  }

  public async getManifest(artifactUri: string): Promise<ArtifactManifest | null> {
    if (artifactUri.startsWith('local://')) {
      return this.fallbackStore.getManifest(artifactUri);
    }
    try {
      const artifact = await this.loadArtifact(artifactUri);
      return {
        modelId: artifact.modelId,
        version: artifact.version,
        framework: 'custom',
        frameworkVersion: artifact.frameworkVersion || '1.0.0',
        serializationFormat: artifact.format || 'json',
        featureSchemaVersion: '1.0.0',
        datasetVersion: '1.0.0',
        artifactChecksum: artifact.checksum,
        dependencies: {},
        createdTimestamp: artifact.createdTimestamp,
      };
    } catch {
      return null;
    }
  }
}
