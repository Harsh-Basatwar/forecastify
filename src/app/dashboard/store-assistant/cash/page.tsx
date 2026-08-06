/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wallet, ArrowLeft, TrendingUp, Building2, Coins } from "lucide-react";
import { useStoreAssistant } from "@/hooks/use-store-assistant";

export default function CashIntelligencePage() {
  const { callApi } = useStoreAssistant();
  const [intel, setIntel] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadCash = async () => {
    setLoading(true);
    const data = await callApi("cash.intelligence");
    if (data) setIntel(data);
    setLoading(false);
  };

  useEffect(() => {
    loadCash();
  }, []);

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/store-assistant" className="p-2 rounded-lg bg-card hover:bg-accent/10 border border-border text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="w-6 h-6 text-accent" /> Cash Flow Intelligence & Predictions
          </h1>
          <p className="text-xs text-muted-foreground">UPI vs Cash split, bank deposit recommendations & change denomination requirements</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="fx-card p-5 space-y-1">
          <span className="text-xs text-muted-foreground">Today's Cash Collected</span>
          <div className="text-2xl font-black text-emerald-400">₹{(intel?.todayCash || 0).toLocaleString("en-IN")}</div>
        </div>
        <div className="fx-card p-5 space-y-1">
          <span className="text-xs text-muted-foreground">Today's UPI Collected</span>
          <div className="text-2xl font-black text-teal-400">₹{(intel?.todayUPI || 0).toLocaleString("en-IN")}</div>
        </div>
        <div className="fx-card p-5 space-y-1">
          <span className="text-xs text-muted-foreground">Recommended Bank Deposit</span>
          <div className="text-2xl font-black text-accent">₹{(intel?.recommendedBankDeposit || 0).toLocaleString("en-IN")}</div>
        </div>
      </div>

      <div className="fx-card p-6 space-y-4">
        <h2 className="text-base font-bold flex items-center gap-2">
          <Coins className="w-4 h-4 text-accent" /> Predicted Tomorrow Change Denominations Needed
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(intel?.changeDenominations || []).map((denom: any) => (
            <div key={denom.denomination} className="p-3 rounded-xl bg-card border border-border/50 text-center space-y-1">
              <span className="text-xs text-muted-foreground">₹{denom.denomination} Notes</span>
              <div className="font-bold text-accent text-lg">{denom.count} needed</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
