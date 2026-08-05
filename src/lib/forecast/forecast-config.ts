/**
 * Forecast Configuration Domain Object
 */

import { ForecastHorizon, ModelType, DEFAULT_FORECAST_CONFIG } from './constants';
import { ForecastSettings } from './types';

export class ForecastConfig {
  constructor(
    public readonly storeId: string,
    public readonly forecastHorizon: ForecastHorizon = DEFAULT_FORECAST_CONFIG.forecastHorizon,
    public readonly preferredModel: ModelType = DEFAULT_FORECAST_CONFIG.preferredModel,
    public readonly predictionFrequency: 'hourly' | 'daily' | 'weekly' = DEFAULT_FORECAST_CONFIG.predictionFrequency,
    public readonly weatherEnabled: boolean = DEFAULT_FORECAST_CONFIG.weatherEnabled,
    public readonly festivalEnabled: boolean = DEFAULT_FORECAST_CONFIG.festivalEnabled,
    public readonly supplierSignalsEnabled: boolean = DEFAULT_FORECAST_CONFIG.supplierSignalsEnabled,
    public readonly recommendationEnabled: boolean = DEFAULT_FORECAST_CONFIG.recommendationEnabled,
    public readonly safetyStockMultiplier: number = DEFAULT_FORECAST_CONFIG.safetyStockMultiplier,
    public readonly confidenceThreshold: number = DEFAULT_FORECAST_CONFIG.confidenceThreshold,
    public readonly retrainingFrequency: 'daily' | 'weekly' | 'monthly' = DEFAULT_FORECAST_CONFIG.retrainingFrequency,
    public readonly cacheTtlSeconds: number = DEFAULT_FORECAST_CONFIG.cacheTtlSeconds
  ) {}

  public static defaultConfig(storeId: string): ForecastConfig {
    return new ForecastConfig(storeId);
  }

  public static fromSettings(settings: ForecastSettings): ForecastConfig {
    return new ForecastConfig(
      settings.storeId,
      settings.forecastHorizon,
      settings.preferredModel,
      settings.predictionFrequency,
      settings.weatherEnabled,
      settings.festivalEnabled,
      settings.supplierSignalsEnabled,
      settings.recommendationEnabled,
      settings.safetyStockMultiplier,
      settings.confidenceThreshold,
      settings.retrainingFrequency,
      settings.cacheTtlSeconds
    );
  }

  public toSettings(): ForecastSettings {
    return {
      storeId: this.storeId,
      forecastHorizon: this.forecastHorizon,
      preferredModel: this.preferredModel,
      predictionFrequency: this.predictionFrequency,
      weatherEnabled: this.weatherEnabled,
      festivalEnabled: this.festivalEnabled,
      supplierSignalsEnabled: this.supplierSignalsEnabled,
      recommendationEnabled: this.recommendationEnabled,
      safetyStockMultiplier: this.safetyStockMultiplier,
      confidenceThreshold: this.confidenceThreshold,
      retrainingFrequency: this.retrainingFrequency,
      cacheTtlSeconds: this.cacheTtlSeconds,
    };
  }

  public toJSON(): Record<string, unknown> {
    return {
      storeId: this.storeId,
      forecastHorizon: this.forecastHorizon,
      preferredModel: this.preferredModel,
      predictionFrequency: this.predictionFrequency,
      weatherEnabled: this.weatherEnabled,
      festivalEnabled: this.festivalEnabled,
      supplierSignalsEnabled: this.supplierSignalsEnabled,
      recommendationEnabled: this.recommendationEnabled,
      safetyStockMultiplier: this.safetyStockMultiplier,
      confidenceThreshold: this.confidenceThreshold,
      retrainingFrequency: this.retrainingFrequency,
      cacheTtlSeconds: this.cacheTtlSeconds,
    };
  }
}
