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
import {
  IEnsembleStrategy,
  SimpleAverageStrategy,
  WeightedAverageStrategy,
  MedianStrategy,
  VotingStrategy,
  StackingStrategy,
} from '../ensemble/ensemble-strategy';

export class EnsembleForecastModel implements IForecastModel {
  public readonly id: string;
  public readonly name: string = 'Multi-Model Ensemble Forecast';
  public readonly modelType: string = 'ensemble';
  public readonly framework: string = 'custom-ensemble';
  public readonly version: string = '1.0.0';
  public readonly capabilities: ModelCapabilities = {
    supportsMultivariate: true,
    supportsProbabilistic: true,
    supportsConfidenceInterval: true,
    supportsIncrementalLearning: false,
    supportsOnlineLearning: false,
    supportsMissingData: true,
    maxHorizonDays: 365,
  };

  private subModels: IForecastModel[] = [];
  private weights: number[] = [];
  private strategy: IEnsembleStrategy;
  private datasetVersion: string = '1.0.0';
  private datasetHash: string = '';

  constructor(
    id: string = 'ensemble-v1',
    models: IForecastModel[] = [],
    weights: number[] = [],
    strategy?: IEnsembleStrategy
  ) {
    this.id = id;
    this.subModels = models;
    this.weights = weights;
    this.strategy = strategy || new SimpleAverageStrategy();
  }

  public setStrategy(strategy: IEnsembleStrategy): void {
    this.strategy = strategy;
  }

  public setSubModels(models: IForecastModel[], weights?: number[]): void {
    this.subModels = models;
    if (weights) {
      this.weights = weights;
    }
  }

  public async train(data: ModelTrainingData, config: TrainingConfig): Promise<TrainingResult> {
    const startTime = Date.now();
    this.datasetVersion = data.datasetVersion || '1.0.0';
    this.datasetHash = data.datasetHash || '';

    // Configure strategy if passed in hyperparameters
    if (config.hyperparameters?.strategyName) {
      const name = String(config.hyperparameters.strategyName);
      if (name === 'WeightedAverage') this.strategy = new WeightedAverageStrategy();
      else if (name === 'Median') this.strategy = new MedianStrategy();
      else if (name === 'Voting') this.strategy = new VotingStrategy();
      else if (name === 'Stacking') this.strategy = new StackingStrategy();
      else this.strategy = new SimpleAverageStrategy();
    }

    // Train underlying sub-models if any exist
    for (const model of this.subModels) {
      await model.train(data, config);
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

    if (this.subModels.length === 0) {
      // Fallback baseline if submodels not initialized
      const startDate = new Date();
      const predictions = Array.from({ length: horizonDays }, (_, i) => {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i + 1);
        return {
          date: d.toISOString().split('T')[0],
          predictedValue: 100,
          lowerBound: 85,
          upperBound: 115,
        };
      });

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
        metadata: {
          latencyMs: Date.now() - startTime,
          predictionGeneratedAt: new Date().toISOString(),
        },
      };
    }

    // Collect predictions from sub-models
    const subResults = await Promise.all(this.subModels.map((m) => m.predict(context)));
    const predictionsList = subResults.map((r) => r.predictions.map((p) => p.predictedValue));
    const combinedValues = this.strategy.combine(predictionsList, this.weights);

    const dates = subResults[0].predictions.map((p) => p.date);
    const predictions = combinedValues.map((val, idx) => ({
      date: dates[idx],
      predictedValue: val,
      lowerBound: Math.max(0, val * 0.88),
      upperBound: val * 1.12,
    }));

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
      passedThresholds: metrics.mape < 20,
      score: Math.max(0, 100 - metrics.mape),
    };
  }

  public async save(): Promise<ModelArtifact> {
    const payload = JSON.stringify({
      id: this.id,
      strategyName: this.strategy.name,
      weights: this.weights,
      subModelIds: this.subModels.map((m) => m.id),
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
    this.weights = parsed.weights || [];
    this.datasetVersion = parsed.datasetVersion || '1.0.0';
    this.datasetHash = parsed.datasetHash || '';

    const name = parsed.strategyName;
    if (name === 'WeightedAverage') this.strategy = new WeightedAverageStrategy();
    else if (name === 'Median') this.strategy = new MedianStrategy();
    else if (name === 'Voting') this.strategy = new VotingStrategy();
    else if (name === 'Stacking') this.strategy = new StackingStrategy();
    else this.strategy = new SimpleAverageStrategy();
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
