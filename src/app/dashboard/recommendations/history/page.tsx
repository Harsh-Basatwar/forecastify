'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { History, Shield, CheckCircle, Clock } from 'lucide-react';
import { RecommendationEvent } from '@/lib/forecast/recommendations';

export default function RecommendationHistoryPage() {
  const storeId = 'demo-store-001';
  const [events, setEvents] = useState<RecommendationEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/forecast/recommendations/history?storeId=${storeId}`)
      .then(res => res.json())
      .then(data => {
        if (data.events) setEvents(data.events);
      })
      .finally(() => setLoading(false));
  }, []);

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
        <Link href="/dashboard/recommendations/history" className="px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
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
            <History className="w-6 h-6 text-indigo-400" />
            Immutable Event Sourcing History Log
          </h1>
          <p className="text-slate-400 text-sm">Full lifecycle event transitions for audit & compliance</p>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 animate-pulse">Loading event stream log...</div>
      ) : (
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <div className="space-y-3">
            {events.map((evt, idx) => (
              <div key={evt.id || idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-950/60 text-indigo-400 border border-indigo-800/40">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-200">{evt.eventType}</div>
                    <div className="text-xs text-slate-400">Recommendation ID: {evt.recommendationId}</div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-500 font-mono">
                    {new Date(evt.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
