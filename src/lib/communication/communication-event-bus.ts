/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * CommunicationEventBus — Decoupled Publish/Subscribe Event Bus
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export type CommunicationEventType =
  | 'message.received'
  | 'message.sent'
  | 'message.delivered'
  | 'message.failed'
  | 'workflow.state_changed'
  | 'ai.action_proposed'
  | 'ai.action_executed'
  | 'job.dead_lettered';

export interface CommunicationEvent {
  eventType: CommunicationEventType;
  source: string;
  payload: Record<string, any>;
  timestamp?: string;
}

type EventHandler = (event: CommunicationEvent) => Promise<void>;

class CommunicationEventBus {
  private handlers: Map<CommunicationEventType, EventHandler[]> = new Map();

  constructor() {
    this.registerDefaultHandlers();
  }

  /** Subscribe a handler function to an event type */
  subscribe(eventType: CommunicationEventType, handler: EventHandler): void {
    const list = this.handlers.get(eventType) || [];
    list.push(handler);
    this.handlers.set(eventType, list);
  }

  /** Publish an event to DB log and in-memory listeners */
  async publish(event: CommunicationEvent): Promise<void> {
    const timestamp = event.timestamp || new Date().toISOString();
    const eventData = { ...event, timestamp };

    // 1. Log to communication_events table in Supabase asynchronously
    try {
      await supabase.from('communication_events').insert({
        event_type: event.eventType,
        source: event.source,
        payload: event.payload,
        processed_handlers: Array.from(this.handlers.keys()),
      });
    } catch (err) {
      console.error('[CommunicationEventBus] DB publish error:', err);
    }

    // 2. Dispatch to in-memory registered handlers
    const registered = this.handlers.get(event.eventType) || [];
    for (const handler of registered) {
      try {
        await handler(eventData);
      } catch (err) {
        console.error(`[CommunicationEventBus] Handler error for ${event.eventType}:`, err);
      }
    }
  }

  /** Register baseline internal event handlers */
  private registerDefaultHandlers(): void {
    // Activity Logger Subscriber
    this.subscribe('ai.action_executed', async (event) => {
      try {
        await supabase.from('activity_logs').insert({
          action_type: 'COMMUNICATION_AI_EXECUTION',
          details: event.payload,
        });
      } catch (err) {
        // Fallback logger
      }
    });

    // Dead Letter Escalation Handler
    this.subscribe('job.dead_lettered', async (event) => {
      console.warn('[CommunicationEventBus] Dead Letter Job Triggered:', event.payload);
    });
  }
}

export const communicationEventBus = new CommunicationEventBus();
