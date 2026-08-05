import { EvaluationReport, ModelSelectionStrategyType } from '../interfaces';

export interface ModelComparisonResult {
  reports: EvaluationReport[];
  selectedModelId: string;
  selectionStrategy: ModelSelectionStrategyType;
  comparisonTimestamp: string;
}

export class ModelSelector {
  public selectBestModel(
    reports: EvaluationReport[],
    strategy: ModelSelectionStrategyType = 'LowestMAPE'
  ): ModelComparisonResult {
    if (!reports.length) {
      throw new Error('Cannot select best model from empty evaluation reports list');
    }

    const sorted = [...reports];

    switch (strategy) {
      case 'LowestMAE':
        sorted.sort((a, b) => a.metrics.mae - b.metrics.mae);
        break;
      case 'LowestRMSE':
        sorted.sort((a, b) => a.metrics.rmse - b.metrics.rmse);
        break;
      case 'LowestMAPE':
        sorted.sort((a, b) => a.metrics.mape - b.metrics.mape);
        break;
      case 'WeightedScore':
        sorted.sort((a, b) => (b.score || 0) - (a.score || 0));
        break;
      case 'Custom':
      default:
        sorted.sort((a, b) => a.metrics.mape - b.metrics.mape);
        break;
    }

    const winner = sorted[0];

    return {
      reports,
      selectedModelId: winner.modelId,
      selectionStrategy: strategy,
      comparisonTimestamp: new Date().toISOString(),
    };
  }
}
