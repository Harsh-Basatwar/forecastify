import { ModelArtifact } from '../interfaces';

export interface ArtifactManifest {
  modelId: string;
  version: string;
  framework: string;
  frameworkVersion: string;
  serializationFormat: string;
  featureSchemaVersion: string;
  datasetVersion: string;
  artifactChecksum: string;
  dependencies: Record<string, string>;
  createdTimestamp: string;
}

export interface IArtifactStore {
  saveArtifact(artifact: ModelArtifact, manifest?: ArtifactManifest): Promise<string>;
  loadArtifact(artifactUri: string): Promise<ModelArtifact>;
  deleteArtifact(artifactUri: string): Promise<boolean>;
  hasArtifact(artifactUri: string): Promise<boolean>;
  getManifest?(artifactUri: string): Promise<ArtifactManifest | null>;
}
