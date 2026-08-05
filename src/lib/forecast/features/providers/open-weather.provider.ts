/**
 * OpenWeatherProvider plugin adapter
 */

import { IWeatherProvider, WeatherData } from './weather-provider.interface';
import { MockWeatherProvider } from './mock-weather.provider';

export class OpenWeatherProvider implements IWeatherProvider {
  public readonly providerName = 'OpenWeatherProvider';
  private fallback = new MockWeatherProvider();

  constructor(private apiKey?: string) {}

  public async getWeatherData(storeId: string, date: string): Promise<WeatherData> {
    if (!this.apiKey && !process.env.OPENWEATHER_API_KEY) {
      return this.fallback.getWeatherData(storeId, date);
    }
    // API call logic can be connected here; returns fallback mock when key is unconfigured
    return this.fallback.getWeatherData(storeId, date);
  }
}
