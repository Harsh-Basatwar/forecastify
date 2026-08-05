/**
 * Forecast Engine 2.0 Domain Events & Bus Helper
 */

import { createClient } from '@supabase/supabase-js';

export interface ForecastDomainEvent {
  eventType:
    | 'forecast.generated'
    | 'forecast.updated'
    | 'recommendation.created'
    | 'model.retrained'
    | 'stockout.predicted'
    | 'expiry.predicted';
  storeId: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export class ForecastEventBus {
  public static async publish(event: ForecastDomainEvent): Promise<void> {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      const supabase = createClient(url, key);

      await supabase.from('external_events').insert({
        store_id: event.storeId,
        event_type: event.eventType,
        title: `Forecast Event: ${event.eventType}`,
        description: `Domain event ${event.eventType} emitted for store ${event.storeId}`,
        event_date: event.timestamp || new Date().toISOString(),
        metadata: event.payload,
      });
    } catch (err: unknown) {
      console.warn('[ForecastEventBus] Error publishing domain event:', err);
    }
  }
}
