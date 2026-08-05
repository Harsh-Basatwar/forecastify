/**
 * TomorrowIOProvider plugin adapter
 */

import { IWeatherProvider, WeatherData } from './weather-provider.interface';
import { MockWeatherProvider } from './mock-weather.provider';

export class TomorrowIOProvider implements IWeatherProvider {
  public readonly providerName = 'TomorrowIOProvider';
  private fallback = new MockWeatherProvider();

  constructor(private apiKey?: string) {}

  public async getWeatherData(storeId: string, date: string): Promise<WeatherData> {
    if (!this.apiKey && !process.env.TOMORROW_IO_API_KEY) {
      return this.fallback.getWeatherData(storeId, date);
    }
    return this.fallback.getWeatherData(storeId, date);
  }
}
