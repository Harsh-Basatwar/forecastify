export function calculateRMSE(actuals: number[], predictions: number[]): number {
  if (!actuals.length || actuals.length !== predictions.length) return 0;
  let sum = 0;
  for (let i = 0; i < actuals.length; i++) {
    const diff = actuals[i] - predictions[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum / actuals.length);
}
