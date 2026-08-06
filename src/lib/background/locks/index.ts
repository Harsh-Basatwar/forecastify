/**
 * Distributed Lock Manager
 * Prevents concurrent duplicate execution across workers on store/product resources with fencing tokens.
 */

export interface DistributedLock {
  lockKey: string;
  holderId: string;
  acquiredAt: string;
  expiresAt: string;
  fenceToken: number;
}

export class DistributedLockManager {
  private locks: Map<string, DistributedLock> = new Map();
  private fenceCounter = 100;

  constructor() {
    this.locks.set("lock:forecast:store-default", {
      lockKey: "lock:forecast:store-default",
      holderId: "worker_forecastworker_1",
      acquiredAt: new Date(Date.now() - 30000).toISOString(),
      expiresAt: new Date(Date.now() + 30000).toISOString(),
      fenceToken: 101,
    });
  }

  public acquire(lockKey: string, holderId: string, ttlMs = 30000): { acquired: boolean; fenceToken?: number } {
    const existing = this.locks.get(lockKey);
    const now = new Date();

    if (existing && new Date(existing.expiresAt) > now) {
      return { acquired: false };
    }

    this.fenceCounter += 1;
    const lock: DistributedLock = {
      lockKey,
      holderId,
      acquiredAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
      fenceToken: this.fenceCounter,
    };
    this.locks.set(lockKey, lock);
    return { acquired: true, fenceToken: lock.fenceToken };
  }

  public release(lockKey: string, holderId: string): boolean {
    const existing = this.locks.get(lockKey);
    if (existing && existing.holderId === holderId) {
      this.locks.delete(lockKey);
      return true;
    }
    return false;
  }

  public listLocks(): DistributedLock[] {
    return Array.from(this.locks.values());
  }
}

export const distributedLockManager = new DistributedLockManager();
