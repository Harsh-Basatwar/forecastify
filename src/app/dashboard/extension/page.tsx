"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import extensionIcon from "../../../../extension/icons/extension.png";
import {
  Zap, ShoppingCart, Brain, BarChart3, Lightbulb, MessageSquare,
  RefreshCw, TrendingUp, Download, Puzzle, ListChecks
} from "lucide-react";

const FEATURES = [
  { icon: Zap, title: "Fetch AI Reorder Lists", desc: "Instantly pull recommended products from our forecasting engine" },
  { icon: ShoppingCart, title: "One-Click Cart Population", desc: "Automatically search and add products to your cart on any supplier platform" },
  { icon: Brain, title: "Intelligent Product Matching", desc: "Groq AI resolves naming variations between your inventory and supplier listings" },
  { icon: BarChart3, title: "7-Day Demand Graphs", desc: "View increasing demand forecasts with detailed analysis for every product" },
  { icon: Lightbulb, title: "Alternative Suggestions", desc: "Get AI-recommended alternatives when exact matches aren't available" },
  { icon: MessageSquare, title: "AI Procurement Chat", desc: "Ask questions about products, deals, and suppliers with per-website memory" },
  { icon: RefreshCw, title: "Per-Site Memory", desc: "Chat history and product lists persist separately for each supplier website" },
  { icon: TrendingUp, title: "Stockout Prevention", desc: "Real-time urgency alerts when stock levels hit critical thresholds" },
];

const WORKFLOW_STEPS = [
  { step: "1", title: "Forecast Analysis", desc: "AI analyzes demand signals, weather, trends" },
  { step: "2", title: "Stockout Detection", desc: "Identifies products running low on inventory" },
  { step: "3", title: "Purchase List Generated", desc: "Recommended quantities with priority levels" },
  { step: "4", title: "Extension Fetches Products", desc: "One-click load into the browser extension" },
  { step: "5", title: "AI Product Matching", desc: "Groq matches products to supplier listings" },
  { step: "6", title: "Add to Cart", desc: "Auto-populate cart with correct quantities" },
];

