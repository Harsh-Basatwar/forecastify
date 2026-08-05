export function calculateWAPE(actuals: number[], predictions: number[]): number {
  if (!actuals.length || actuals.length !== predictions.length) return 0;
  let absDiffSum = 0;
  let actualSum = 0;
  for (let i = 0; i < actuals.length; i++) {
    absDiffSum += Math.abs(actuals[i] - predictions[i]);
    actualSum += Math.abs(actuals[i]);
  }
  return actualSum > 0 ? (absDiffSum / actualSum) * 100 : 0;
}
