/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Truck, ArrowLeft, Navigation, MapPin } from "lucide-react";
import { useStoreAssistant } from "@/hooks/use-store-assistant";

export default function DeliveryPage() {
  const { callApi } = useStoreAssistant();
  const [orders, setOrders] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadDelivery = async () => {
    setLoading(true);
    const list = await callApi("delivery.orders");
    if (list) setOrders(list);

    const sum = await callApi("delivery.summary");
    if (sum) setSummary(sum);
    setLoading(false);
  };

  useEffect(() => {
    loadDelivery();
  }, []);

  const handleOptimize = async () => {
    await callApi("delivery.optimize");
    loadDelivery();
  };

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/store-assistant" className="p-2 rounded-lg bg-card hover:bg-accent/10 border border-border text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Truck className="w-6 h-6 text-accent" /> Local Delivery Route Planner
            </h1>
            <p className="text-xs text-muted-foreground">Local order dispatch, route optimization & delivery tracking</p>
          </div>
        </div>

        <button
          onClick={handleOptimize}
          className="px-4 py-2 rounded-xl bg-accent text-accent-foreground font-bold text-xs hover:opacity-90 transition-all flex items-center gap-1.5"
        >
          <Navigation className="w-4 h-4" /> Optimize Route Sequence
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="fx-card p-5 space-y-1">
          <span className="text-xs text-muted-foreground">Pending Deliveries</span>
          <div className="text-2xl font-black">{summary?.pending || 0}</div>
        </div>
        <div className="fx-card p-5 space-y-1">
          <span className="text-xs text-muted-foreground">In Transit</span>
          <div className="text-2xl font-black text-amber-400">{summary?.inTransit || 0}</div>
        </div>
        <div className="fx-card p-5 space-y-1">
          <span className="text-xs text-muted-foreground">Delivered Today</span>
          <div className="text-2xl font-black text-emerald-400">{summary?.delivered || 0}</div>
        </div>
      </div>

      <div className="fx-card p-6 space-y-4">
        <h2 className="text-base font-bold">Delivery Orders Dispatch Queue</h2>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Loading delivery queue...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">No active delivery orders today.</div>
        ) : (
          <div className="space-y-3">
            {orders.map((ord) => (
              <div key={ord.id} className="p-4 rounded-xl bg-card border border-border/50 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold">{ord.customer_name}</div>
                  <p className="text-muted-foreground">{ord.delivery_address}</p>
                </div>
                <span className="px-2.5 py-1 rounded bg-accent/15 text-accent font-bold uppercase text-[10px]">
                  {ord.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
