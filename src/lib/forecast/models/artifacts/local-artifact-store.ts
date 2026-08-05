import { ModelArtifact } from '../interfaces';
import { IArtifactStore, ArtifactManifest } from './artifact-store.interface';
import { calculateChecksum } from './artifact-manifest';

export class LocalArtifactStore implements IArtifactStore {
  private storage: Map<string, { artifact: ModelArtifact; manifest?: ArtifactManifest }> = new Map();

  public async saveArtifact(artifact: ModelArtifact, manifest?: ArtifactManifest): Promise<string> {
    const checksum = artifact.checksum || calculateChecksum(artifact.serializedData);
    const updatedArtifact = { ...artifact, checksum };
    const uri = `local://models/${artifact.modelId}/${artifact.version}/${checksum.slice(0, 8)}.json`;
    this.storage.set(uri, { artifact: updatedArtifact, manifest });
    return uri;
  }

  public async loadArtifact(artifactUri: string): Promise<ModelArtifact> {
    const item = this.storage.get(artifactUri);
    if (!item) {
      throw new Error(`Local artifact not found for URI: ${artifactUri}`);
    }
    return item.artifact;
  }

  public async deleteArtifact(artifactUri: string): Promise<boolean> {
    return this.storage.delete(artifactUri);
  }

  public async hasArtifact(artifactUri: string): Promise<boolean> {
    return this.storage.has(artifactUri);
  }

  public async getManifest(artifactUri: string): Promise<ArtifactManifest | null> {
    const item = this.storage.get(artifactUri);
    return item?.manifest || null;
  }
}
