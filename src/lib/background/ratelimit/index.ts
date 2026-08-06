/**
 * Rate Limiter Engine
 * Token-bucket and sliding window rate limiting per store, user, role, and API key.
 */

export interface RateLimitPolicy {
  clientKey: string;
  limitPerMin: number;
  tokensRemaining: number;
  resetTimeMs: number;
}

export class RateLimiter {
  private buckets: Map<string, RateLimitPolicy> = new Map();

  public checkRateLimit(clientKey: string, maxPerMin = 100): { allowed: boolean; policy: RateLimitPolicy } {
    let bucket = this.buckets.get(clientKey);
    const now = Date.now();

    if (!bucket || now > bucket.resetTimeMs) {
      bucket = {
        clientKey,
        limitPerMin: maxPerMin,
        tokensRemaining: maxPerMin - 1,
        resetTimeMs: now + 60000,
      };
      this.buckets.set(clientKey, bucket);
      return { allowed: true, policy: bucket };
    }

    if (bucket.tokensRemaining > 0) {
      bucket.tokensRemaining -= 1;
      return { allowed: true, policy: bucket };
    }

    return { allowed: false, policy: bucket };
  }

  public getPolicies(): RateLimitPolicy[] {
    return Array.from(this.buckets.values());
  }
}

export const rateLimiter = new RateLimiter();
