import {
  IForecastModel,
  ModelCapabilities,
  ModelMetadata,
  ModelTrainingData,
  TrainingConfig,
  TrainingResult,
  InferenceContext,
  PredictionResult,
  ModelEvaluationData,
  EvaluationReport,
  ModelArtifact,
} from '../interfaces';
import { calculateChecksum } from '../artifacts/artifact-manifest';
import { computeEvaluationMetrics } from '../metrics';

export class MovingAverageForecastModel implements IForecastModel {
  public readonly id: string;
  public readonly name: string = 'Moving Average Model';
  public readonly modelType: string = 'moving_average';
  public readonly framework: string = 'custom';
  public readonly version: string = '1.0.0';
  public readonly capabilities: ModelCapabilities = {
    supportsMultivariate: false,
    supportsProbabilistic: false,
    supportsConfidenceInterval: true,
    supportsIncrementalLearning: true,
    supportsOnlineLearning: true,
    supportsMissingData: false,
    maxHorizonDays: 90,
  };

  private windowSize: number;
  private history: number[] = [];
  private movingAverage: number = 0;
  private datasetVersion: string = '1.0.0';
  private datasetHash: string = '';

  constructor(id: string = 'moving-average-v1', windowSize: number = 7) {
    this.id = id;
    this.windowSize = windowSize;
  }

  public async train(data: ModelTrainingData, config: TrainingConfig): Promise<TrainingResult> {
    const startTime = Date.now();
    this.datasetVersion = data.datasetVersion || '1.0.0';
    this.datasetHash = data.datasetHash || '';

    if (config.hyperparameters?.windowSize) {
      this.windowSize = Number(config.hyperparameters.windowSize);
    }

    if (data.timeSeries && data.timeSeries.length > 0) {
      this.history = data.timeSeries.map((pt) => pt.target);
      const recent = this.history.slice(-this.windowSize);
      const sum = recent.reduce((acc, val) => acc + val, 0);
      this.movingAverage = recent.length > 0 ? sum / recent.length : 0;
    }

    const duration = Date.now() - startTime;
    const artifact = await this.save();

    return {
      modelId: this.id,
      modelVersion: this.version,
      status: 'SUCCESS',
      trainingDurationMs: duration,
      artifactChecksum: artifact.checksum,
      artifactUri: `local://models/${this.id}/${this.version}/${artifact.checksum.slice(0, 8)}.json`,
      completedAt: new Date().toISOString(),
    };
  }

  public async predict(context: InferenceContext): Promise<PredictionResult> {
    const startTime = Date.now();
    const horizonDays = parseInt(context.horizon) || 7;
    const predictions = [];

    const stdDev = this.calculateHistoryStdDev();
    const startDate = new Date();

    for (let i = 1; i <= horizonDays; i++) {
      const forecastDate = new Date(startDate);
      forecastDate.setDate(forecastDate.getDate() + i);
      const isoDate = forecastDate.toISOString().split('T')[0];

      const lower = Math.max(0, this.movingAverage - 1.96 * stdDev);
      const upper = this.movingAverage + 1.96 * stdDev;

      predictions.push({
        date: isoDate,
        predictedValue: this.movingAverage,
        lowerBound: lower,
        upperBound: upper,
      });
    }

    const latency = Date.now() - startTime;

    return {
      predictionSchemaVersion: '1.0.0',
      featureSchemaVersion: context.featureVector?.metadata?.schemaVersion || '1.0.0',
      modelVersion: this.version,
      modelId: this.id,
      modelType: this.modelType,
      storeId: context.storeId,
      productId: context.productId,
      horizon: context.horizon,
      predictions,
      intervals: {
        confidenceLevel: 0.95,
        lower: predictions.map((p) => p.lowerBound!),
        upper: predictions.map((p) => p.upperBound!),
      },
      statistics: {
        min: this.movingAverage,
        max: this.movingAverage,
        mean: this.movingAverage,
        median: this.movingAverage,
        stdDev,
      },
      metadata: {
        latencyMs: latency,
        predictionGeneratedAt: new Date().toISOString(),
      },
    };
  }

  public async predictBatch(contexts: InferenceContext[]): Promise<PredictionResult[]> {
    return Promise.all(contexts.map((ctx) => this.predict(ctx)));
  }

  public async predictAsync(context: InferenceContext): Promise<Promise<PredictionResult>> {
    return this.predict(context);
  }

  public async evaluate(data: ModelEvaluationData): Promise<EvaluationReport> {
    const metrics = computeEvaluationMetrics(data);
    return {
      modelId: this.id,
      modelType: this.modelType,
      version: this.version,
      datasetVersion: this.datasetVersion,
      evaluatedAt: new Date().toISOString(),
      sampleCount: data.actuals.length,
      metrics,
      passedThresholds: metrics.mape < 45,
      score: Math.max(0, 100 - metrics.mape),
    };
  }

  public async save(): Promise<ModelArtifact> {
    const payload = JSON.stringify({
      id: this.id,
      windowSize: this.windowSize,
      movingAverage: this.movingAverage,
      history: this.history,
      datasetVersion: this.datasetVersion,
      datasetHash: this.datasetHash,
    });
    const checksum = calculateChecksum(payload);

    return {
      modelId: this.id,
      version: this.version,
      serializedData: payload,
      checksum,
      frameworkVersion: '1.0.0',
      format: 'json',
      createdTimestamp: new Date().toISOString(),
    };
  }

  public async load(artifact: ModelArtifact): Promise<void> {
    const parsed = JSON.parse(artifact.serializedData);
    this.windowSize = parsed.windowSize || 7;
    this.movingAverage = parsed.movingAverage || 0;
    this.history = parsed.history || [];
    this.datasetVersion = parsed.datasetVersion || '1.0.0';
    this.datasetHash = parsed.datasetHash || '';
  }

  public getMetadata(): ModelMetadata {
    return {
      id: this.id,
      name: this.name,
      modelType: this.modelType,
      framework: this.framework,
      version: this.version,
      datasetVersion: this.datasetVersion,
      datasetHash: this.datasetHash,
      featureSnapshotVersion: '1.0.0',
      status: 'READY',
      frameworkVersion: '1.0.0',
      serializationFormat: 'json',
      capabilities: this.capabilities,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  public getCapabilities(): ModelCapabilities {
    return this.capabilities;
  }

  public supportsIncrementalTraining(): boolean {
    return this.capabilities.supportsIncrementalLearning;
  }

  public supportsConfidenceIntervals(): boolean {
    return this.capabilities.supportsConfidenceInterval;
  }

  public supportsProbabilisticForecast(): boolean {
    return this.capabilities.supportsProbabilistic;
  }

  private calculateHistoryStdDev(): number {
    if (this.history.length < 2) return 1.0;
    const mean = this.history.reduce((a, b) => a + b, 0) / this.history.length;
    const variance = this.history.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (this.history.length - 1);
    return Math.sqrt(variance);
  }
}
