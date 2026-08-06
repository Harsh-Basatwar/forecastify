/**
 * Recovery Engine
 * Automatic retries, exponential backoff, circuit breaker, checkpoints, and graceful shutdown.
 */

export interface CircuitBreakerState {
  subsystem: string;
  state: "CLOSED" | "OPEN" | "HALF_OPEN";
  failureThreshold: number;
  failureCount: number;
  lastFailureTime?: string;
  resetTimeoutMs: number;
}

export class RecoveryEngine {
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();

  constructor() {
    const defaults = ["ForecastEngine", "FeatureStore", "RecommendationEngine", "ExplainabilityEngine", "Database"];
    defaults.forEach((s) => {
      this.circuitBreakers.set(s, {
        subsystem: s,
        state: "CLOSED",
        failureThreshold: 5,
        failureCount: 0,
        resetTimeoutMs: 30000,
      });
    });
  }

  public calculateExponentialBackoff(attempt: number, baseDelayMs = 1000, maxDelayMs = 60000): number {
    const exponential = Math.pow(2, attempt - 1) * baseDelayMs;
    const jitter = Math.random() * 0.2 * exponential;
    return Math.min(maxDelayMs, Math.floor(exponential + jitter));
  }

  public getCircuitBreaker(subsystem: string): CircuitBreakerState {
    let cb = this.circuitBreakers.get(subsystem);
    if (!cb) {
      cb = {
        subsystem,
        state: "CLOSED",
        failureThreshold: 5,
        failureCount: 0,
        resetTimeoutMs: 30000,
      };
      this.circuitBreakers.set(subsystem, cb);
    }
    return cb;
  }

  public recordFailure(subsystem: string): CircuitBreakerState {
    const cb = this.getCircuitBreaker(subsystem);
    cb.failureCount += 1;
    cb.lastFailureTime = new Date().toISOString();

    if (cb.failureCount >= cb.failureThreshold) {
      cb.state = "OPEN";
    }
    return cb;
  }

  public recordSuccess(subsystem: string): CircuitBreakerState {
    const cb = this.getCircuitBreaker(subsystem);
    cb.failureCount = 0;
    cb.state = "CLOSED";
    return cb;
  }

  public listCircuitBreakers(): CircuitBreakerState[] {
    return Array.from(this.circuitBreakers.values());
  }
}

export const recoveryEngine = new RecoveryEngine();
