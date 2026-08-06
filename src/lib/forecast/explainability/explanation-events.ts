/**
 * Explanation Event Manager
 * Milestone 5 - Forecastify XAI
 */

import { explanationCacheInvalidator } from './explanation-cache-invalidator';

export type ExplanationEventType =
  | 'explanation.generated'
  | 'explanation.updated'
  | 'counterfactual.generated'
  | 'forecast.generated'
  | 'recommendation.generated'
  | 'recommendation.executed';

export interface ExplanationEventPayload {
  explanationId?: string;
  predictionId?: string;
  recommendationId?: string;
  storeId?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

type EventListener = (payload: ExplanationEventPayload) => void;

export class ExplanationEventManager {
  private listeners: Map<ExplanationEventType, EventListener[]> = new Map();

  constructor() {
    // Auto subscribe internal invalidation listeners
    this.subscribe('forecast.generated', (p) => explanationCacheInvalidator.handleInvalidationEvent('forecast.generated', p));
    this.subscribe('recommendation.generated', (p) => explanationCacheInvalidator.handleInvalidationEvent('recommendation.generated', p));
    this.subscribe('recommendation.executed', (p) => explanationCacheInvalidator.handleInvalidationEvent('recommendation.executed', p));
  }

  public subscribe(eventType: ExplanationEventType, listener: EventListener): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(listener);
  }

  public publish(eventType: ExplanationEventType, payload: ExplanationEventPayload): void {
    const handlers = this.listeners.get(eventType) || [];
    handlers.forEach((fn) => {
      try {
        fn(payload);
      } catch {
        // Safe listener execution
      }
    });
  }
}

export const explanationEventManager = new ExplanationEventManager();
