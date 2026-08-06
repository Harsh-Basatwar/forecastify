/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Send, ArrowLeft, Heart, PartyPopper, Calendar } from "lucide-react";
import { useStoreAssistant } from "@/hooks/use-store-assistant";

export default function CustomerCommsPage() {
  const { callApi } = useStoreAssistant();
  const [comms, setComms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadComms = async () => {
    setLoading(true);
    const list = await callApi("customerComm.list");
    if (list) setComms(list);
    setLoading(false);
  };

  useEffect(() => {
    loadComms();
  }, []);

  const handleGenBirthdays = async () => {
    await callApi("customerComm.birthday");
    loadComms();
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
              <Send className="w-6 h-6 text-accent" /> Customer Communications Automation
            </h1>
            <p className="text-xs text-muted-foreground">Automated birthday wishes, festival messages, back-in-stock alerts</p>
          </div>
        </div>

        <button
          onClick={handleGenBirthdays}
          className="px-4 py-2 rounded-xl bg-accent text-accent-foreground font-bold text-xs hover:opacity-90 transition-all flex items-center gap-1.5"
        >
          <PartyPopper className="w-4 h-4" /> Trigger Birthday Wishes
        </button>
      </div>

      <div className="fx-card p-6 space-y-4">
        <h2 className="text-base font-bold">Scheduled & Sent Customer Messages</h2>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Loading communications...</div>
        ) : comms.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">No customer communications scheduled.</div>
        ) : (
          <div className="space-y-3">
            {comms.map((comm) => (
              <div key={comm.id} className="p-4 rounded-xl bg-card border border-border/50 text-xs space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span>{comm.customer_name || "Customer"}</span>
                  <span className="text-accent uppercase text-[10px]">{comm.comm_type}</span>
                </div>
                <p className="text-muted-foreground">{comm.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
