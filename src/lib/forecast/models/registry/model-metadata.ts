import { ModelMetadata, ModelCapabilities } from '../interfaces';

export function filterModelsByCapabilities(
  models: ModelMetadata[],
  requiredCapabilities: Partial<ModelCapabilities>
): ModelMetadata[] {
  return models.filter((model) => {
    const caps = model.capabilities;
    if (requiredCapabilities.supportsMultivariate && !caps.supportsMultivariate) return false;
    if (requiredCapabilities.supportsProbabilistic && !caps.supportsProbabilistic) return false;
    if (requiredCapabilities.supportsConfidenceInterval && !caps.supportsConfidenceInterval) return false;
    if (requiredCapabilities.supportsIncrementalLearning && !caps.supportsIncrementalLearning) return false;
    if (requiredCapabilities.supportsOnlineLearning && !caps.supportsOnlineLearning) return false;
    if (requiredCapabilities.supportsMissingData && !caps.supportsMissingData) return false;
    if (
      requiredCapabilities.maxHorizonDays &&
      caps.maxHorizonDays &&
      caps.maxHorizonDays < requiredCapabilities.maxHorizonDays
    ) {
      return false;
    }
    return true;
  });
}
