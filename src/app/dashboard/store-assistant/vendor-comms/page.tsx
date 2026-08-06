/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, ArrowLeft, Send, CheckCircle2, RefreshCw } from "lucide-react";
import { useStoreAssistant } from "@/hooks/use-store-assistant";

export default function VendorCommsPage() {
  const { callApi } = useStoreAssistant();
  const [comms, setComms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadComms = async () => {
    setLoading(true);
    const history = await callApi("vendor.history");
    if (history) setComms(history);
    setLoading(false);
  };

  useEffect(() => {
    loadComms();
  }, []);

  const handleSend = async (commId: string) => {
    await callApi("vendor.send", { commId });
    loadComms();
  };

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/store-assistant" className="p-2 rounded-lg bg-card hover:bg-accent/10 border border-border text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-accent" /> Vendor Communications Automation
          </h1>
          <p className="text-xs text-muted-foreground">Automated WhatsApp & email supplier messages, PO delivery follow-ups</p>
        </div>
      </div>

      <div className="fx-card p-6 space-y-4">
        <h2 className="text-base font-bold">Communication Trail</h2>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Loading vendor communications...</div>
        ) : comms.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">No vendor messages logged yet.</div>
        ) : (
          <div className="space-y-3">
            {comms.map((comm) => (
              <div key={comm.id} className="p-4 rounded-xl bg-card border border-border/50 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-accent">{comm.supplier_name || "Supplier"}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-card border border-border">
                    {comm.status}
                  </span>
                </div>
                <p className="text-muted-foreground whitespace-pre-line">{comm.body}</p>
                {comm.status === "draft" && (
                  <button
                    onClick={() => handleSend(comm.id)}
                    className="px-3 py-1.5 rounded-lg bg-accent text-accent-foreground font-bold text-xs hover:opacity-90 transition-all flex items-center gap-1 mt-2"
                  >
                    <Send className="w-3.5 h-3.5" /> Approve & Send
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
