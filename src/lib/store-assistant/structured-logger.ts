/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Enterprise Structured Logger
 * Emits JSON telemetry events with trace IDs, correlation IDs, execution durations, and error details.
 */

export interface LogEvent {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  storeId?: string;
  userId?: string;
  action: string;
  durationMs?: number;
  status: 'success' | 'failure' | 'in_progress';
  error?: string;
  traceId?: string;
  metadata?: Record<string, any>;
}

export class StructuredLogger {
  private generateTraceId(): string {
    return `tr_${Math.random().toString(36).substring(2, 10)}`;
  }

  log(event: Omit<LogEvent, 'timestamp'>): LogEvent {
    const fullLog: LogEvent = {
      timestamp: new Date().toISOString(),
      traceId: event.traceId || this.generateTraceId(),
      ...event,
    };

    if (process.env.NODE_ENV !== 'test') {
      console.log(JSON.stringify(fullLog));
    }
    return fullLog;
  }

  info(action: string, metadata?: Record<string, any>, storeId?: string, userId?: string): LogEvent {
    return this.log({ level: 'info', action, status: 'success', metadata, storeId, userId });
  }

  error(action: string, error: unknown, storeId?: string, userId?: string): LogEvent {
    const errMessage = error instanceof Error ? error.message : String(error);
    return this.log({ level: 'error', action, status: 'failure', error: errMessage, storeId, userId });
  }
}

export const logger = new StructuredLogger();
