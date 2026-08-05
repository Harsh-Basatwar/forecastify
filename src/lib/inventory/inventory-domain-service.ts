import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  StockTransactionType,
  AdjustmentType,
  DomainInventoryEvent,
} from "./types";
import { InventoryEventBus } from "./inventory-event-bus";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface StockAdjustmentInput {
  storeId: string;
  productId: string;
  variantId?: string;
  batchId?: string;
  locationId?: string;
  adjustmentType: AdjustmentType;
  quantityChange: number;
  reason: string;
  userId?: string;
}

export interface StockReservationInput {
  storeId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  referenceId?: string;
  userId?: string;
}

export interface StockTransferInput {
  storeId: string;
  productId: string;
  variantId?: string;
  sourceLocationId: string;
  destLocationId: string;
  quantity: number;
  notes?: string;
  userId?: string;
}

export class InventoryDomainService {
  private client: SupabaseClient;

  constructor(customClient?: SupabaseClient) {
    this.client = customClient || createClient(supabaseUrl, supabaseAnonKey);
  }

  /**
   * Helper to write immutable inventory ledger audit record
   */
  private async createLedgerEntry(params: {
    storeId: string;
    productId: string;
    productName: string;
    previousStock: number;
    changeAmount: number;
    newStock: number;
    transactionType: StockTransactionType | string;
    referenceId?: string;
    notes?: string;
    batchId?: string;
  }) {
    await this.client.from("inventory_ledger").insert({
      store_id: params.storeId,
      product_id: params.productId,
      product_name: params.productName,
      previous_stock: params.previousStock,
      change_amount: params.changeAmount,
      new_stock: params.newStock,
      transaction_type: params.transactionType,
      reference_id: params.referenceId || null,
      notes: params.notes || null,
      batch_id: params.batchId || null,
    });
  }

