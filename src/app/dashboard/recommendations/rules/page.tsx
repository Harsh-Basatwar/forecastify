'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sliders, Plus, CheckCircle, Code, ShieldAlert, Sparkles } from 'lucide-react';
import { RuleDSLDefinition } from '@/lib/forecast/recommendations';

export default function RuleDSLEditorPage() {
  const storeId = 'demo-store-001';
  const [rules, setRules] = useState<RuleDSLDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  const [ruleName, setRuleName] = useState('');
  const [whenClause, setWhenClause] = useState('forecast > stock AND supplierDelay > 5');
  const [thenAction, setThenAction] = useState('ORDER_MORE');

  useEffect(() => {
    fetch(`/api/forecast/recommendations/rules?storeId=${storeId}`)
      .then(res => res.json())
      .then(data => {
        if (data.rules) setRules(data.rules);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName) return;

    const res = await fetch('/api/forecast/recommendations/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeId,
        ruleName,
        whenClause,
        thenAction,
        category: 'INVENTORY',
        priority: 'HIGH',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setRules([...rules, data.rule]);
      setRuleName('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 text-sm font-medium">
        <Link href="/dashboard/recommendations" className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition">
          Feed & DAG
        </Link>
        <Link href="/dashboard/recommendations/analytics" className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition">
          ROI & Analytics
        </Link>
        <Link href="/dashboard/recommendations/history" className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition">
          Event History Log
        </Link>
        <Link href="/dashboard/recommendations/rules" className="px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
          Rule DSL & Plugins
        </Link>
        <Link href="/dashboard/recommendations/settings" className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition">
          Engine Settings
        </Link>
      </div>

      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Sliders className="w-6 h-6 text-indigo-400" />
            Rule DSL & Recommendation Marketplace Plugins
          </h1>
          <p className="text-slate-400 text-sm">Configure dynamic business logic expressions and enable domain marketplace plugins</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Create Rule Form */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-400" />
            Create Rule DSL Expression
          </h2>

          <form onSubmit={handleAddRule} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase">Rule Name</label>
              <input
                type="text"
                value={ruleName}
                onChange={e => setRuleName(e.target.value)}
                placeholder="e.g. Festival Surge Reorder Rule"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase">WHEN Condition</label>
              <input
                type="text"
                value={whenClause}
                onChange={e => setWhenClause(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">Variables: forecast, stock, safetyStock, reorderPoint, supplierDelay</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase">THEN Action</label>
              <select
                value={thenAction}
                onChange={e => setThenAction(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="ORDER_MORE">ORDER_MORE</option>
                <option value="EMERGENCY_PURCHASE">EMERGENCY_PURCHASE</option>
                <option value="MARKDOWN">MARKDOWN</option>
                <option value="TRANSFER_STOCK">TRANSFER_STOCK</option>
                <option value="SWITCH_SUPPLIER">SWITCH_SUPPLIER</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/25"
            >
              Add DSL Rule
            </button>
          </form>
        </div>

        {/* Existing Rules & Plugins List */}
        <div className="md:col-span-2 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Code className="w-5 h-5 text-emerald-400" />
            Active Rule DSL Expressions & Dynamic Plugins
          </h2>

          {loading ? (
            <div className="p-8 text-center text-slate-500 animate-pulse">Loading rules...</div>
          ) : (
            <div className="space-y-3">
              {/* Marketplace Plugins */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-indigo-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Marketplace Plugin: StockoutRulePlugin
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Active</span>
                </div>
                <p className="text-xs text-slate-400">Detects inventory stock deficit relative to forecast demand & safety stock.</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-indigo-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Marketplace Plugin: ExpiryRulePlugin
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Active</span>
                </div>
                <p className="text-xs text-slate-400">Recommends FEFO priority, markdowns, or liquidation for near-expiry inventory batches.</p>
              </div>

              {rules.map(r => (
                <div key={r.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-200">{r.ruleName}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-mono">
                      {r.thenAction}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-emerald-400 bg-slate-900 p-2 rounded">
                    WHEN {r.whenClause} THEN {r.thenAction}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
