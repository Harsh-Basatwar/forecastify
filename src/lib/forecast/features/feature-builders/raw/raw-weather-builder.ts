/**
 * Raw Weather Feature Builder (Pluggable IWeatherProvider adapter)
 */

import {
  IFeatureBuilder,
  FeatureBuildContext,
  FeatureBuildResult,
  ModelCompatibility,
} from '../../feature-types';
import { FeatureLineageTracker } from '../../feature-lineage';
import { IWeatherProvider } from '../../providers/weather-provider.interface';
import { MockWeatherProvider } from '../../providers/mock-weather.provider';

export class RawWeatherFeatureBuilder implements IFeatureBuilder {
  public readonly name = 'RawWeatherFeatureBuilder';
  public readonly version = '1.0.0';
  public readonly stage = 'raw' as const;
  public readonly dependencies: string[] = [];
  public readonly compatibility: ModelCompatibility[] = ['All Models'];

  private provider: IWeatherProvider;

  constructor(provider?: IWeatherProvider) {
    this.provider = provider || new MockWeatherProvider();
  }

  public async build(context: FeatureBuildContext): Promise<FeatureBuildResult> {
    let weatherData = context.rawInput.weather;
    if (!weatherData) {
      weatherData = await this.provider.getWeatherData(context.storeId, context.targetDate);
    }

    const features = {
      raw_temperature_celsius: weatherData.temperatureCelsius,
      raw_humidity_percentage: weatherData.humidityPercentage,
      raw_rainfall_mm: weatherData.rainfallMm,
      raw_weather_category: weatherData.weatherCategory,
      raw_heat_index: weatherData.heatIndex,
    };

    const lineage = {
      raw_temperature_celsius: FeatureLineageTracker.createLineage('raw_temperature_celsius', 'external_weather', 'temperature', this.name, this.version),
      raw_rainfall_mm: FeatureLineageTracker.createLineage('raw_rainfall_mm', 'external_weather', 'precipitation', this.name, this.version),
    };

    return { features, lineage };
  }
}
