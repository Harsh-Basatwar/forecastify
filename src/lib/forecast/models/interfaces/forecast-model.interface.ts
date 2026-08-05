import { ModelTrainingData, TrainingConfig, TrainingResult } from './training.interface';
import { ModelEvaluationData, EvaluationReport } from './evaluation.interface';
import { InferenceContext, PredictionResult } from './inference.interface';
import { ResourceMetadata } from './resource-metadata.interface';

export type ModelLifecycleStatus =
  | 'DRAFT'
  | 'TRAINING'
  | 'TRAINED'
  | 'EVALUATING'
  | 'READY'
  | 'DEPLOYED'
  | 'RETIRED'
  | 'FAILED';

export interface ModelCapabilities {
  supportsMultivariate: boolean;
  supportsProbabilistic: boolean;
  supportsConfidenceInterval: boolean;
  supportsIncrementalLearning: boolean;
  supportsOnlineLearning: boolean;
  supportsMissingData: boolean;
  maxHorizonDays?: number;
}

export interface ModelMetadata {
  id: string;
  name: string;
  modelType: string;
  framework: string;
  version: string;
  datasetVersion: string;
  datasetHash?: string;
  featureSnapshotVersion: string;
  status: ModelLifecycleStatus;
  artifactChecksum?: string;
  artifactUri?: string;
  frameworkVersion: string;
  serializationFormat: string;
  resourceMetadata?: ResourceMetadata;
  capabilities: ModelCapabilities;
  createdAt: string;
  updatedAt: string;
}

export interface ModelArtifact {
  modelId: string;
  version: string;
  serializedData: string; // JSON string or base64 binary stream
  checksum: string; // SHA-256
  frameworkVersion: string;
  format: string;
  createdTimestamp: string;
}

export interface IForecastModel {
  readonly id: string;
  readonly name: string;
  readonly modelType: string;
  readonly framework: string;
  readonly version: string;
  readonly capabilities: ModelCapabilities;

  train(data: ModelTrainingData, config: TrainingConfig): Promise<TrainingResult>;
  predict(context: InferenceContext): Promise<PredictionResult>;
  predictBatch(contexts: InferenceContext[]): Promise<PredictionResult[]>;
  predictAsync(context: InferenceContext): Promise<Promise<PredictionResult>>;
  evaluate(data: ModelEvaluationData): Promise<EvaluationReport>;
  save(): Promise<ModelArtifact>;
  load(artifact: ModelArtifact): Promise<void>;
  getMetadata(): ModelMetadata;
  getCapabilities(): ModelCapabilities;
  supportsIncrementalTraining(): boolean;
  supportsConfidenceIntervals(): boolean;
  supportsProbabilisticForecast(): boolean;
}
