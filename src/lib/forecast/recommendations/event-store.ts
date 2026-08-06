/**
 * Event Store Engine
 * Immutable event sourcing stream capturing state transitions:
 * RecommendationCreated -> RecommendationReviewed -> RecommendationAccepted -> RecommendationScheduled -> RecommendationExecuting -> RecommendationExecuted -> RecommendationVerified.
 */

import { RecommendationEvent } from './recommendation-types';

export class RecommendationEventStore {
  private events: RecommendationEvent[] = [];

  public appendEvent(
    storeId: string,
    recommendationId: string,
    eventType: string,
    payload: Record<string, unknown> = {},
    actorId?: string
  ): RecommendationEvent {
    const event: RecommendationEvent = {
      id: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      storeId,
      recommendationId,
      eventType,
      payload,
      actorId,
      createdAt: new Date().toISOString(),
    };
    this.events.push(event);
    return event;
  }

  public getEventsForRecommendation(recommendationId: string): RecommendationEvent[] {
    return this.events.filter(e => e.recommendationId === recommendationId);
  }

  public getEventsForStore(storeId: string): RecommendationEvent[] {
    return this.events.filter(e => e.storeId === storeId);
  }
}
