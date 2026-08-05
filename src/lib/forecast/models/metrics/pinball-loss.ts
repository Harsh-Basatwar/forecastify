export function calculatePinballLoss(
  actuals: number[],
  predictions: number[],
  quantile: number = 0.5
): number {
  if (!actuals.length || actuals.length !== predictions.length) return 0;
  let sum = 0;
  for (let i = 0; i < actuals.length; i++) {
    const error = actuals[i] - predictions[i];
    sum += Math.max(quantile * error, (quantile - 1) * error);
  }
  return sum / actuals.length;
}
