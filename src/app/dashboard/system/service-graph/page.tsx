"use client";

import { useEffect, useState } from "react";
import { Network, CheckCircle2, ArrowRight } from "lucide-react";
import { GraphNode, serviceHealthGraph } from "@/lib/background/servicegraph";

export default function ServiceGraphDashboardPage() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);

  useEffect(() => {
    setNodes(serviceHealthGraph.getGraphTopology());
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Network className="w-7 h-7 text-accent" />
          Service Health Dependency Graph
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Interactive topology node map displaying live dependency health and throughput across subsystems.
        </p>
      </div>

      <div className="p-6 rounded-xl bg-card/50 border border-border/60 backdrop-blur space-y-4">
        <h2 className="text-sm font-bold text-foreground">Live Topology Nodes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {nodes.map((node) => (
            <div key={node.id} className="p-4 rounded-xl bg-card/80 border border-border/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-accent">#{node.id}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {node.status}
                </span>
              </div>
              <div className="text-sm font-bold text-foreground">{node.label}</div>
              <div className="text-xs text-muted-foreground pt-2 border-t border-border/40 flex items-center justify-between">
                <span>Latency: <strong className="text-foreground">{node.latencyMs} ms</strong></span>
                <span>Deps: <strong className="text-foreground">{node.dependencies.length}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
