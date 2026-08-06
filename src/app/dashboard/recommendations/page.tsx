'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  ArrowRight,
  RefreshCw,
  Sliders,
  CheckCircle,
  Play,
  Zap,
} from 'lucide-react';
import { useRecommendations, useRecommendationAnalytics } from '@/lib/forecast/recommendations';

export default function RecommendationCenterPage() {
  const storeId = 'demo-store-001';
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');

  const { recommendations, loading, refresh } = useRecommendations(storeId, {
    category: selectedCategory || undefined,
    priority: selectedPriority || undefined,
  });

  const { analytics } = useRecommendationAnalytics(storeId);
  const [executingId, setExecutingId] = useState<string | null>(null);

  const handleExecute = async (id: string) => {
    setExecutingId(id);
    try {
      await fetch('/api/forecast/recommendations/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendationId: id, storeId }),
      });
      refresh();
    } finally {
      setExecutingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Sparkles className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
              Recommendation & Decision Intelligence Center
            </h1>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Enterprise Decision Platform powered by Forecast Engine 2.0 (Milestone 4)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refresh()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-sm font-medium transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            href="/dashboard/recommendations/rules"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition shadow-lg shadow-indigo-600/20"
          >
            <Sliders className="w-4 h-4" />
            Rule DSL & Plugins
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Potential Savings</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-2">
            ${analytics?.totalPotentialSavings.toLocaleString() || '14,850'}
          </div>
          <p className="text-xs text-slate-500 mt-1">Identified across active inventory</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Potential Profit Gain</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-indigo-400 mt-2">
            ${analytics?.totalPotentialProfit.toLocaleString() || '28,400'}
          </div>
          <p className="text-xs text-slate-500 mt-1">Gross profit optimization</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Critical Alerts</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-2">
            {analytics?.criticalRecommendations || 2}
          </div>
          <p className="text-xs text-slate-500 mt-1">Requires immediate execution</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Acceptance Rate</span>
            <CheckCircle className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-400 mt-2">
            {analytics?.acceptanceRatePct || 92.5}%
          </div>
          <p className="text-xs text-slate-500 mt-1">Recommendation accuracy</p>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 text-sm font-medium">
        <Link href="/dashboard/recommendations" className="px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
          Feed & DAG
        </Link>
        <Link href="/dashboard/recommendations/analytics" className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition">
          ROI & Analytics
        </Link>
        <Link href="/dashboard/recommendations/history" className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition">
          Event History Log
        </Link>
        <Link href="/dashboard/recommendations/rules" className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition">
          Rule DSL & Plugins
        </Link>
        <Link href="/dashboard/recommendations/settings" className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition">
          Engine Settings
        </Link>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/40 border border-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Category:</span>
          {['', 'INVENTORY', 'PROCUREMENT', 'PRICING', 'EXPIRY', 'FINANCIAL', 'RISK'].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {cat || 'ALL'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Priority:</span>
          {['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(prio => (
            <button
              key={prio}
              onClick={() => setSelectedPriority(prio)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                selectedPriority === prio
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {prio || 'ALL'}
            </button>
          ))}
        </div>
      </div>

      {/* Recommendation Feed List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-500 animate-pulse">Loading decision intelligence feed...</div>
        ) : recommendations.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/30 border border-slate-800 rounded-xl text-slate-400">
            No recommendations match selected filters.
          </div>
        ) : (
          recommendations.map(rec => (
            <div
              key={rec.id}
              className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg"
            >
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    rec.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                    rec.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                  }`}>
                    {rec.priority}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">
                    {rec.category}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    Score: {rec.score}/100
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    Explainability: {rec.explainabilityScore}/100
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                  <span>{rec.type}</span>
                  <span className="text-slate-400 text-sm font-normal">— {rec.reason}</span>
                </h3>

                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span>Est. Profit: <strong className="text-emerald-400">${rec.financialImpact.expectedProfit}</strong></span>
                  <span>Est. Savings: <strong className="text-indigo-400">${rec.financialImpact.expectedSavings}</strong></span>
                  <span>Capital Released: <strong className="text-cyan-400">${rec.financialImpact.blockedCapitalReleased}</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href={`/dashboard/recommendations/${rec.id}`}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition flex items-center gap-1.5"
                >
                  Inspect & Simulate
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <button
                  disabled={executingId === rec.id || rec.status === 'EXECUTED'}
                  onClick={() => handleExecute(rec.id)}
                  className={`px-4 py-2 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                    rec.status === 'EXECUTED'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'
                  }`}
                >
                  {executingId === rec.id ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : rec.status === 'EXECUTED' ? (
                    <CheckCircle className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  {rec.status === 'EXECUTED' ? 'Executed' : 'One-Click Execute'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
