export function calculateR2(actuals: number[], predictions: number[]): number {
  if (!actuals.length || actuals.length !== predictions.length) return 0;
  const meanActual = actuals.reduce((acc, val) => acc + val, 0) / actuals.length;
  
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < actuals.length; i++) {
    ssTot += Math.pow(actuals[i] - meanActual, 2);
    ssRes += Math.pow(actuals[i] - predictions[i], 2);
  }
  
  if (ssTot === 0) return ssRes === 0 ? 1 : 0;
  return 1 - ssRes / ssTot;
}
