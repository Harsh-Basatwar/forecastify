export function calculateCoverageProbability(
  actuals: number[],
  lowerBounds: number[],
  upperBounds: number[]
): number {
  if (!actuals.length || actuals.length !== lowerBounds.length || actuals.length !== upperBounds.length) {
    return 0;
  }
  let covered = 0;
  for (let i = 0; i < actuals.length; i++) {
    if (actuals[i] >= lowerBounds[i] && actuals[i] <= upperBounds[i]) {
      covered++;
    }
  }
  return covered / actuals.length;
}
