import { IForecastModel, InferenceContext, PredictionResult } from '../interfaces';
import { ModelRegistry } from '../registry/model-registry';
import { PredictionRepository } from '../repository/prediction-repository';

export class InferencePipeline {
  constructor(
    private registry: ModelRegistry,
    private predictionRepository?: PredictionRepository
  ) {}

  public async runInference(context: InferenceContext, modelId?: string): Promise<PredictionResult> {
    let model: IForecastModel | null = null;
    if (modelId) {
      model = this.registry.getModel(modelId);
    } else {
      model = this.registry.getActiveModel(context.storeId);
    }

    if (!model) {
      throw new Error(`No active or specified forecasting model found for store ${context.storeId}`);
    }

    const result = await model.predict(context);

    // Save prediction history
    if (this.predictionRepository) {
      await this.predictionRepository.savePrediction(result);
    }

    // Reserved event hook for Milestones 4-7 subscription
    this.emitPredictionGeneratedEvent(result);

    return result;
  }

  public async runBatchInference(contexts: InferenceContext[], modelId?: string): Promise<PredictionResult[]> {
    return Promise.all(contexts.map((ctx) => this.runInference(ctx, modelId)));
  }

  public async runAsyncInference(context: InferenceContext, modelId?: string): Promise<Promise<PredictionResult>> {
    return this.runInference(context, modelId);
  }

  private emitPredictionGeneratedEvent(result: PredictionResult): void {
    // Reserved event emission: 'forecast.prediction.generated'
    // Consumed in Milestones 4-7 (Recommendation Engine, Explainability, Monitoring)
    if (typeof process !== 'undefined' && typeof (process as any).emit === 'function') {
      (process as any).emit('forecast.prediction.generated', result);
    }
  }
}
