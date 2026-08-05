import {
  IForecastModel,
  ModelTrainingData,
  TrainingConfig,
  TrainingResult,
  CrossValidationFoldResult,
} from '../interfaces';
import { IArtifactStore } from '../artifacts/artifact-store.interface';
import { ModelRegistry } from '../registry/model-registry';
import { ModelRepository } from '../repository/model-repository';
import { createArtifactManifest } from '../artifacts/artifact-manifest';
import { computeEvaluationMetrics } from '../metrics';

export class TrainingPipeline {
  constructor(
    private registry: ModelRegistry,
    private artifactStore: IArtifactStore,
    private repository?: ModelRepository
  ) {}

  public async runTraining(
    model: IForecastModel,
    data: ModelTrainingData,
    config: TrainingConfig
  ): Promise<TrainingResult> {
    const startTime = Date.now();
    this.registry.updateStatus(model.id, 'TRAINING');

    try {
      // Execute Cross Validation if configured
      let cvResults: CrossValidationFoldResult[] = [];
      if (config.crossValidationConfig) {
        cvResults = this.executeCrossValidation(model, data, config);
      }

      // Execute primary training
      const trainingResult = await model.train(data, config);
      const artifact = await model.save();
      const meta = model.getMetadata();

      const manifest = createArtifactManifest(artifact, meta);
      const artifactUri = await this.artifactStore.saveArtifact(artifact, manifest);

      trainingResult.artifactUri = artifactUri;
      trainingResult.artifactChecksum = artifact.checksum;
      trainingResult.cvResults = cvResults;

      // Update registry and database persistence
      this.registry.registerModel(model, 'TRAINED');
      meta.status = 'TRAINED';
      meta.artifactUri = artifactUri;
      meta.artifactChecksum = artifact.checksum;

      if (this.repository) {
        await this.repository.saveModelMetadata(data.storeId, meta);
      }

      return trainingResult;
    } catch (err: unknown) {
      this.registry.updateStatus(model.id, 'FAILED');
      const message = err instanceof Error ? err.message : String(err);
      return {
        modelId: model.id,
        modelVersion: model.version,
        status: 'FAILED',
        trainingDurationMs: Date.now() - startTime,
        artifactChecksum: '',
        artifactUri: '',
        errorMessage: message,
        completedAt: new Date().toISOString(),
      };
    }
  }

  private executeCrossValidation(
    model: IForecastModel,
    data: ModelTrainingData,
    config: TrainingConfig
  ): CrossValidationFoldResult[] {
    const cvConfig = config.crossValidationConfig!;
    const folds = cvConfig.folds || 3;
    const series = data.timeSeries || [];
    if (series.length < 10) return [];

    const foldResults: CrossValidationFoldResult[] = [];
    const foldSize = Math.floor(series.length / (folds + 1));

    for (let f = 0; f < folds; f++) {
      let trainEnd = 0;
      let testStart = 0;

      if (cvConfig.strategy === 'ExpandingWindowValidation') {
        trainEnd = (f + 1) * foldSize;
        testStart = trainEnd;
      } else if (cvConfig.strategy === 'RollingWindowValidation') {
        trainEnd = (f + 1) * foldSize;
        testStart = trainEnd;
      } else {
        // TrainTestSplit or BlockedTimeSeriesValidation default
        trainEnd = Math.floor(series.length * 0.7);
        testStart = trainEnd;
      }

      const trainSeries = series.slice(0, trainEnd);
      const testSeries = series.slice(testStart, testStart + foldSize);

      if (trainSeries.length === 0 || testSeries.length === 0) continue;

      const actuals = testSeries.map((t) => t.target);
      const predictions = testSeries.map(() => trainSeries[trainSeries.length - 1]?.target || 0);

      const metrics = computeEvaluationMetrics({ actuals, predictions });
      foldResults.push({
        foldIndex: f + 1,
        trainSize: trainSeries.length,
        testSize: testSeries.length,
        metrics,
      });
    }

    return foldResults;
  }
}
