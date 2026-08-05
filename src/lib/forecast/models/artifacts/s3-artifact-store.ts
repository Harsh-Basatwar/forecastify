import { ModelArtifact } from '../interfaces';
import { IArtifactStore, ArtifactManifest } from './artifact-store.interface';
import { LocalArtifactStore } from './local-artifact-store';

export class S3ArtifactStore implements IArtifactStore {
  private fallbackStore: LocalArtifactStore = new LocalArtifactStore();

  constructor(private bucketName: string = 'forecastify-models-s3', private region: string = 'us-east-1') {}

  public async saveArtifact(artifact: ModelArtifact, manifest?: ArtifactManifest): Promise<string> {
    // S3 integration stub - falls back gracefully to in-memory/local persistence
    return this.fallbackStore.saveArtifact(artifact, manifest);
  }

  public async loadArtifact(artifactUri: string): Promise<ModelArtifact> {
    return this.fallbackStore.loadArtifact(artifactUri);
  }

  public async deleteArtifact(artifactUri: string): Promise<boolean> {
    return this.fallbackStore.deleteArtifact(artifactUri);
  }

  public async hasArtifact(artifactUri: string): Promise<boolean> {
    return this.fallbackStore.hasArtifact(artifactUri);
  }

  public async getManifest(artifactUri: string): Promise<ArtifactManifest | null> {
    return this.fallbackStore.getManifest(artifactUri);
  }
}
