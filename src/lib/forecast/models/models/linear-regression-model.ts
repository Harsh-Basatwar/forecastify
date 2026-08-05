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

export class LinearRegressionForecastModel implements IForecastModel {
  public readonly id: string;
  public readonly name: string = 'Linear Regression Model';
  public readonly modelType: string = 'linear_regression';
  public readonly framework: string = 'scikit-learn-adapter';
  public readonly version: string = '1.0.0';
  public readonly capabilities: ModelCapabilities = {
    supportsMultivariate: true,
    supportsProbabilistic: false,
    supportsConfidenceInterval: true,
    supportsIncrementalLearning: false,
    supportsOnlineLearning: false,
    supportsMissingData: false,
    maxHorizonDays: 180,
  };

  private slope: number = 0;
  private intercept: number = 0;
  private datasetVersion: string = '1.0.0';
  private datasetHash: string = '';

  constructor(id: string = 'linear-regression-v1') {
    this.id = id;
  }

  public async train(data: ModelTrainingData, config: TrainingConfig): Promise<TrainingResult> {
    const startTime = Date.now();
    this.datasetVersion = data.datasetVersion || '1.0.0';
    this.datasetHash = data.datasetHash || '';

    const series = data.timeSeries || [];
    if (series.length >= 2) {
      const n = series.length;
      let sumX = 0;
      let sumY = 0;
      let sumXY = 0;
      let sumXX = 0;

      for (let i = 0; i < n; i++) {
        const x = i;
        const y = series[i].target;
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumXX += x * x;
      }

      const denom = n * sumXX - sumX * sumX;
      if (denom !== 0) {
        this.slope = (n * sumXY - sumX * sumY) / denom;
        this.intercept = (sumY - this.slope * sumX) / n;
      } else {
        this.slope = 0;
        this.intercept = sumY / n;
      }
    } else if (series.length === 1) {
      this.slope = 0;
      this.intercept = series[0].target;
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
    const baseVal = Math.max(0, this.intercept);

    for (let i = 1; i <= horizonDays; i++) {
      const forecastDate = new Date(startDate);
      forecastDate.setDate(forecastDate.getDate() + i);
      const isoDate = forecastDate.toISOString().split('T')[0];

      const pred = Math.max(0, this.intercept + this.slope * (i + 10));
      const lower = Math.max(0, pred * 0.85);
      const upper = pred * 1.15;

      predictions.push({
        date: isoDate,
        predictedValue: pred,
        lowerBound: lower,
        upperBound: upper,
      });
    }

    const latency = Date.now() - startTime;
    const values = predictions.map((p) => p.predictedValue);

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
        min: Math.min(...values),
        max: Math.max(...values),
        mean: values.reduce((a, b) => a + b, 0) / values.length,
        median: values[Math.floor(values.length / 2)],
        stdDev: Math.abs(this.slope),
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
      passedThresholds: metrics.r2 > 0.3,
      score: Math.max(0, metrics.r2 * 100),
    };
  }

  public async save(): Promise<ModelArtifact> {
    const payload = JSON.stringify({
      id: this.id,
      slope: this.slope,
      intercept: this.intercept,
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
    this.slope = parsed.slope || 0;
    this.intercept = parsed.intercept || 0;
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
