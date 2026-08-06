/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Receipt, ArrowLeft, Plus, DollarSign, TrendingDown } from "lucide-react";
import { useStoreAssistant } from "@/hooks/use-store-assistant";

export default function ExpensesPage() {
  const { callApi } = useStoreAssistant();
  const [breakdown, setBreakdown] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadExpenses = async () => {
    setLoading(true);
    const bData = await callApi("expense.breakdown");
    if (bData) setBreakdown(bData);

    const tData = await callApi("expense.total");
    if (tData) setTotal(tData);
    setLoading(false);
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/store-assistant" className="p-2 rounded-lg bg-card hover:bg-accent/10 border border-border text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="w-6 h-6 text-accent" /> Expense Monitor & Optimization
          </h1>
          <p className="text-xs text-muted-foreground">Track recurring & operational expenses, budget variance, and savings opportunities</p>
        </div>
      </div>

      <div className="fx-card p-6 space-y-2 bg-gradient-to-br from-card to-accent/10">
        <span className="text-xs text-muted-foreground uppercase font-bold">Total Expenses This Month</span>
        <div className="text-3xl font-black text-foreground">₹{total.toLocaleString("en-IN")}</div>
      </div>

      <div className="fx-card p-6 space-y-4">
        <h2 className="text-base font-bold">Expense Categories Breakdown</h2>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Loading expense categories...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {breakdown.map((item) => (
              <div key={item.type} className="p-4 rounded-xl bg-card border border-border/50 space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold">
                  <span>{item.label}</span>
                  <span className="text-accent">₹{item.amount.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Budget: ₹{item.budget.toLocaleString("en-IN")}</span>
                  <span className={item.trend === "over" ? "text-rose-400 font-bold" : "text-emerald-400"}>
                    {item.trend === "over" ? `+₹${item.variance}` : "On Track"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
