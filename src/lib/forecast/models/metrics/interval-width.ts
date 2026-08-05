export function calculateIntervalWidth(lowerBounds: number[], upperBounds: number[]): number {
  if (!lowerBounds.length || lowerBounds.length !== upperBounds.length) return 0;
  let sum = 0;
  for (let i = 0; i < lowerBounds.length; i++) {
    sum += Math.abs(upperBounds[i] - lowerBounds[i]);
  }
  return sum / lowerBounds.length;
}
