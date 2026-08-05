/**
 * Mock Weather Provider implementation
 */

import { IWeatherProvider, WeatherData } from './weather-provider.interface';

export class MockWeatherProvider implements IWeatherProvider {
  public readonly providerName = 'MockWeatherProvider';

  public async getWeatherData(_storeId: string, date: string): Promise<WeatherData> {
    const d = new Date(date);
    const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000);
    
    // Deterministic synthetic weather generation based on day of year
    const temperatureCelsius = 20 + 10 * Math.sin((2 * Math.PI * dayOfYear) / 365);
    const humidityPercentage = 50 + 20 * Math.cos((2 * Math.PI * dayOfYear) / 365);
    const rainfallMm = (dayOfYear % 7 === 0) ? 12.5 : 0.0;
    const weatherCategory = rainfallMm > 5 ? 'Rainy' : temperatureCelsius > 28 ? 'Clear' : 'Cloudy';
    const heatIndex = temperatureCelsius + (humidityPercentage > 60 ? 2.5 : 0);

    return {
      temperatureCelsius: Math.round(temperatureCelsius * 10) / 10,
      humidityPercentage: Math.round(humidityPercentage * 10) / 10,
      rainfallMm,
      weatherCategory,
      heatIndex: Math.round(heatIndex * 10) / 10,
    };
  }
}
