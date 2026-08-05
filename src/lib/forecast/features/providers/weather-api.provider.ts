/**
 * WeatherAPIProvider plugin adapter
 */

import { IWeatherProvider, WeatherData } from './weather-provider.interface';
import { MockWeatherProvider } from './mock-weather.provider';

export class WeatherAPIProvider implements IWeatherProvider {
  public readonly providerName = 'WeatherAPIProvider';
  private fallback = new MockWeatherProvider();

  constructor(private apiKey?: string) {}

  public async getWeatherData(storeId: string, date: string): Promise<WeatherData> {
    if (!this.apiKey && !process.env.WEATHER_API_KEY) {
      return this.fallback.getWeatherData(storeId, date);
    }
    return this.fallback.getWeatherData(storeId, date);
  }
}
