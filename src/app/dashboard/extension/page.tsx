"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import extensionIcon from "../../../../extension/icons/extension.png";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ORBIT_ITEMS = [
  { emoji: "🥛", label: "Dairy", color: "#818cf8" },
  { emoji: "🍪", label: "Snacks", color: "#a855f7" },
  { emoji: "🧂", label: "Grocery", color: "#ec4899" },
  { emoji: "📦", label: "Packages", color: "#f59e0b" },
  { emoji: "🛒", label: "Cart", color: "#22c55e" },
  { emoji: "🧈", label: "Cooking", color: "#06b6d4" },
  { emoji: "🍞", label: "Bakery", color: "#f43f5e" },
  { emoji: "🧃", label: "Beverages", color: "#8b5cf6" },
  { emoji: "🤖", label: "AI", color: "#10b981" },
];

const FEATURES = [
  { icon: "⚡", title: "Fetch AI Reorder Lists", desc: "Instantly pull recommended products from our forecasting engine" },
  { icon: "🛒", title: "One-Click Cart Population", desc: "Automatically search and add products to your cart on any supplier platform" },
  { icon: "🧠", title: "Intelligent Product Matching", desc: "Groq AI resolves naming variations between your inventory and supplier listings" },
  { icon: "📊", title: "7-Day Demand Graphs", desc: "View increasing demand forecasts with detailed analysis for every product" },
  { icon: "💡", title: "Alternative Suggestions", desc: "Get AI-recommended alternatives when exact matches aren't available" },
  { icon: "💬", title: "AI Procurement Chat", desc: "Ask questions about products, deals, and suppliers with per-website memory" },
  { icon: "🔄", title: "Per-Site Memory", desc: "Chat history and product lists persist separately for each supplier website" },
  { icon: "📈", title: "Stockout Prevention", desc: "Real-time urgency alerts when stock levels hit critical thresholds" },
];

const WORKFLOW_STEPS = [
  { step: "1", title: "Forecast Analysis", desc: "AI analyzes demand signals, weather, trends" },
  { step: "2", title: "Stockout Detection", desc: "Identifies products running low on inventory" },
  { step: "3", title: "Purchase List Generated", desc: "Recommended quantities with priority levels" },
  { step: "4", title: "Extension Fetches Products", desc: "One-click load into the browser extension" },
  { step: "5", title: "AI Product Matching", desc: "Groq matches products to supplier listings" },
  { step: "6", title: "Add to Cart", desc: "Auto-populate cart with correct quantities" },
];

