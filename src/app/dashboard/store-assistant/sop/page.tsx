/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardCheck, ArrowLeft, CheckCircle2, Play } from "lucide-react";
import { useStoreAssistant } from "@/hooks/use-store-assistant";

export default function SOPPage() {
  const { callApi } = useStoreAssistant();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSOPs = async () => {
    setLoading(true);
    await callApi("sop.init");
    const tmpls = await callApi("sop.templates");
    if (tmpls) setTemplates(tmpls);
    setLoading(false);
  };

  useEffect(() => {
    loadSOPs();
  }, []);

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/store-assistant" className="p-2 rounded-lg bg-card hover:bg-accent/10 border border-border text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-accent" /> Standard Operating Procedures (SOPs)
          </h1>
          <p className="text-xs text-muted-foreground">Pre-built checklists for store opening, closing, stock intake, and expiry handling</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map((sop) => (
          <div key={sop.id} className="fx-card p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-accent/15 text-accent">
                  {sop.category}
                </span>
                <span className="text-xs text-muted-foreground">{sop.estimated_total_mins} mins total</span>
              </div>
              <h2 className="text-base font-bold">{sop.name}</h2>
              <div className="space-y-1.5 pt-2">
                {(sop.steps || []).map((step: any) => (
                  <div key={step.order} className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-foreground">
                      {step.order}
                    </span>
                    <span>{step.title}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => alert(`Starting SOP: ${sop.name}`)}
              className="w-full py-2 rounded-xl bg-accent text-accent-foreground font-bold text-xs hover:opacity-90 transition-all flex items-center justify-center gap-1.5 mt-4"
            >
              <Play className="w-3.5 h-3.5" /> Execute SOP Checklist
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
