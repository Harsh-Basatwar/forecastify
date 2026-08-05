import { ProcurementEvent } from "./types";
import { InventoryEventBus } from "@/lib/inventory/inventory-event-bus";

export type ProcurementEventListener = (event: ProcurementEvent) => void | Promise<void>;

export class ProcurementEventBus {
  private static listeners: ProcurementEventListener[] = [];

  public static subscribe(listener: ProcurementEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public static async emit(event: ProcurementEvent): Promise<void> {
    // 1. Notify internal subscribers
    for (const listener of this.listeners) {
      try {
        await listener(event);
      } catch (err) {
        console.error("Error in ProcurementEventBus listener:", err);
      }
    }

    // 2. Cross-publish to InventoryEventBus for Jarvis AI & Analytics listeners
    try {
      await InventoryEventBus.emit({
        event: event.event as any,
        product_id: event.po_id || event.grn_id || "PROCUREMENT",
        product_name: `Procurement Event: ${event.event}`,
        quantity: event.details.total_amount || event.details.qty || 0,
        reason: event.details.reason || `Event ${event.event} recorded`,
        store_id: event.store_id,
        user_id: event.user_id,
        timestamp: event.timestamp,
        metadata: event.details,
      });
    } catch (err) {
      console.error("Failed to forward event to InventoryEventBus:", err);
    }
  }
}