export default function ExtensionPage() {
  const [mounted, setMounted] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const interval = setInterval(() => setActiveFeature(f => (f + 1) % FEATURES.length), 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8">
      {/* Hero Section with Orbital Animation (Theme-Adaptive) */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-slate-50 dark:bg-[#0a0e1a] shadow-sm transition-colors duration-300" style={{ minHeight: "520px" }}>
        {/* Starry background effect */}
        <div className="absolute inset-0 opacity-10 dark:opacity-20" style={{
          backgroundImage: "radial-gradient(currentColor 1px, transparent 1px), radial-gradient(currentColor 1px, transparent 1px)",
          backgroundSize: "60px 60px, 90px 90px",
          backgroundPosition: "0 0, 30px 30px",
        }} />

        {/* Dynamic Glow effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full animate-pulse-slow mix-blend-multiply dark:mix-blend-screen"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 60%)" }} />
        <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] rounded-full mix-blend-multiply dark:mix-blend-screen"
          style={{ background: "radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)", filter: "blur(40px)" }} />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-center gap-12 p-8 lg:p-12 h-full min-h-[520px]">
          {/* Text */}
          <div className="flex-1 text-center lg:text-left max-w-lg relative">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-4 shadow-sm bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30">
              🚀 Chrome Extension
            </div>
            <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white mb-4 drop-shadow-sm" style={{ lineHeight: 1.15, letterSpacing: "-0.5px" }}>
              Arjuna Sarthi
              <span className="block mt-1 relative" style={{
                background: "linear-gradient(135deg, #6366f1, #a855f7, #ec4899)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
                AI Assistant
              </span>
            </h1>
            <p className="text-base mb-6 text-slate-600 dark:text-slate-400" style={{ lineHeight: 1.7 }}>
              Bridge the gap between inventory forecasting and product procurement.
              Connect with Arjuna Sarthi AI and replenish inventory on any
              supplier platform with one click.
            </p>
            <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
              <a href="/arjuna-sarthi-extension.zip" download="arjuna-sarthi-extension.zip">
                <button className="px-6 py-3 rounded-xl text-sm font-bold text-white flex items-center gap-2 transition-transform hover:scale-105 shadow-md dark:shadow-[0_4px_25px_rgba(99,102,241,0.5)]"
                  style={{
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  }}>
                  📥 Download Extension
                </button>
              </a>
            </div>
          </div>

          {/* Orbital Globe Animation */}
          <div className="relative flex-shrink-0" style={{ width: "480px", height: "480px" }}>
            {/* Ambient center glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[240px] h-[240px] bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-[50px] animate-pulse" />

            {/* Inner dashed detail rings */}
            {[140, 160].map((size, i) => (
              <div
                key={`dashed-${i}`}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  border: `1px dashed rgba(129,140,248,${0.4 - i * 0.1})`,
                  animation: mounted ? `spin-slow ${10 + i * 5}s linear infinite ${i % 2 === 0 ? "reverse" : ""}` : "none",
                }}
              />
            ))}

            {/* Orbital rings */}
            {[180, 280, 380].map((size, ringIdx) => (
              <div
                key={ringIdx}
                className="absolute top-1/2 left-1/2 rounded-full"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  border: `1px solid rgba(129,140,248,${0.2 + ringIdx * 0.05})`,
                  transform: "translate(-50%, -50%)",
                  animation: mounted
                    ? `spin-slow ${14 + ringIdx * 8}s linear infinite ${ringIdx % 2 === 1 ? "reverse" : ""}`
                    : "none",
                }}
              >
                {/* Planets on each ring */}
                {ORBIT_ITEMS.slice(ringIdx * 3, ringIdx * 3 + 3).map((item, planetIdx) => {
                  const angles = ringIdx === 0 ? [0] : ringIdx === 1 ? [0, 180] : [0, 120, 240];
                  const angle = angles[planetIdx] ?? 0;
                  const rad = (angle * Math.PI) / 180;
                  const r = size / 2;
                  const x = r + r * Math.cos(rad) - 24; 
                  const y = r + r * Math.sin(rad) - 24;

                  return (
                    <div
                      key={planetIdx}
                      className="absolute flex items-center justify-center rounded-full group cursor-pointer bg-white dark:bg-slate-900 shadow-md dark:shadow-none"
                      style={{
                        width: "48px",
                        height: "48px",
                        left: `${x}px`,
                        top: `${y}px`,
                        border: `2px solid ${item.color}80`,
                        boxShadow: `0 0 15px ${item.color}40, inset 0 0 10px ${item.color}20`,
                        fontSize: "22px",
                        animation: mounted
                          ? `spin-slow ${14 + ringIdx * 8}s linear infinite ${ringIdx % 2 === 1 ? "" : "reverse"}`
                          : "none",
                        transition: "all 0.3s ease",
                      }}
                      title={item.label}
                    >
                      <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" 
                           style={{ background: `radial-gradient(circle, ${item.color}20 0%, transparent 70%)` }} />
                      <span className="relative z-10">{item.emoji}</span>
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Center Logo Area */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-transform hover:scale-105 duration-500 z-20"
              style={{
                width: "120px",
                height: "120px",
                filter: "drop-shadow(0 0 20px rgba(99,102,241,0.5))",
              }}
            >
              <div className="relative w-[110px] h-[110px] flex items-center justify-center">
                {/* Main extension.png Logo (Transparent) */}
                <Image src={extensionIcon} alt="Arjuna Sarthi AI" className="w-full h-full object-contain drop-shadow-xl" />
              </div>
            </div>

            {/* Ripple Pulse rings - Fixed animation console warning */}
            {[140, 160].map((size, i) => (
              <div
                key={`pulse-${i}`}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  border: "2px solid rgba(129,140,248,0.3)",
                  animationName: mounted ? "pulse-ripple" : "none",
                  animationDuration: `${3 + i}s`,
                  animationTimingFunction: "ease-out",
                  animationIterationCount: "infinite",
                  animationDelay: `${i * 1.5}s`
                }}
              />
            ))}
          </div>
        </div>

        <style>{`
          @keyframes spin-slow {
            from { transform: translate(-50%, -50%) rotate(0deg); }
            to { transform: translate(-50%, -50%) rotate(360deg); }
          }
          @keyframes pulse-ripple {
            0% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
            100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
          }
          @keyframes pulse-slow {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 0.8; }
          }
        `}</style>
      </div>

      {/* Installation Steps - Below Hero */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(99,102,241,0.08)] transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-full -z-10 group-hover:bg-primary/10 transition-colors" />
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold mb-3 shadow-inner">1</div>
          <h3 className="text-sm font-bold text-foreground mb-1">Open Extensions</h3>
          <p className="text-xs text-muted-foreground">Go to <code className="bg-secondary px-1.5 py-0.5 rounded text-primary border border-primary/10">chrome://extensions</code></p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(99,102,241,0.08)] transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-full -z-10 group-hover:bg-primary/10 transition-colors" />
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold mb-3 shadow-inner">2</div>
          <h3 className="text-sm font-bold text-foreground mb-1">Enable Dev Mode</h3>
          <p className="text-xs text-muted-foreground">Toggle the "Developer mode" switch in the top right corner.</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(99,102,241,0.08)] transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-full -z-10 group-hover:bg-primary/10 transition-colors" />
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold mb-3 shadow-inner">3</div>
          <h3 className="text-sm font-bold text-foreground mb-1">Load Extension</h3>
          <p className="text-xs text-muted-foreground">Click "Load unpacked" and select <code className="bg-secondary px-1.5 py-0.5 rounded text-primary border border-primary/10">extension/dist</code>.</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(99,102,241,0.08)] transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-full -z-10 group-hover:bg-primary/10 transition-colors" />
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold mb-3 shadow-inner">4</div>
          <h3 className="text-sm font-bold text-foreground mb-1">Pin & Use</h3>
          <p className="text-xs text-muted-foreground">Pin the extension to your toolbar and launch it on any supplier site.</p>
        </div>
      </div>

      {/* Features Grid */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-indigo-500/10 rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-sm">✨</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Extension Features</h2>
            <p className="text-xs text-muted-foreground">Everything you need for smart procurement</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((feature, idx) => (
            <div
              key={idx}
              className={`bg-card border rounded-xl p-4 transition-all cursor-pointer ${
                activeFeature === idx ? "border-primary/50 shadow-[0_8px_30px_rgba(99,102,241,0.12)] scale-[1.02]" : "border-border hover:border-primary/30 hover:shadow-md"
              }`}
              onClick={() => setActiveFeature(idx)}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-3 shadow-sm"
                style={{
                  background: activeFeature === idx
                    ? "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))"
                    : "var(--secondary)",
                }}>
                {feature.icon}
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">{feature.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Workflow */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 bg-emerald-500/10 rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-sm">🔄</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">How It Works</h2>
            <p className="text-xs text-muted-foreground">From forecast to purchase in 6 steps</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {WORKFLOW_STEPS.map((step, idx) => (
            <div key={idx} className="flex items-start gap-3 p-4 bg-secondary/30 rounded-xl border border-border/60 hover:bg-secondary/50 transition-colors">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-md"
                style={{ background: `linear-gradient(135deg, ${["#6366f1","#8b5cf6","#a855f7","#22c55e","#06b6d4","#f59e0b"][idx]}, ${["#818cf8","#a78bfa","#c084fc","#34d399","#22d3ee","#fbbf24"][idx]})` }}>
                {step.step}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{step.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Demo Products Preview */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-purple-500/10 rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-sm">📦</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Sample Procurement List</h2>
            <p className="text-xs text-muted-foreground">Products recommended by Arjuna Sarthi AI</p>
          </div>
        </div>
        <div className="space-y-2">
          {[
            { name: "Amul Milk 500ml", qty: 50, unit: "Units", priority: "High", stock: 8, cost: "₹1,350" },
            { name: "Parle-G Biscuits", qty: 20, unit: "Packets", priority: "High", stock: 5, cost: "₹100" },
            { name: "Tata Sugar 1kg", qty: 15, unit: "Bags", priority: "Medium", stock: 3, cost: "₹675" },
            { name: "Red Label Tea 250g", qty: 10, unit: "Packets", priority: "High", stock: 2, cost: "₹1,200" },
          ].map((product, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/60 hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white shadow-sm"
                  style={{ background: `linear-gradient(135deg, ${["#6366f1","#a855f7","#f59e0b","#ec4899"][idx]}, ${["#818cf8","#c084fc","#fbbf24","#f0abfc"][idx]})` }}>
                  {idx + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{product.name}</p>
                  <p className="text-xs text-muted-foreground">Stock: {product.stock} • {product.cost}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  product.priority === "High"
                    ? "bg-red-500/10 text-red-500 border border-red-500/20"
                    : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                }`}>{product.priority}</span>
                <span className="text-sm font-bold" style={{
                  background: "linear-gradient(135deg, #818cf8, #c084fc)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}>
                  {product.qty} {product.unit}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
