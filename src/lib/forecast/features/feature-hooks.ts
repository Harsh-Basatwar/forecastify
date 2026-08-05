/**
 * Pipeline Lifecycle Hooks definition & manager
 */

import { ForecastFeatureVector, FeatureValidationResult } from './feature-types';

export interface PipelineHooks {
  beforeValidation?: (vector: ForecastFeatureVector) => Promise<void> | void;
  afterValidation?: (vector: ForecastFeatureVector, validation: FeatureValidationResult) => Promise<void> | void;
  beforeNormalization?: (vector: ForecastFeatureVector) => Promise<void> | void;
  afterNormalization?: (vector: ForecastFeatureVector) => Promise<void> | void;
  beforeSave?: (vector: ForecastFeatureVector) => Promise<void> | void;
  afterSave?: (vector: ForecastFeatureVector) => Promise<void> | void;
}

export class PipelineHookManager {
  private hooks: PipelineHooks = {};

  constructor(hooks?: PipelineHooks) {
    if (hooks) {
      this.hooks = hooks;
    }
  }

  public registerHooks(hooks: PipelineHooks): void {
    this.hooks = { ...this.hooks, ...hooks };
  }

  public async triggerBeforeValidation(vector: ForecastFeatureVector): Promise<void> {
    if (this.hooks.beforeValidation) {
      await this.hooks.beforeValidation(vector);
    }
  }

  public async triggerAfterValidation(vector: ForecastFeatureVector, validation: FeatureValidationResult): Promise<void> {
    if (this.hooks.afterValidation) {
      await this.hooks.afterValidation(vector, validation);
    }
  }

  public async triggerBeforeNormalization(vector: ForecastFeatureVector): Promise<void> {
    if (this.hooks.beforeNormalization) {
      await this.hooks.beforeNormalization(vector);
    }
  }

  public async triggerAfterNormalization(vector: ForecastFeatureVector): Promise<void> {
    if (this.hooks.afterNormalization) {
      await this.hooks.afterNormalization(vector);
    }
  }

  public async triggerBeforeSave(vector: ForecastFeatureVector): Promise<void> {
    if (this.hooks.beforeSave) {
      await this.hooks.beforeSave(vector);
    }
  }

  public async triggerAfterSave(vector: ForecastFeatureVector): Promise<void> {
    if (this.hooks.afterSave) {
      await this.hooks.afterSave(vector);
    }
  }
}
