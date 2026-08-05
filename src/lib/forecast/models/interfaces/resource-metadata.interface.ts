export interface ResourceMetadata {
  trainingMemoryUsageBytes?: number;
  inferenceLatencyMs?: number;
  avgPredictionLatencyMs?: number;
  cpuTimeMs?: number;
  gpuSupport?: boolean;
  batchInferenceSupport?: boolean;
  modelSizeBytes?: number;
  trainingDurationMs?: number;
}
