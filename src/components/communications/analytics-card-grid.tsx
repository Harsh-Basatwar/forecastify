/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React from 'react';
import { Activity, CheckCircle2, MessageSquare, ShieldCheck, DollarSign, Clock } from 'lucide-react';

interface AnalyticsProps {
  stats: {
    totalOutbound: number;
    totalInbound: number;
    deliveryRatePct: number;
    readRatePct: number;
    totalCost: number;
    currency: string;
  };
  providerHealth: any[];
}

export const AnalyticsCardGrid: React.FC<AnalyticsProps> = ({ stats, providerHealth }) => {
  return (
    <div className="space-y-4 mb-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Total Conversations</p>
            <p className="text-2xl font-bold text-slate-100 mt-1">
              {(stats.totalOutbound || 0) + (stats.totalInbound || 0)}
            </p>
            <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
              <span>↑ {stats.totalInbound} inbound</span> • <span>{stats.totalOutbound} outbound</span>
            </p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Delivery Rate</p>
            <p className="text-2xl font-bold text-slate-100 mt-1">{stats.deliveryRatePct}%</p>
            <p className="text-[11px] text-slate-400 mt-1">Read Rate: {stats.readRatePct}%</p>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Communication Spend</p>
            <p className="text-2xl font-bold text-slate-100 mt-1">₹{stats.totalCost.toFixed(2)}</p>
            <p className="text-[11px] text-emerald-400 mt-1">Cost efficiency tracked</p>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-lg">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">System Providers</p>
            <p className="text-2xl font-bold text-slate-100 mt-1">3 Active</p>
            <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Meta Cloud / SMS / Email
            </p>
          </div>
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-lg">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Provider Health Row */}
      {providerHealth && providerHealth.length > 0 && (
        <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl flex flex-wrap items-center gap-4 text-xs">
          <span className="text-slate-400 font-medium flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" /> Provider Status:
          </span>
          {providerHealth.map((p, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-slate-800/80 px-2.5 py-1 rounded-md">
              <span className={`w-2 h-2 rounded-full ${p.status === 'healthy' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="font-semibold text-slate-200 uppercase">{p.communication_providers?.provider_name || 'Provider'}</span>
              <span className="text-slate-400">({p.latency_ms || 45}ms)</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
