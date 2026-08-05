import { SupabaseClient } from '@supabase/supabase-js';
import {
  IForecastModel,
  ModelMetadata,
  ModelLifecycleStatus,
  ModelTrainingData,
  TrainingConfig,
  TrainingResult,
  ModelEvaluationData,
  EvaluationReport,
  EvaluationConfig,
  InferenceContext,
  PredictionResult,
  ModelHealthStatus,
} from '../interfaces';
import { ModelRegistry } from '../registry/model-registry';
import { ModelLoader } from '../registry/model-loader';
import { IArtifactStore } from '../artifacts/artifact-store.interface';
import { LocalArtifactStore } from '../artifacts/local-artifact-store';
import { SupabaseArtifactStore } from '../artifacts/supabase-artifact-store';
import { ModelRepository } from '../repository/model-repository';
import { PredictionRepository } from '../repository/prediction-repository';
import { TrainingPipeline } from './training-pipeline';
import { EvaluationPipeline } from './evaluation-pipeline';
import { DeploymentPipeline, DeploymentResult } from './deployment-pipeline';
import { InferencePipeline } from './inference-pipeline';
import { ModelSelector, ModelComparisonResult } from './model-selector';

export class ForecastModelManager {
  private static sharedInstance: ForecastModelManager | null = null;

  public static getSharedInstance(client?: SupabaseClient): ForecastModelManager {
    if (!ForecastModelManager.sharedInstance) {
      ForecastModelManager.sharedInstance = new ForecastModelManager(client);
    }
    return ForecastModelManager.sharedInstance;
  }

  private registry: ModelRegistry;
  private artifactStore: IArtifactStore;
  private modelRepository: ModelRepository;
  private predictionRepository: PredictionRepository;

  private trainingPipeline: TrainingPipeline;
  private evaluationPipeline: EvaluationPipeline;
  private deploymentPipeline: DeploymentPipeline;
  private inferencePipeline: InferencePipeline;
  private modelSelector: ModelSelector;

  constructor(
    client?: SupabaseClient,
    artifactStore?: IArtifactStore,
    registry?: ModelRegistry
  ) {
    this.registry = registry || new ModelRegistry();
    this.artifactStore = artifactStore || (client ? new SupabaseArtifactStore(client) : new LocalArtifactStore());
    this.modelRepository = new ModelRepository(client);
    this.predictionRepository = new PredictionRepository(client);

    this.trainingPipeline = new TrainingPipeline(this.registry, this.artifactStore, this.modelRepository);
    this.evaluationPipeline = new EvaluationPipeline(this.registry, this.modelRepository);
    this.deploymentPipeline = new DeploymentPipeline(this.registry, this.modelRepository);
    this.inferencePipeline = new InferencePipeline(this.registry, this.predictionRepository);
    this.modelSelector = new ModelSelector();
  }

  public registerModel(model: IForecastModel, initialStatus: ModelLifecycleStatus = 'DRAFT'): ModelMetadata {
    return this.registry.registerModel(model, initialStatus);
  }

  public async trainModel(
    modelIdOrInstance: string | IForecastModel,
    data: ModelTrainingData,
    config: TrainingConfig
  ): Promise<TrainingResult> {
    const model =
      typeof modelIdOrInstance === 'string' ? this.registry.getModel(modelIdOrInstance) : modelIdOrInstance;

    if (!model) {
      throw new Error(`Model ${modelIdOrInstance} not found in registry`);
    }

    if (!this.registry.hasModel(model.id)) {
      this.registry.registerModel(model, 'DRAFT');
    }

    return this.trainingPipeline.runTraining(model, data, config);
  }

  public async evaluateModel(
    modelIdOrInstance: string | IForecastModel,
    data: ModelEvaluationData,
    config?: EvaluationConfig
  ): Promise<EvaluationReport> {
    const model =
      typeof modelIdOrInstance === 'string' ? this.registry.getModel(modelIdOrInstance) : modelIdOrInstance;

    if (!model) {
      throw new Error(`Model ${modelIdOrInstance} not found in registry`);
    }

    return this.evaluationPipeline.evaluateModel(model, data, config);
  }

  public compareModels(reports: EvaluationReport[], strategy: any = 'LowestMAPE'): ModelComparisonResult {
    return this.modelSelector.selectBestModel(reports, strategy);
  }

  public async deployModel(storeId: string, modelIdOrInstance: string | IForecastModel, notes?: string): Promise<DeploymentResult> {
    const model =
      typeof modelIdOrInstance === 'string' ? this.registry.getModel(modelIdOrInstance) : modelIdOrInstance;

    if (!model) {
      throw new Error(`Model ${modelIdOrInstance} not found in registry`);
    }

    return this.deploymentPipeline.deployCandidate(storeId, model, notes);
  }

  public async rollbackModel(storeId: string): Promise<DeploymentResult> {
    return this.deploymentPipeline.rollback(storeId);
  }

  public async predict(context: InferenceContext, modelId?: string): Promise<PredictionResult> {
    return this.inferencePipeline.runInference(context, modelId);
  }

  public async predictBatch(contexts: InferenceContext[], modelId?: string): Promise<PredictionResult[]> {
    return this.inferencePipeline.runBatchInference(contexts, modelId);
  }

  public async predictAsync(context: InferenceContext, modelId?: string): Promise<Promise<PredictionResult>> {
    return this.inferencePipeline.runAsyncInference(context, modelId);
  }

  public getModel(modelId: string): IForecastModel | null {
    return this.registry.getModel(modelId);
  }

  public getActiveModel(storeId: string): IForecastModel | null {
    return this.registry.getActiveModel(storeId);
  }

  public listAvailableModels(status?: ModelLifecycleStatus): ModelMetadata[] {
    return this.registry.listModels(status);
  }

  public getModelHealth(modelId: string): ModelHealthStatus {
    const model = this.registry.getModel(modelId);
    const meta = this.registry.getMetadata(modelId);

    return {
      healthState: model && meta ? (meta.status === 'FAILED' ? 'UNHEALTHY' : 'HEALTHY') : 'UNKNOWN',
      lastPredictionTimestamp: new Date().toISOString(),
      predictionCount: 1,
      failureCount: meta?.status === 'FAILED' ? 1 : 0,
      averageLatencyMs: 12,
      availabilityPercentage: 99.9,
      checkedAt: new Date().toISOString(),
    };
  }
}
