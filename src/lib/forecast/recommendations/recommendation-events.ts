/**
 * Recommendation Events Bus
 * Publishes recommendation lifecycle events (recommendation.created, recommendation.executed, etc.)
 * and subscribes to platform triggers (forecast.generated, inventory.updated).
 */

type EventHandler = (payload: any) => void | Promise<void>;

export class RecommendationEventBus {
  private handlers = new Map<string, EventHandler[]>();

  public publish(event: string, payload: any): void {
    console.info(`[RecommendationEventBus] Event Published: ${event}`);
    const list = this.handlers.get(event) || [];
    for (const fn of list) {
      try {
        fn(payload);
      } catch (err) {
        console.warn(`[RecommendationEventBus] Handler error on ${event}:`, err);
      }
    }
  }

  public subscribe(event: string, handler: EventHandler): () => void {
    const list = this.handlers.get(event) || [];
    list.push(handler);
    this.handlers.set(event, list);

    return () => {
      const current = this.handlers.get(event) || [];
      this.handlers.set(event, current.filter(h => h !== handler));
    };
  }
}
