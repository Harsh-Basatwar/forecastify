/**
 * Enterprise Event Bus
 * Pub/Sub event router supporting system-wide asynchronous communications.
 */

export type SystemEventType =
  | "forecast.generated"
  | "forecast.failed"
  | "features.refreshed"
  | "model.training.started"
  | "model.training.completed"
  | "model.deployed"
  | "model.rollback"
  | "recommendations.generated"
  | "recommendation.executed"
  | "recommendation.expired"
  | "explanation.generated"
  | "cache.invalidated"
  | "health.changed"
  | "worker.started"
  | "worker.failed"
  | "job.completed"
  | "job.failed"
  | "drift.detected"
  | "notification.sent"
  | "workflow.started"
  | "workflow.completed"
  | "workflow.failed"
  | "sla.breached";

export interface SystemEventPayload {
  id: string;
  eventType: SystemEventType;
  payload: Record<string, any>;
  correlationId?: string;
  traceId?: string;
  storeId?: string;
  createdAt: string;
}

type EventHandler = (event: SystemEventPayload) => Promise<void> | void;

class EnterpriseEventBus {
  private handlers: Map<SystemEventType, Set<EventHandler>> = new Map();
  private eventHistory: SystemEventPayload[] = [];

  public subscribe(eventType: SystemEventType, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }

  public async publish(
    eventType: SystemEventType,
    payload: Record<string, any>,
    options?: { correlationId?: string; traceId?: string; storeId?: string }
  ): Promise<SystemEventPayload> {
    const event: SystemEventPayload = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      eventType,
      payload,
      correlationId: options?.correlationId,
      traceId: options?.traceId,
      storeId: options?.storeId,
      createdAt: new Date().toISOString(),
    };

    this.eventHistory.unshift(event);
    if (this.eventHistory.length > 500) {
      this.eventHistory.pop();
    }

    const listeners = this.handlers.get(eventType);
    if (listeners) {
      for (const listener of listeners) {
        try {
          await listener(event);
        } catch (err) {
          console.error(`[EventBus] Handler error for ${eventType}:`, err);
        }
      }
    }

    return event;
  }

  public getHistory(filterType?: SystemEventType): SystemEventPayload[] {
    if (filterType) {
      return this.eventHistory.filter((e) => e.eventType === filterType);
    }
    return [...this.eventHistory];
  }

  public clearHistory(): void {
    this.eventHistory = [];
  }
}

export const eventBus = new EnterpriseEventBus();