const INSTALL_STEPS = [
  { step: "1", title: "Open Extensions", desc: <>Go to <code className="fx-num bg-secondary px-1.5 py-0.5 rounded-[var(--radius-xs)] text-[11px] text-foreground">chrome://extensions</code></> },
  { step: "2", title: "Enable Dev Mode", desc: <>Toggle the &quot;Developer mode&quot; switch in the top right corner.</> },
  { step: "3", title: "Load Extension", desc: <>Click &quot;Load unpacked&quot; and select <code className="fx-num bg-secondary px-1.5 py-0.5 rounded-[var(--radius-xs)] text-[11px] text-foreground">extension/dist</code>.</> },
  { step: "4", title: "Pin & Use", desc: <>Pin the extension to your toolbar and launch it on any supplier site.</> },
];

export default function ExtensionPage() {
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setActiveFeature(f => (f + 1) % FEATURES.length), 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12">

      {/* Page lead · editorial, no card */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-xl min-w-0">
          <p className="fx-eyebrow">Chrome Extension</p>
          <h1 className="fx-display text-[28px] sm:text-[34px] leading-tight text-foreground mt-2.5">
            Arjuna Sarthi AI Assistant
          </h1>
          <p className="text-sm text-muted-foreground mt-2.5 leading-relaxed">
            Bridge the gap between inventory forecasting and product procurement.
            Connect with Arjuna Sarthi AI and replenish inventory on any
            supplier platform with one click.
          </p>
          <div className="mt-5">
            {/* Anchor styled as the button — a <button> nested in an <a> is
                invalid and gives assistive tech two conflicting controls. */}
            <a
              href="/arjuna-sarthi-extension.zip"
              download="arjuna-sarthi-extension.zip"
              className="fx-btn fx-btn-accent no-underline"
            >
              <Download className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" /> Download Extension
            </a>
          </div>
        </div>
        {/* fx-fade-in handles the entrance; a mounted flag in state was an
            extra render pass for the same 200ms fade. */}
        <div className="shrink-0 self-center md:self-end fx-fade-in">
          <div className="fx-card p-6 flex flex-col items-center gap-3">
            <div className="relative w-20 h-20">
              <Image src={extensionIcon} alt="Arjuna Sarthi AI" className="w-full h-full object-contain" />
            </div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <span className="fx-signal fx-signal-accent" aria-hidden="true" /> Works with any supplier site
            </span>
          </div>
        </div>
      </div>

      {/* Installation · one sheet, hairline-divided steps */}
      <section aria-label="Installation steps" className="fx-card grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[var(--border)] overflow-hidden">
        {INSTALL_STEPS.map((item) => (
          <div key={item.step} className="p-5 sm:p-6">
            <p className="fx-num text-[22px] font-semibold leading-none" style={{ color: "var(--accent)" }}>{item.step}</p>
            <h3 className="text-sm font-semibold text-foreground mt-3">{item.title}</h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </section>

      {/* Features */}
      <section aria-label="Extension features" className="space-y-4">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Puzzle className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} aria-hidden="true" />
            <h2 className="fx-display text-[22px] text-foreground">Extension Features</h2>
          </div>
          <p className="text-xs text-muted-foreground">Everything you need for smart procurement</p>
        </div>
        <div className="fx-card overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px" style={{ background: "var(--border)" }}>
            {FEATURES.map((feature, idx) => (
              <button
                key={idx}
                onClick={() => setActiveFeature(idx)}
                aria-pressed={activeFeature === idx}
                className="text-left p-5 transition-colors cursor-pointer fx-focus"
                style={{
                  background: activeFeature === idx
                    ? "color-mix(in srgb, var(--accent) 7%, var(--card))"
                    : "var(--card)",
                }}
              >
                <feature.icon className={`w-4 h-4 mb-3 ${activeFeature === idx ? "text-accent" : "text-muted-foreground"}`} strokeWidth={1.8} aria-hidden="true" />
                <p className="text-sm font-semibold text-foreground">{feature.title}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{feature.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Workflow · quiet ledger list */}
        <section aria-label="How it works" className="fx-card p-6">
          <div className="flex items-center gap-2 mb-1">
            <RefreshCw className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} aria-hidden="true" />
            <h2 className="fx-display text-[17px] text-foreground">How It Works</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-3">From forecast to purchase in 6 steps</p>
          <div>
            {WORKFLOW_STEPS.map((step) => (
              <div key={step.step} className="flex items-start gap-4 py-3 border-b border-border last:border-b-0">
                <span className="fx-num text-sm font-semibold w-5 shrink-0 text-right" style={{ color: "var(--accent)" }}>{step.step}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{step.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Demo Products Preview · ledger table */}
        <section aria-label="Sample procurement list" className="fx-card p-6">
          <div className="flex items-center gap-2 mb-1">
            <ListChecks className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} aria-hidden="true" />
            <h2 className="fx-display text-[17px] text-foreground">Sample Procurement List</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Products recommended by Arjuna Sarthi AI</p>
          <div className="fx-table-scroll -mx-2">
            <table className="fx-table min-w-[480px]">
              <caption className="fx-sr-only">
                Sample procurement list: products recommended by Arjuna Sarthi AI, with current stock, estimated cost, priority, and suggested order quantity.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col" className="text-right">Stock</th>
                  <th scope="col" className="text-right">Est. Cost</th>
                  <th scope="col">Priority</th>
                  <th scope="col" className="text-right">Order Qty</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "Amul Milk 500ml", qty: 50, unit: "Units", priority: "High", stock: 8, cost: "₹1,350" },
                  { name: "Parle-G Biscuits", qty: 20, unit: "Packets", priority: "High", stock: 5, cost: "₹100" },
                  { name: "Tata Sugar 1kg", qty: 15, unit: "Bags", priority: "Medium", stock: 3, cost: "₹675" },
                  { name: "Red Label Tea 250g", qty: 10, unit: "Packets", priority: "High", stock: 2, cost: "₹1,200" },
                ].map((product, idx) => (
                  <tr key={idx}>
                    <td className="font-medium text-foreground">{product.name}</td>
                    <td className="text-right fx-num text-muted-foreground">{product.stock}</td>
                    <td className="text-right fx-num text-foreground">{product.cost}</td>
                    <td>
                      <span className={`fx-badge ${product.priority === "High" ? "fx-badge-danger" : "fx-badge-warning"}`}>{product.priority}</span>
                    </td>
                    <td className="text-right fx-num font-semibold" style={{ color: "var(--accent)" }}>{product.qty} {product.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
