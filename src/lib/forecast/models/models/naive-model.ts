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

export class NaiveForecastModel implements IForecastModel {
  public readonly id: string;
  public readonly name: string = 'Naive Baseline Model';
  public readonly modelType: string = 'naive';
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

  private lastValue: number = 0;
  private datasetVersion: string = '1.0.0';
  private datasetHash: string = '';

  constructor(id: string = 'naive-baseline-v1') {
    this.id = id;
  }

  public async train(data: ModelTrainingData, config: TrainingConfig): Promise<TrainingResult> {
    const startTime = Date.now();
    this.datasetVersion = data.datasetVersion || '1.0.0';
    this.datasetHash = data.datasetHash || '';

    if (data.timeSeries && data.timeSeries.length > 0) {
      this.lastValue = data.timeSeries[data.timeSeries.length - 1].target;
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

    const startDate = new Date();
    for (let i = 1; i <= horizonDays; i++) {
      const forecastDate = new Date(startDate);
      forecastDate.setDate(forecastDate.getDate() + i);
      const isoDate = forecastDate.toISOString().split('T')[0];

      predictions.push({
        date: isoDate,
        predictedValue: this.lastValue,
        lowerBound: Math.max(0, this.lastValue * 0.85),
        upperBound: this.lastValue * 1.15,
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
        min: this.lastValue,
        max: this.lastValue,
        mean: this.lastValue,
        median: this.lastValue,
        stdDev: 0,
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
      passedThresholds: metrics.mape < 50,
      score: Math.max(0, 100 - metrics.mape),
    };
  }

  public async save(): Promise<ModelArtifact> {
    const payload = JSON.stringify({
      id: this.id,
      lastValue: this.lastValue,
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
    this.lastValue = parsed.lastValue || 0;
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
}
