import { IForecastModel, ModelMetadata } from '../interfaces';
import { ModelRegistry } from '../registry/model-registry';
import { ModelRepository } from '../repository/model-repository';
import { ModelCompatibilityValidator, CompatibilityValidationReport } from '../validator/model-compatibility-validator';

export interface DeploymentResult {
  storeId: string;
  modelId: string;
  status: 'SUCCESS' | 'FAILED' | 'REJECTED';
  validationReport?: CompatibilityValidationReport;
  previousModelId?: string;
  deployedAt: string;
  notes?: string;
}

export class DeploymentPipeline {
  private deploymentHistory: Map<string, string[]> = new Map(); // key: storeId, val: list of modelIds in deployment order

  constructor(private registry: ModelRegistry, private repository?: ModelRepository) {}

  public async validateCandidate(model: IForecastModel): Promise<CompatibilityValidationReport> {
    return ModelCompatibilityValidator.validatePreDeployment(model);
  }

  public async deployCandidate(
    storeId: string,
    model: IForecastModel,
    deploymentNotes?: string
  ): Promise<DeploymentResult> {
    // 1. Pre-deployment compatibility validation
    const validationReport = await this.validateCandidate(model);
    if (!validationReport.isCompatible) {
      return {
        storeId,
        modelId: model.id,
        status: 'REJECTED',
        validationReport,
        deployedAt: new Date().toISOString(),
        notes: 'Pre-deployment compatibility check failed.',
      };
    }

    // 2. Track deployment history for rollback
    const history = this.deploymentHistory.get(storeId) || [];
    const previousModelId = history.length > 0 ? history[history.length - 1] : undefined;

    // 3. Set deployed in registry
    const success = this.registry.setDeployed(storeId, model.id);
    if (!success) {
      return {
        storeId,
        modelId: model.id,
        status: 'FAILED',
        validationReport,
        deployedAt: new Date().toISOString(),
        notes: 'Failed to promote model in registry.',
      };
    }

    history.push(model.id);
    this.deploymentHistory.set(storeId, history);

    if (this.repository) {
      await this.repository.updateModelStatus(model.id, 'DEPLOYED', deploymentNotes);
      if (previousModelId) {
        await this.repository.updateModelStatus(previousModelId, 'RETIRED');
      }
    }

    return {
      storeId,
      modelId: model.id,
      status: 'SUCCESS',
      validationReport,
      previousModelId,
      deployedAt: new Date().toISOString(),
      notes: deploymentNotes || 'Successfully promoted candidate model to DEPLOYED state.',
    };
  }

  public async rollback(storeId: string): Promise<DeploymentResult> {
    const history = this.deploymentHistory.get(storeId) || [];
    if (history.length < 2) {
      return {
        storeId,
        modelId: history[0] || 'none',
        status: 'FAILED',
        deployedAt: new Date().toISOString(),
        notes: 'No previous deployment available for rollback.',
      };
    }

    const currentModelId = history.pop()!;
    const previousModelId = history[history.length - 1];

    const previousModel = this.registry.getModel(previousModelId);
    if (!previousModel) {
      return {
        storeId,
        modelId: previousModelId,
        status: 'FAILED',
        deployedAt: new Date().toISOString(),
        notes: `Previous model ${previousModelId} not found in registry.`,
      };
    }

    this.registry.updateStatus(currentModelId, 'RETIRED');
    this.registry.setDeployed(storeId, previousModelId);

    if (this.repository) {
      await this.repository.updateModelStatus(currentModelId, 'RETIRED');
      await this.repository.updateModelStatus(previousModelId, 'DEPLOYED', 'Reinstated via rollback');
    }

    return {
      storeId,
      modelId: previousModelId,
      status: 'SUCCESS',
      previousModelId: currentModelId,
      deployedAt: new Date().toISOString(),
      notes: `Rollback successful. Reinstated model ${previousModelId}.`,
    };
  }
}
