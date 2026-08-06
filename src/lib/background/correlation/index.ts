/**
 * Correlation Manager
 * Generates and tracks correlation IDs across API, Worker, Queue, Notification, and Audit.
 */

export class CorrelationManager {
  public generateCorrelationId(prefix = "corr"): string {
    const randomHex = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${Date.now()}_${randomHex}`;
  }
}

export const correlationManager = new CorrelationManager();
