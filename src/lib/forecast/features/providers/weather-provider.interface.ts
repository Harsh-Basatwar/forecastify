/**
 * Weather Provider Plugin Interface
 */

export interface WeatherData {
  temperatureCelsius: number;
  humidityPercentage: number;
  rainfallMm: number;
  weatherCategory: string; // 'Clear', 'Rainy', 'Cloudy', 'Stormy', 'Extreme'
  heatIndex: number;
}

export interface IWeatherProvider {
  readonly providerName: string;
  getWeatherData(storeId: string, date: string): Promise<WeatherData>;
}
