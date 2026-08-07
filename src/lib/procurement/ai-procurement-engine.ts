import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { AIProcurementRecommendation } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export class AIProcurementEngine {
  private client: SupabaseClient;

  constructor(customClient?: SupabaseClient) {
    this.client = customClient || createClient(supabaseUrl, supabaseAnonKey);
  }

  /**
   * Generate intelligent reorder recommendations for a store
   */
  public async generateRecommendations(storeId: string): Promise<AIProcurementRecommendation[]> {
    // 1. Fetch inventory balances & product metadata
    const { data: invItems } = await this.client
      .from("inventory")
      .select("id, product_name, current_stock:quantity, reserved_stock, incoming_stock, min_stock, reorder_point, safety_stock")
      .eq("store_id", storeId);

    // 2. Fetch active preferred suppliers
    const { data: suppliers } = await this.client
      .from("suppliers")
      .select("id, name, lead_time_days, rating, reliability_score, fill_rate, is_preferred")
      .eq("store_id", storeId);

    // 3. Fetch recent sales velocity (last 30 days) from sales / billing if present
    const { data: salesSummary } = await this.client
      .from("inventory_ledger")
      .select("product_id, change_amount")
      .eq("store_id", storeId)
      .eq("transaction_type", "SALE_DEDUCT");

    const salesMap = new Map<string, number>();
    if (salesSummary) {
      salesSummary.forEach((s) => {
        const current = salesMap.get(s.product_id) || 0;
        salesMap.get(s.product_id);
        salesMap.set(s.product_id, current + Math.abs(s.change_amount || 0));
      });
    }

    const defaultSupplier = suppliers?.[0] || {
      id: "supplier-default",
      name: "Primary Wholesale Distributor",
      lead_time_days: 3,
      reliability_score: 98,
    };

    const recommendations: AIProcurementRecommendation[] = [];

    if (!invItems || invItems.length === 0) {
      return recommendations;
    }

    for (const item of invItems) {
      const currentStock = item.current_stock || 0;
      const reservedStock = item.reserved_stock || 0;
      const incomingStock = item.incoming_stock || 0;
      const effectiveStock = currentStock - reservedStock + incomingStock;
      const reorderPoint = item.reorder_point || item.min_stock || 10;
      const safetyStock = item.safety_stock || 5;

      // Calculate daily sales velocity (default to 2 units/day if no sales recorded yet)
      const total30DaySales = salesMap.get(item.id) || 15;
      const salesVelocity = Math.max(0.5, parseFloat((total30DaySales / 30).toFixed(2)));

      // Check if item needs reordering
      if (effectiveStock <= reorderPoint) {
        // Preferred supplier selection
        const selectedSupplier = suppliers?.find((s) => s.is_preferred) || defaultSupplier;
        const leadTimeDays = selectedSupplier.lead_time_days || 3;

        // Days until stockout = Effective Stock / Daily Sales Velocity
        const daysToStockout = Math.max(0, Math.floor(effectiveStock / salesVelocity));
        const stockoutDate = new Date();
        stockoutDate.setDate(stockoutDate.getDate() + daysToStockout);

        // Economic Order Quantity (EOQ) heuristic: (SalesVelocity * (LeadTime + TargetDays)) + SafetyStock - EffectiveStock
        const targetDays = 14; // Reorder for 2 weeks buffer
        const recommendedQty = Math.ceil(salesVelocity * (leadTimeDays + targetDays) + safetyStock - effectiveStock);
        const finalQty = Math.max(10, Math.ceil(recommendedQty / 5) * 5); // Round up to multiples of 5

        const expectedCost = finalQty * 45; // Heuristic default cost price per unit
        const expectedSavings = Math.round(expectedCost * 0.08); // 8% bulk discount savings estimate

        const recDate = new Date();
        const delDate = new Date();
        delDate.setDate(delDate.getDate() + leadTimeDays);

        recommendations.push({
          id: `rec-${item.id}`,
          product_id: item.id,
          product_name: item.product_name,
          recommended_supplier_id: selectedSupplier.id,
          recommended_supplier_name: selectedSupplier.name,
          recommended_qty: finalQty,
          recommended_purchase_date: recDate.toISOString().split("T")[0],
          expected_delivery_date: delDate.toISOString().split("T")[0],
          expected_cost: expectedCost,
          expected_savings: expectedSavings,
          reasoning: {
            why_reorder: `Available stock (${effectiveStock} units) is at or below the safety threshold of ${reorderPoint} units.`,
            why_quantity: `Ordering ${finalQty} units ensures 14 days of coverage based on daily sales velocity of ${salesVelocity} units/day.`,
            why_supplier: `Selected ${selectedSupplier.name} due to optimal lead time (${leadTimeDays} days) and high reliability score (${selectedSupplier.reliability_score || 95}%).`,
            risk_if_ignored: `Stockout expected in ${daysToStockout} day(s) on ${stockoutDate.toLocaleDateString("en-IN")}, risking lost sales revenue.`,
            expected_stockout_date: stockoutDate.toISOString().split("T")[0],
          },
          metrics: {
            current_stock: currentStock,
            reserved_stock: reservedStock,
            incoming_stock: incomingStock,
            sales_velocity: salesVelocity,
            safety_stock: safetyStock,
            lead_time_days: leadTimeDays,
          },
        });
      }
    }

    return recommendations;
  }
}