  /**
   * Central Authority method: Manual or Automated Stock Adjustment
   */
  public async adjustStock(input: StockAdjustmentInput) {
    if (!input.storeId || !input.productId) {
      throw new Error("Missing required storeId or productId");
    }

    // 1. Fetch current product & inventory balance
    const { data: product, error: prodErr } = await this.client
      .from("products")
      .select("id, name, status")
      .eq("id", input.productId)
      .eq("store_id", input.storeId)
      .single();

    let productName = product?.name;

    // Fallback lookup in legacy inventory table if not in products table
    if (!productName) {
      const { data: invLegacy } = await this.client
        .from("inventory")
        .select("id, product_name, current_stock")
        .eq("id", input.productId)
        .eq("store_id", input.storeId)
        .single();

      if (!invLegacy) {
        throw new Error("Product not found or access denied.");
      }
      productName = invLegacy.product_name;
    }

    // Get current inventory row
    const { data: inv } = await this.client
      .from("inventory")
      .select("*")
      .eq("id", input.productId)
      .eq("store_id", input.storeId)
      .single();

    const previousStock = inv?.current_stock ?? inv?.available_stock ?? 0;
    const newStock = Math.max(0, previousStock + input.quantityChange);

    // 2. Update stock in inventory table
    if (inv) {
      await this.client
        .from("inventory")
        .update({
          current_stock: newStock,
          available_stock: Math.max(0, (inv.available_stock || previousStock) + input.quantityChange),
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.productId)
        .eq("store_id", input.storeId);
    }

    // 3. If batchId is specified, update batch quantity
    if (input.batchId) {
      const { data: batch } = await this.client
        .from("product_batches")
        .select("current_quantity")
        .eq("id", input.batchId)
        .single();

      if (batch) {
        const newBatchQty = Math.max(0, batch.current_quantity + input.quantityChange);
        await this.client
          .from("product_batches")
          .update({
            current_quantity: newBatchQty,
            status: newBatchQty === 0 ? "exhausted" : "active",
            updated_at: new Date().toISOString(),
          })
          .eq("id", input.batchId);
      }
    }

    // 4. Record stock adjustment audit table
    await this.client.from("stock_adjustments").insert({
      store_id: input.storeId,
      product_id: input.productId,
      variant_id: input.variantId || null,
      batch_id: input.batchId || null,
      location_id: input.locationId || null,
      adjustment_type: input.adjustmentType,
      quantity_change: input.quantityChange,
      previous_stock: previousStock,
      new_stock: newStock,
      reason: input.reason,
      adjusted_by: input.userId || null,
    });

    // 5. Create immutable ledger entry
    await this.createLedgerEntry({
      storeId: input.storeId,
      productId: input.productId,
      productName,
      previousStock,
      changeAmount: input.quantityChange,
      newStock,
      transactionType: "ADJUSTMENT",
      notes: `Adjustment (${input.adjustmentType}): ${input.reason}`,
      batchId: input.batchId,
    });

    // 6. Broadcast Granular AI Event
    const domainEvent: DomainInventoryEvent = {
      event: "inventory.stock.adjusted",
      product_id: input.productId,
      product_name: productName,
      quantity: input.quantityChange,
      reason: input.reason,
      user_id: input.userId,
      store_id: input.storeId,
      timestamp: new Date().toISOString(),
      metadata: { adjustmentType: input.adjustmentType, previousStock, newStock },
    };
    await InventoryEventBus.emit(domainEvent);

    return { success: true, previousStock, newStock, productName };
  }

  /**
   * Reserve Stock during Sale Checkout
   */
  public async reserveStock(input: StockReservationInput) {
    const { data: inv } = await this.client
      .from("inventory")
      .select("id, product_name, current_stock, available_stock, reserved_stock")
      .eq("id", input.productId)
      .eq("store_id", input.storeId)
      .single();

    if (!inv) {
      throw new Error("Product inventory not found.");
    }

    const currentAvail = inv.available_stock ?? inv.current_stock ?? 0;
    if (currentAvail < input.quantity) {
      throw new Error(`Insufficient available stock for ${inv.product_name}. Available: ${currentAvail}`);
    }

    const newAvail = currentAvail - input.quantity;
    const newReserved = (inv.reserved_stock || 0) + input.quantity;

    await this.client
      .from("inventory")
      .update({
        available_stock: newAvail,
        reserved_stock: newReserved,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.productId)
      .eq("store_id", input.storeId);

    await this.createLedgerEntry({
      storeId: input.storeId,
      productId: input.productId,
      productName: inv.product_name,
      previousStock: currentAvail,
      changeAmount: -input.quantity,
      newStock: newAvail,
      transactionType: "SALE_RESERVE",
      referenceId: input.referenceId,
      notes: "Temporary checkout reservation",
    });

    await InventoryEventBus.emit({
      event: "inventory.stock.reserved",
      product_id: input.productId,
      product_name: inv.product_name,
      quantity: input.quantity,
      reason: "Billing session checkout",
      store_id: input.storeId,
      user_id: input.userId,
      timestamp: new Date().toISOString(),
    });

    return { success: true, reservedQuantity: input.quantity };
  }

  /**
   * Deduct Reserved Stock upon Payment Confirmation
   */
  public async deductReservedStock(input: StockReservationInput) {
    const { data: inv } = await this.client
      .from("inventory")
      .select("id, product_name, current_stock, reserved_stock")
      .eq("id", input.productId)
      .eq("store_id", input.storeId)
      .single();

    if (!inv) return;

    const previousStock = inv.current_stock ?? 0;
    const newStock = Math.max(0, previousStock - input.quantity);
    const newReserved = Math.max(0, (inv.reserved_stock || 0) - input.quantity);

    await this.client
      .from("inventory")
      .update({
        current_stock: newStock,
        reserved_stock: newReserved,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.productId)
      .eq("store_id", input.storeId);

    await this.createLedgerEntry({
      storeId: input.storeId,
      productId: input.productId,
      productName: inv.product_name,
      previousStock,
      changeAmount: -input.quantity,
      newStock,
      transactionType: "SALE_DEDUCT",
      referenceId: input.referenceId,
      notes: "Payment confirmed, stock deducted",
    });

    await InventoryEventBus.emit({
      event: "inventory.stock.deducted",
      product_id: input.productId,
      product_name: inv.product_name,
      quantity: input.quantity,
      reason: "Sale payment completed",
      store_id: input.storeId,
      user_id: input.userId,
      timestamp: new Date().toISOString(),
    });

    return { success: true, newStock };
  }

  /**
   * Release Reserved Stock if Sale is Abandoned / Cancelled
   */
  public async releaseReservedStock(input: StockReservationInput) {
    const { data: inv } = await this.client
      .from("inventory")
      .select("id, product_name, available_stock, reserved_stock")
      .eq("id", input.productId)
      .eq("store_id", input.storeId)
      .single();

    if (!inv) return;

    const currentAvail = inv.available_stock ?? 0;
    const newAvail = currentAvail + input.quantity;
    const newReserved = Math.max(0, (inv.reserved_stock || 0) - input.quantity);

    await this.client
      .from("inventory")
      .update({
        available_stock: newAvail,
        reserved_stock: newReserved,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.productId)
      .eq("store_id", input.storeId);

    await InventoryEventBus.emit({
      event: "inventory.stock.released",
      product_id: input.productId,
      product_name: inv.product_name,
      quantity: input.quantity,
      reason: "Sale cancelled or session timed out",
      store_id: input.storeId,
      user_id: input.userId,
      timestamp: new Date().toISOString(),
    });

    return { success: true, availableStock: newAvail };
  }

  /**
   * Transfer Stock between locations
   */
  public async transferStock(input: StockTransferInput) {
    const { data: product } = await this.client
      .from("products")
      .select("name")
      .eq("id", input.productId)
      .single();

    const productName = product?.name || "Product";

    await this.client.from("stock_transfers").insert({
      store_id: input.storeId,
      product_id: input.productId,
      variant_id: input.variantId || null,
      source_location_id: input.sourceLocationId,
      dest_location_id: input.destLocationId,
      quantity: input.quantity,
      notes: input.notes || null,
      status: "completed",
      created_by: input.userId || null,
    });

    await this.createLedgerEntry({
      storeId: input.storeId,
      productId: input.productId,
      productName,
      previousStock: 0,
      changeAmount: 0,
      newStock: 0,
      transactionType: "TRANSFER_OUT",
      notes: `Location transfer of ${input.quantity} units: ${input.notes || ""}`,
    });

    return { success: true };
  }
}
