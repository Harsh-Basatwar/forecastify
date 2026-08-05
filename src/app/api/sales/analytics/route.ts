import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * GET /api/sales/analytics
 * Computes sales metrics (Revenue, Profit, AOV, Gross/Net sales, Hourly & Daily trends, Top items)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");
    const range = searchParams.get("range") || "30d"; // 'today', '7d', '30d', 'all'

    if (!storeId) {
      return NextResponse.json({ error: "Missing storeId query parameter" }, { status: 400 });
    }

    // Determine date cutoff based on range
    const now = new Date();
    let startDate: Date | null = new Date();
    if (range === "today") {
      startDate.setHours(0, 0, 0, 0);
    } else if (range === "7d") {
      startDate.setDate(now.getDate() - 7);
    } else if (range === "30d") {
      startDate.setDate(now.getDate() - 30);
    } else {
      startDate = null;
    }

    let salesQuery = supabase
      .from("sales")
      .select(`
        *,
        items:sale_items(*)
      `)
      .eq("store_id", storeId)
      .eq("status", "completed");

    if (startDate) {
      salesQuery = salesQuery.gte("created_at", startDate.toISOString());
    }

    const { data: sales, error } = await salesQuery;

    if (error) {
      return NextResponse.json({ error: `Failed to fetch sales analytics: ${error.message}` }, { status: 500 });
    }

    const completedSales = sales || [];

    // Summary counters
    let grossSales = 0;
    let totalDiscount = 0;
    let netSales = 0;
    let totalTax = 0;
    let totalRevenue = 0;
    let totalProfit = 0;
    let totalUnits = 0;

    const hourlyMap: Record<number, { sales: number; orders: number }> = {};
    for (let h = 0; h < 24; h++) hourlyMap[h] = { sales: 0, orders: 0 };

    const dailyMap: Record<string, { sales: number; profit: number; orders: number }> = {};
    const categoryMap: Record<string, { sales: number; units: number }> = {};
    const productMap: Record<string, { quantity: number; revenue: number; profit: number }> = {};
    const paymentMethodMap: Record<string, { total: number; count: number }> = {
      cash: { total: 0, count: 0 },
      upi: { total: 0, count: 0 },
      card: { total: 0, count: 0 },
      split: { total: 0, count: 0 },
    };

    completedSales.forEach((sale) => {
      const gTotal = Number(sale.grand_total || 0);
      const sub = Number(sale.subtotal || 0);
      const disc = Number(sale.discount_amount || 0);
      const tax = Number(sale.tax_amount || 0);

      grossSales += sub;
      totalDiscount += disc;
      netSales += sub - disc;
      totalTax += tax;
      totalRevenue += gTotal;

      // Payment method breakdown
      const pMethod = (sale.payment_method || "cash").toLowerCase();
      if (!paymentMethodMap[pMethod]) paymentMethodMap[pMethod] = { total: 0, count: 0 };
      paymentMethodMap[pMethod].total += gTotal;
      paymentMethodMap[pMethod].count += 1;

      // Hourly breakdown
      const createdDate = new Date(sale.created_at);
      const hour = createdDate.getHours();
      if (hourlyMap[hour]) {
        hourlyMap[hour].sales += gTotal;
        hourlyMap[hour].orders += 1;
      }

      // Daily breakdown (YYYY-MM-DD)
      const dateStr = createdDate.toISOString().slice(0, 10);
      if (!dailyMap[dateStr]) dailyMap[dateStr] = { sales: 0, profit: 0, orders: 0 };
      dailyMap[dateStr].sales += gTotal;
      dailyMap[dateStr].orders += 1;

      // Items calculation & profit
      let saleCost = 0;
      if (Array.isArray(sale.items)) {
        sale.items.forEach((item: Record<string, any>) => {
          const qty = Number(item.quantity || 0);
          const itemRev = Number(item.total || item.subtotal || 0);
          const purchaseCost = Number(item.purchase_price || 0) * qty;

          totalUnits += qty;
          saleCost += purchaseCost;

          // Product breakdown
          const pName = item.product_name || "Unknown Product";
          if (!productMap[pName]) productMap[pName] = { quantity: 0, revenue: 0, profit: 0 };
          productMap[pName].quantity += qty;
          productMap[pName].revenue += itemRev;
          productMap[pName].profit += itemRev - purchaseCost;

          // Category breakdown
          const cat = item.category || "General";
          if (!categoryMap[cat]) categoryMap[cat] = { sales: 0, units: 0 };
          categoryMap[cat].sales += itemRev;
          categoryMap[cat].units += qty;
        });
      }

      const saleProfit = gTotal - saleCost;
      totalProfit += saleProfit;
      dailyMap[dateStr].profit += saleProfit;
    });

    const totalOrders = completedSales.length;
    const averageOrderValue = totalOrders > 0 ? Number((totalRevenue / totalOrders).toFixed(2)) : 0;

    // Format hourly array
    const hourly_sales = Object.entries(hourlyMap).map(([h, val]) => ({
      hour: `${String(h).padStart(2, "0")}:00`,
      sales: Number(val.sales.toFixed(2)),
      orders: val.orders,
    }));

    // Format daily array
    const daily_sales = Object.entries(dailyMap)
      .map(([date, val]) => ({
        date,
        sales: Number(val.sales.toFixed(2)),
        profit: Number(val.profit.toFixed(2)),
        orders: val.orders,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Format category array
    const category_sales = Object.entries(categoryMap)
      .map(([cat, val]) => ({
        category: cat,
        sales: Number(val.sales.toFixed(2)),
        units: val.units,
        pct: totalRevenue > 0 ? Number(((val.sales / totalRevenue) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.sales - a.sales);

    // Format top 10 products
    const top_products = Object.entries(productMap)
      .map(([name, val]) => ({
        product_name: name,
        quantity: val.quantity,
        revenue: Number(val.revenue.toFixed(2)),
        profit: Number(val.profit.toFixed(2)),
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Format payment methods
    const payment_method_breakdown = Object.entries(paymentMethodMap).map(([method, val]) => ({
      method: method.toUpperCase(),
      total: Number(val.total.toFixed(2)),
      count: val.count,
    }));

    return NextResponse.json({
      summary: {
        gross_sales: Number(grossSales.toFixed(2)),
        net_sales: Number(netSales.toFixed(2)),
        total_revenue: Number(totalRevenue.toFixed(2)),
        total_profit: Number(totalProfit.toFixed(2)),
        total_orders: totalOrders,
        total_units_sold: totalUnits,
        average_order_value: averageOrderValue,
        total_tax_collected: Number(totalTax.toFixed(2)),
        total_discounts_given: Number(totalDiscount.toFixed(2)),
      },
      hourly_sales,
      daily_sales,
      category_sales,
      top_products,
      payment_method_breakdown,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
