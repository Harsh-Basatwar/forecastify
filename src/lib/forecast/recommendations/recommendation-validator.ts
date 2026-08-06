/**
 * Recommendation Validator
 * Validates payload structures and state transitions prior to persistence or execution.
 */

import { Recommendation, RecommendationStatus } from './recommendation-types';

export class RecommendationValidator {
  public validateStateTransition(currentStatus: RecommendationStatus, targetStatus: RecommendationStatus): boolean {
    const validTransitions: Record<RecommendationStatus, RecommendationStatus[]> = {
      [RecommendationStatus.GENERATED]: [RecommendationStatus.REVIEWED, RecommendationStatus.ACCEPTED, RecommendationStatus.REJECTED, RecommendationStatus.DISMISSED, RecommendationStatus.EXPIRED],
      [RecommendationStatus.REVIEWED]: [RecommendationStatus.ACCEPTED, RecommendationStatus.REJECTED, RecommendationStatus.DISMISSED, RecommendationStatus.CANCELLED],
      [RecommendationStatus.ACCEPTED]: [RecommendationStatus.SCHEDULED, RecommendationStatus.EXECUTING, RecommendationStatus.CANCELLED],
      [RecommendationStatus.SCHEDULED]: [RecommendationStatus.EXECUTING, RecommendationStatus.CANCELLED],
      [RecommendationStatus.EXECUTING]: [RecommendationStatus.EXECUTED, RecommendationStatus.CANCELLED],
      [RecommendationStatus.EXECUTED]: [RecommendationStatus.VERIFIED, RecommendationStatus.CLOSED],
      [RecommendationStatus.VERIFIED]: [RecommendationStatus.CLOSED],
      [RecommendationStatus.CLOSED]: [],
      [RecommendationStatus.EXPIRED]: [],
      [RecommendationStatus.CANCELLED]: [],
      [RecommendationStatus.REJECTED]: [],
      [RecommendationStatus.DISMISSED]: [],
    };

    return validTransitions[currentStatus]?.includes(targetStatus) ?? false;
  }

  public validateRecommendationPayload(rec: Partial<Recommendation>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!rec.storeId) errors.push('Missing required storeId');
    if (!rec.type) errors.push('Missing required type');
    if (!rec.category) errors.push('Missing required category');
    if (rec.confidence === undefined || rec.confidence < 0 || rec.confidence > 1) {
      errors.push('Confidence must be between 0 and 1');
    }
    return { valid: errors.length === 0, errors };
  }
}
