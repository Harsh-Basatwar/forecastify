/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutGrid, ArrowLeft, Navigation, Package } from "lucide-react";
import { useStoreAssistant } from "@/hooks/use-store-assistant";

export default function ShelfManagementPage() {
  const { callApi } = useStoreAssistant();
  const [tasks, setTasks] = useState<any[]>([]);
  const [route, setRoute] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadShelf = async () => {
    setLoading(true);
    const rTasks = await callApi("shelf.refillTasks");
    if (rTasks) setTasks(rTasks);

    const wRoute = await callApi("shelf.walkingRoute");
    if (wRoute) setRoute(wRoute);
    setLoading(false);
  };

  useEffect(() => {
    loadShelf();
  }, []);

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/store-assistant" className="p-2 rounded-lg bg-card hover:bg-accent/10 border border-border text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutGrid className="w-6 h-6 text-accent" /> Shelf Management & Walking Route Refill
          </h1>
          <p className="text-xs text-muted-foreground">Shelf zone mapping & optimized walking route refill tasks</p>
        </div>
      </div>

      <div className="fx-card p-6 space-y-4">
        <h2 className="text-base font-bold flex items-center gap-2">
          <Navigation className="w-4 h-4 text-accent" /> Optimized Walking Route Refill Sequence
        </h2>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Mapping store zones & calculating route...</div>
        ) : tasks.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">All store shelves are adequately stocked!</div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-card border border-border/50 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-accent text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">
                      {idx + 1}
                    </span>
                    <span>Zone {task.zoneCode}: {task.zoneName}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-card border border-border">
                    {task.priority} Priority
                  </span>
                </div>

                <div className="space-y-1 pl-8">
                  {task.products.map((p: any, pIdx: number) => (
                    <div key={pIdx} className="flex items-center justify-between text-muted-foreground">
                      <span>{p.name}</span>
                      <span className="font-bold text-foreground">Refill Qty: {p.refillQty}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
