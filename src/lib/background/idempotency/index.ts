/**
 * Idempotency Engine
 * Execution hashing, idempotency key validation, duplicate detection, and replay protection.
 */

export interface IdempotencyEntry {
  key: string;
  executionHash: string;
  status: "IN_PROGRESS" | "COMPLETED";
  responsePayload?: Record<string, any>;
  createdAt: string;
}

export class IdempotencyEngine {
  private cache: Map<string, IdempotencyEntry> = new Map();

  public checkAndClaim(key: string, payload: Record<string, any>): { isDuplicate: boolean; entry?: IdempotencyEntry } {
    const existing = this.cache.get(key);
    if (existing) {
      return { isDuplicate: true, entry: existing };
    }

    const hash = JSON.stringify(payload);
    const entry: IdempotencyEntry = {
      key,
      executionHash: hash,
      status: "IN_PROGRESS",
      createdAt: new Date().toISOString(),
    };
    this.cache.set(key, entry);
    return { isDuplicate: false, entry };
  }

  public complete(key: string, responsePayload: Record<string, any>) {
    const entry = this.cache.get(key);
    if (entry) {
      entry.status = "COMPLETED";
      entry.responsePayload = responsePayload;
    }
  }
}

export const idempotencyEngine = new IdempotencyEngine();
