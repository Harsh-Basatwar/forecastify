import { IForecastModel, ModelMetadata, ModelArtifact } from '../interfaces';
import { calculateChecksum } from '../artifacts/artifact-manifest';

export interface ValidationCheckResult {
  passed: boolean;
  checkName: string;
  message: string;
}

export interface CompatibilityValidationReport {
  modelId: string;
  isCompatible: boolean;
  validatedAt: string;
  checks: ValidationCheckResult[];
}

export class ModelCompatibilityValidator {
  public static validatePreDeployment(
    model: IForecastModel,
    artifact?: ModelArtifact,
    requiredFeatureSchemaVersion: string = '1.0.0'
  ): CompatibilityValidationReport {
    const meta = model.getMetadata();
    const checks: ValidationCheckResult[] = [];

    // 1. Feature Schema Check
    const featureSchemaOk = meta.featureSnapshotVersion === requiredFeatureSchemaVersion;
    checks.push({
      checkName: 'FeatureSchemaVersion',
      passed: featureSchemaOk,
      message: featureSchemaOk
        ? `Feature schema version ${meta.featureSnapshotVersion} matches required ${requiredFeatureSchemaVersion}`
        : `Feature schema mismatch: Model has ${meta.featureSnapshotVersion}, expected ${requiredFeatureSchemaVersion}`,
    });

    // 2. Horizon Support Check
    const caps = model.getCapabilities();
    const horizonOk = (caps.maxHorizonDays || 0) >= 7;
    checks.push({
      checkName: 'HorizonSupport',
      passed: horizonOk,
      message: horizonOk
        ? `Model supports max horizon of ${caps.maxHorizonDays} days`
        : `Model max horizon ${caps.maxHorizonDays} is insufficient for default minimum 7d`,
    });

    // 3. Framework & Serialization Compatibility Check
    const formatOk = meta.serializationFormat === 'json' || meta.serializationFormat === 'binary';
    checks.push({
      checkName: 'SerializationFormat',
      passed: formatOk,
      message: formatOk
        ? `Serialization format ${meta.serializationFormat} is supported`
        : `Unsupported serialization format ${meta.serializationFormat}`,
    });

    // 4. Artifact Checksum Check
    if (artifact) {
      const computedHash = calculateChecksum(artifact.serializedData);
      const hashOk = computedHash === artifact.checksum;
      checks.push({
        checkName: 'ArtifactChecksum',
        passed: hashOk,
        message: hashOk
          ? `Artifact SHA-256 checksum verified (${computedHash.slice(0, 8)})`
          : `Checksum mismatch! Computed ${computedHash.slice(0, 8)}, expected ${artifact.checksum.slice(0, 8)}`,
      });
    }

    // 5. Prediction Output Contract Check
    const contractOk = Boolean(meta.id && meta.version && meta.modelType);
    checks.push({
      checkName: 'PredictionOutputContract',
      passed: contractOk,
      message: contractOk
        ? 'Model metadata exposes valid identity structure'
        : 'Model metadata missing required identity attributes',
    });

    const isCompatible = checks.every((c) => c.passed);

    return {
      modelId: model.id,
      isCompatible,
      validatedAt: new Date().toISOString(),
      checks,
    };
  }
}
