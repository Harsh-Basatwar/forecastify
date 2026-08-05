export function calculateSMAPE(actuals: number[], predictions: number[]): number {
  if (!actuals.length || actuals.length !== predictions.length) return 0;
  let sum = 0;
  for (let i = 0; i < actuals.length; i++) {
    const denom = (Math.abs(actuals[i]) + Math.abs(predictions[i])) / 2;
    if (denom !== 0) {
      sum += Math.abs(predictions[i] - actuals[i]) / denom;
    }
  }
  return (sum / actuals.length) * 100;
}
