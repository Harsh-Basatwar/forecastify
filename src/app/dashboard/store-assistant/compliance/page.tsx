/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileSpreadsheet, ArrowLeft, Calendar, AlertTriangle, CheckCircle } from "lucide-react";
import { useStoreAssistant } from "@/hooks/use-store-assistant";

export default function CompliancePage() {
  const { callApi } = useStoreAssistant();
  const [compliance, setCompliance] = useState<any>(null);
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCompliance = async () => {
    setLoading(true);
    const now = new Date();
    const comp = await callApi("compliance.compute", { month: now.getMonth() + 1, year: now.getFullYear() });
    if (comp) setCompliance(comp);

    const dlines = await callApi("compliance.deadlines");
    if (dlines) setDeadlines(dlines);
    setLoading(false);
  };

  useEffect(() => {
    loadCompliance();
  }, []);

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/store-assistant" className="p-2 rounded-lg bg-card hover:bg-accent/10 border border-border text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-accent" /> Auto GST & Compliance Center
          </h1>
          <p className="text-xs text-muted-foreground">Automated tax computation, ITC matching, HSN summary & GSTR-1/3B filing status</p>
        </div>
      </div>

      {/* Deadlines Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {deadlines.map((dl, idx) => (
          <div key={idx} className="fx-card p-5 space-y-2 border-l-4 border-l-accent">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>{dl.filing} Filing Deadline</span>
              <span className="text-accent">{dl.dueDate}</span>
            </div>
            <p className="text-xs text-muted-foreground">Due in {dl.daysUntilDue} days | Status: <strong className="capitalize text-foreground">{dl.status}</strong></p>
          </div>
        ))}
      </div>

      {/* Monthly GST Computation Summary */}
      <div className="fx-card p-6 space-y-6">
        <h2 className="text-base font-bold">Current Month GST Ledger Computation</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Sales GST Collected</span>
            <div className="text-2xl font-black text-rose-400">₹{(compliance?.total_sales_gst || 0).toLocaleString("en-IN")}</div>
            <p className="text-[10px] text-muted-foreground">CGST: ₹{compliance?.cgst_collected || 0} | SGST: ₹{compliance?.sgst_collected || 0}</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Input Tax Credit (ITC)</span>
            <div className="text-2xl font-black text-emerald-400">₹{(compliance?.total_purchase_gst || 0).toLocaleString("en-IN")}</div>
            <p className="text-[10px] text-muted-foreground">CGST: ₹{compliance?.itc_cgst || 0} | SGST: ₹{compliance?.itc_sgst || 0}</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Net GST Payable</span>
            <div className="text-2xl font-black text-accent">₹{(compliance?.net_gst_liability || 0).toLocaleString("en-IN")}</div>
            <p className="text-[10px] text-muted-foreground">After offsetting ITC</p>
          </div>
        </div>
      </div>
    </div>
  );
}
