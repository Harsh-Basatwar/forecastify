/**
 * Forecast Context Value Object
 */

import { ForecastHorizon } from './constants';
import { ForecastConfig } from './forecast-config';

export interface ForecastContextProps {
  storeId: string;
  timezone?: string;
  currency?: string;
  horizon?: ForecastHorizon;
  config?: ForecastConfig;
  locale?: string;
}

export class ForecastContext {
  public readonly storeId: string;
  public readonly timezone: string;
  public readonly currency: string;
  public readonly horizon: ForecastHorizon;
  public readonly config: ForecastConfig;
  public readonly locale: string;

  constructor(props: ForecastContextProps) {
    this.storeId = props.storeId;
    this.timezone = props.timezone || 'Asia/Kolkata';
    this.currency = props.currency || 'INR';
    this.horizon = props.horizon || '7d';
    this.config = props.config || ForecastConfig.defaultConfig(props.storeId);
    this.locale = props.locale || 'en-IN';
  }

  public toJSON(): Record<string, unknown> {
    return {
      storeId: this.storeId,
      timezone: this.timezone,
      currency: this.currency,
      horizon: this.horizon,
      config: this.config.toJSON(),
      locale: this.locale,
    };
  }
}
