export type ModelHealthState = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN';

export interface ModelHealthStatus {
  healthState: ModelHealthState;
  lastPredictionTimestamp?: string;
  predictionCount: number;
  failureCount: number;
  averageLatencyMs: number;
  availabilityPercentage: number;
  lastErrorDetails?: string;
  checkedAt: string;
}
