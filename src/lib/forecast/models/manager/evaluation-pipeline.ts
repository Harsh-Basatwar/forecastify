import {
  IForecastModel,
  ModelEvaluationData,
  EvaluationReport,
  EvaluationConfig,
} from '../interfaces';
import { ModelRegistry } from '../registry/model-registry';
import { ModelRepository } from '../repository/model-repository';

export class EvaluationPipeline {
  constructor(private registry: ModelRegistry, private repository?: ModelRepository) {}

  public async evaluateModel(
    model: IForecastModel,
    data: ModelEvaluationData,
    config?: EvaluationConfig
  ): Promise<EvaluationReport> {
    this.registry.updateStatus(model.id, 'EVALUATING');

    const report = await model.evaluate(data);

    // Apply custom threshold checks if specified in config
    if (config?.minR2Threshold !== undefined && report.metrics.r2 < config.minR2Threshold) {
      report.passedThresholds = false;
    }
    if (config?.maxMapeThreshold !== undefined && report.metrics.mape > config.maxMapeThreshold) {
      report.passedThresholds = false;
    }

    const nextStatus = report.passedThresholds ? 'READY' : 'TRAINED';
    this.registry.updateStatus(model.id, nextStatus);

    return report;
  }

  public async evaluateBatch(
    models: IForecastModel[],
    data: ModelEvaluationData,
    config?: EvaluationConfig
  ): Promise<EvaluationReport[]> {
    return Promise.all(models.map((m) => this.evaluateModel(m, data, config)));
  }
}
