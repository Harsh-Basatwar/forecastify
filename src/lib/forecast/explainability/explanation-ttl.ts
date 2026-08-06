/**
 * Explanation TTL Manager
 * Milestone 5 - Forecastify XAI
 */

export class ExplanationTTLManager {
  private defaultTTLHours = 24;

  public calculateTTLExpiration(ttlHours?: number): string {
    const hours = ttlHours || this.defaultTTLHours;
    const now = new Date();
    now.setHours(now.getHours() + hours);
    return now.toISOString();
  }

  public isExpired(ttlExpiresAt?: string): boolean {
    if (!ttlExpiresAt) return false;
    return new Date(ttlExpiresAt).getTime() < Date.now();
  }
}

export const explanationTTLManager = new ExplanationTTLManager();
