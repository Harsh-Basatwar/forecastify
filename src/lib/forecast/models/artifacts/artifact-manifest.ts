import { createHash } from 'node:crypto';
import { ModelArtifact, ModelMetadata } from '../interfaces';
import { ArtifactManifest } from './artifact-store.interface';

export function calculateChecksum(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

export function createArtifactManifest(
  artifact: ModelArtifact,
  metadata: ModelMetadata
): ArtifactManifest {
  return {
    modelId: artifact.modelId,
    version: artifact.version,
    framework: metadata.framework,
    frameworkVersion: metadata.frameworkVersion || '1.0.0',
    serializationFormat: artifact.format || 'json',
    featureSchemaVersion: metadata.featureSnapshotVersion || '1.0.0',
    datasetVersion: metadata.datasetVersion || '1.0.0',
    artifactChecksum: artifact.checksum,
    dependencies: {
      forecastifyEngine: '2.0.0',
      runtime: 'node-v20',
    },
    createdTimestamp: artifact.createdTimestamp || new Date().toISOString(),
  };
}
