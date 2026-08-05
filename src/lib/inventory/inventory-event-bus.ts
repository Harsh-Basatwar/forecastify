import { createClient } from "@supabase/supabase-js";
import { DomainInventoryEvent } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export class InventoryEventBus {
  /**
   * Emits a structured domain event to the database log for Jarvis AI,
   * forecasting algorithms, and real-time dashboard listeners.
   */
  public static async emit(eventData: DomainInventoryEvent): Promise<void> {
    try {
      // Store in external_events table for structured domain event consumers
      const { error } = await supabase.from("external_events").insert({
        store_id: eventData.store_id,
        event_type: eventData.event,
        title: `Inventory Event: ${eventData.event}`,
        description: `Product: ${eventData.product_name}, Quantity: ${eventData.quantity}, Reason: ${eventData.reason}`,
        event_date: eventData.timestamp || new Date().toISOString(),
        metadata: {
          product_id: eventData.product_id,
          sku: eventData.sku,
          batch_number: eventData.batch_number,
          user_id: eventData.user_id,
          ...eventData.metadata,
        },
      });

      if (error) {
        console.warn("[InventoryEventBus] Warning inserting event:", error.message);
      }
    } catch (err) {
      console.error("[InventoryEventBus] Error publishing event:", err);
    }
  }
}
