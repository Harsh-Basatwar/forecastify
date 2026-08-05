import { IForecastModel, ModelArtifact } from '../interfaces';
import {
  NaiveForecastModel,
  MovingAverageForecastModel,
  LinearRegressionForecastModel,
  RandomForestForecastModel,
  XGBoostForecastModel,
  LightGBMForecastModel,
  ProphetForecastModel,
  LSTMForecastModel,
  TransformerForecastModel,
  EnsembleForecastModel,
} from '../models';

export class ModelLoader {
  public static createInstance(modelType: string, id?: string): IForecastModel {
    switch (modelType.toLowerCase()) {
      case 'naive':
        return new NaiveForecastModel(id);
      case 'moving_average':
        return new MovingAverageForecastModel(id);
      case 'linear_regression':
        return new LinearRegressionForecastModel(id);
      case 'random_forest':
        return new RandomForestForecastModel(id);
      case 'xgboost':
        return new XGBoostForecastModel(id);
      case 'lightgbm':
        return new LightGBMForecastModel(id);
      case 'prophet':
        return new ProphetForecastModel(id);
      case 'lstm':
        return new LSTMForecastModel(id);
      case 'transformer':
        return new TransformerForecastModel(id);
      case 'ensemble':
        return new EnsembleForecastModel(id);
      default:
        return new NaiveForecastModel(id);
    }
  }

  public static async loadFromArtifact(modelType: string, artifact: ModelArtifact): Promise<IForecastModel> {
    const model = this.createInstance(modelType, artifact.modelId);
    await model.load(artifact);
    return model;
  }
}
