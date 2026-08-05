export function calculateMAE(actuals: number[], predictions: number[]): number {
  if (!actuals.length || actuals.length !== predictions.length) return 0;
  let sum = 0;
  for (let i = 0; i < actuals.length; i++) {
    sum += Math.abs(actuals[i] - predictions[i]);
  }
  return sum / actuals.length;
}
