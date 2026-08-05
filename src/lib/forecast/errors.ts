/**
 * Forecast Engine 2.0 Custom Exception Hierarchy
 */

export class ForecastDomainError extends Error {
  constructor(message: string, public readonly code: string = 'FORECAST_DOMAIN_ERROR', public readonly statusCode: number = 500) {
    super(message);
    this.name = 'ForecastDomainError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ModelNotFoundError extends ForecastDomainError {
  constructor(modelId: string) {
    super(`Forecast model not found: ${modelId}`, 'MODEL_NOT_FOUND', 404);
    this.name = 'ModelNotFoundError';
  }
}

export class PredictionNotFoundError extends ForecastDomainError {
  constructor(predictionId: string) {
    super(`Forecast prediction not found: ${predictionId}`, 'PREDICTION_NOT_FOUND', 404);
    this.name = 'PredictionNotFoundError';
  }
}

export class ForecastCacheError extends ForecastDomainError {
  constructor(message: string) {
    super(`Forecast cache error: ${message}`, 'CACHE_ERROR', 500);
    this.name = 'ForecastCacheError';
  }
}

export class SchedulerError extends ForecastDomainError {
  constructor(message: string) {
    super(`Forecast scheduler error: ${message}`, 'SCHEDULER_ERROR', 500);
    this.name = 'SchedulerError';
  }
}

export class ForecastValidationError extends ForecastDomainError {
  constructor(message: string) {
    super(`Forecast validation error: ${message}`, 'VALIDATION_ERROR', 400);
    this.name = 'ForecastValidationError';
  }
}
