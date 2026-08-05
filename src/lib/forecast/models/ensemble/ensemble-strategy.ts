export interface IEnsembleStrategy {
  readonly name: string;
  combine(predictionsList: number[][], weights?: number[]): number[];
}

export class SimpleAverageStrategy implements IEnsembleStrategy {
  public readonly name = 'SimpleAverage';

  public combine(predictionsList: number[][]): number[] {
    if (!predictionsList.length || !predictionsList[0].length) return [];
    const numPoints = predictionsList[0].length;
    const numModels = predictionsList.length;
    const result: number[] = new Array(numPoints).fill(0);

    for (let p = 0; p < numPoints; p++) {
      let sum = 0;
      for (let m = 0; m < numModels; m++) {
        sum += predictionsList[m][p] || 0;
      }
      result[p] = sum / numModels;
    }
    return result;
  }
}

export class WeightedAverageStrategy implements IEnsembleStrategy {
  public readonly name = 'WeightedAverage';

  public combine(predictionsList: number[][], weights?: number[]): number[] {
    if (!predictionsList.length || !predictionsList[0].length) return [];
    const numPoints = predictionsList[0].length;
    const numModels = predictionsList.length;

    const normalizedWeights =
      weights && weights.length === numModels
        ? weights.map((w) => w / weights.reduce((a, b) => a + b, 0))
        : new Array(numModels).fill(1 / numModels);

    const result: number[] = new Array(numPoints).fill(0);
    for (let p = 0; p < numPoints; p++) {
      let sum = 0;
      for (let m = 0; m < numModels; m++) {
        sum += (predictionsList[m][p] || 0) * normalizedWeights[m];
      }
      result[p] = sum;
    }
    return result;
  }
}

export class MedianStrategy implements IEnsembleStrategy {
  public readonly name = 'Median';

  public combine(predictionsList: number[][]): number[] {
    if (!predictionsList.length || !predictionsList[0].length) return [];
    const numPoints = predictionsList[0].length;
    const numModels = predictionsList.length;
    const result: number[] = new Array(numPoints).fill(0);

    for (let p = 0; p < numPoints; p++) {
      const values: number[] = [];
      for (let m = 0; m < numModels; m++) {
        values.push(predictionsList[m][p] || 0);
      }
      values.sort((a, b) => a - b);
      const mid = Math.floor(values.length / 2);
      if (values.length % 2 === 0) {
        result[p] = (values[mid - 1] + values[mid]) / 2;
      } else {
        result[p] = values[mid];
      }
    }
    return result;
  }
}

export class VotingStrategy implements IEnsembleStrategy {
  public readonly name = 'Voting';

  public combine(predictionsList: number[][]): number[] {
    // Mode / Voting strategy for rounded predictions
    const averageStrategy = new SimpleAverageStrategy();
    const averaged = averageStrategy.combine(predictionsList);
    return averaged.map((val) => Math.round(val));
  }
}

export class StackingStrategy implements IEnsembleStrategy {
  public readonly name = 'Stacking';

  public combine(predictionsList: number[][], weights?: number[]): number[] {
    // Stacking meta-regressor stub using linear meta-weights
    const weighted = new WeightedAverageStrategy();
    return weighted.combine(predictionsList, weights);
  }
}
