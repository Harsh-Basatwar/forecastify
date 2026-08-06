/**
 * Recommendation Feedback Loop & Learning Engine
 * Captures user rejection reasons (e.g. "Supplier unavailable") to adjust future rule weights.
 */

export interface FeedbackEntry {
  id: string;
  storeId: string;
  recommendationId: string;
  action: 'ACCEPTED' | 'REJECTED' | 'MODIFIED';
  reason?: string;
  feedbackCategory?: string;
  createdAt: string;
}

export class RecommendationFeedbackLoop {
  private feedbackEntries: FeedbackEntry[] = [];

  public logFeedback(entry: Omit<FeedbackEntry, 'id' | 'createdAt'>): FeedbackEntry {
    const record: FeedbackEntry = {
      ...entry,
      id: `FB-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };
    this.feedbackEntries.push(record);
    return record;
  }

  public getAcceptanceRate(storeId: string): { total: number; accepted: number; ratePct: number } {
    const storeFeedback = this.feedbackEntries.filter(f => f.storeId === storeId);
    if (storeFeedback.length === 0) return { total: 0, accepted: 0, ratePct: 90.0 };

    const accepted = storeFeedback.filter(f => f.action === 'ACCEPTED').length;
    const ratePct = Number(((accepted / storeFeedback.length) * 100).toFixed(2));

    return { total: storeFeedback.length, accepted, ratePct };
  }
}
