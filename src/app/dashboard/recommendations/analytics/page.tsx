'use client';

import React from 'react';
import Link from 'next/link';
import { TrendingUp, DollarSign, Target, PieChart, Activity } from 'lucide-react';
import { useRecommendationAnalytics } from '@/lib/forecast/recommendations';

export default function RecommendationAnalyticsPage() {
  const storeId = 'demo-store-001';
  const { analytics, loading } = useRecommendationAnalytics(storeId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 text-sm font-medium">
        <Link href="/dashboard/recommendations" className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition">
          Feed & DAG
        </Link>
        <Link href="/dashboard/recommendations/analytics" className="px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
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

      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
            Decision Intelligence Analytics & Realized ROI
          </h1>
          <p className="text-slate-400 text-sm">Suggested vs Realized financial performance and recommendation accuracy</p>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 animate-pulse">Loading decision analytics...</div>
      ) : (
        <div className="space-y-6">
          {/* Main Financial KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
                <span>Suggested Savings</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-400 mt-2">
                ${analytics?.totalPotentialSavings.toLocaleString()}
              </div>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
                <span>Gross Profit Impact</span>
                <TrendingUp className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-bold text-indigo-400 mt-2">
                ${analytics?.totalPotentialProfit.toLocaleString()}
              </div>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
                <span>Capital Released</span>
                <Activity className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-cyan-400 mt-2">
                ${analytics?.totalBlockedCapitalReleased.toLocaleString()}
              </div>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
                <span>Recommendation Accuracy</span>
                <Target className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-amber-400 mt-2">
                {analytics?.acceptanceRatePct}%
              </div>
            </div>
          </div>

          {/* Risk Heatmap & Category Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-indigo-400" />
                Category Distribution
              </h3>

              <div className="space-y-3">
                {analytics && Object.entries(analytics.categoryBreakdown).map(([cat, count]) => (
                  <div key={cat} className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 font-medium">{cat}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-200 font-mono text-xs">
                      {count} recommendations
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400" />
                Risk Heatmap Breakdown
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/40">
                  <div className="text-xs text-red-400 font-bold">CRITICAL RISK</div>
                  <div className="text-2xl font-bold text-red-400 mt-1">{analytics?.riskHeatmap.critical}</div>
                </div>

                <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/40">
                  <div className="text-xs text-amber-400 font-bold">HIGH RISK</div>
                  <div className="text-2xl font-bold text-amber-400 mt-1">{analytics?.riskHeatmap.high}</div>
                </div>

                <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-800/40">
                  <div className="text-xs text-indigo-400 font-bold">MEDIUM RISK</div>
                  <div className="text-2xl font-bold text-indigo-400 mt-1">{analytics?.riskHeatmap.medium}</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-xs text-slate-400 font-bold">LOW RISK</div>
                  <div className="text-2xl font-bold text-slate-300 mt-1">{analytics?.riskHeatmap.low}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
