export function calculateMAPE(actuals: number[], predictions: number[]): number {
  if (!actuals.length || actuals.length !== predictions.length) return 0;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < actuals.length; i++) {
    if (actuals[i] !== 0) {
      sum += Math.abs((actuals[i] - predictions[i]) / actuals[i]);
      count++;
    }
  }
  return count > 0 ? (sum / count) * 100 : 0;
}
