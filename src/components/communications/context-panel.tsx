/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React from 'react';
import { Package, CreditCard, Sparkles, AlertCircle, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import type { MessageThreadRow } from '@/lib/communication/types';

interface ContextPanelProps {
  thread?: MessageThreadRow;
  aiLineageEvents?: Array<{ step: string; timestamp: string; detail: string }>;
}

export const ContextPanel: React.FC<ContextPanelProps> = ({ thread, aiLineageEvents }) => {
  if (!thread) return null;

  const participant = thread.participants?.[0];
  const isSupplier = participant?.entity_type === 'supplier';
  const isCustomer = participant?.entity_type === 'customer';

  return (
    <div className="w-full md:w-80 bg-slate-900/90 border-l border-slate-800 flex flex-col h-full overflow-y-auto p-4 space-y-4">
      {/* Participant Overview Card */}
      <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Linked Entity Details</h4>
        <div className="text-xs space-y-1 text-slate-400">
          <p><span className="text-slate-500">Name:</span> <strong className="text-slate-200">{participant?.entity_name || thread.thread_title}</strong></p>
          <p><span className="text-slate-500">Type:</span> <span className="uppercase text-emerald-400 font-semibold">{participant?.entity_type || 'Contact'}</span></p>
          <p><span className="text-slate-500">Phone:</span> <span className="font-mono text-slate-300">{participant?.identifier || 'N/A'}</span></p>
        </div>
      </div>

      {/* Linked Business Object Card */}
      {isSupplier && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
            <Package className="w-4 h-4" />
            <span>Active Purchase Order</span>
          </div>
          <div className="text-xs space-y-1 text-slate-300">
            <p><span className="text-slate-400">PO Number:</span> <span className="font-mono text-emerald-300 font-bold">PO-2026-0891</span></p>
            <p><span className="text-slate-400">Status:</span> <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded text-[10px]">ORDERED</span></p>
            <p><span className="text-slate-400">Total Value:</span> ₹45,200.00</p>
            <p><span className="text-slate-400">Expected Delivery:</span> Tomorrow</p>
          </div>
        </div>
      )}

      {isCustomer && (
        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
            <CreditCard className="w-4 h-4" />
            <span>Khata Credit Ledger</span>
          </div>
          <div className="text-xs space-y-1 text-slate-300">
            <p><span className="text-slate-400">Outstanding Balance:</span> <span className="text-rose-400 font-bold">₹3,450.00</span></p>
            <p><span className="text-slate-400">Credit Limit:</span> ₹10,000.00</p>
            <p><span className="text-slate-400">Auto Reminder:</span> Enabled</p>
          </div>
        </div>
      )}

      {/* AI Decision Lineage & Explainability Timeline */}
      <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-purple-400 font-bold text-xs">
            <Sparkles className="w-4 h-4" />
            <span>AI Decision Lineage</span>
          </div>
          <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-mono">
            Band 3 (98% Conf)
          </span>
        </div>

        {/* Timeline Steps */}
        <div className="space-y-2 text-xs relative pl-3 border-l border-purple-500/30">
          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-purple-400 absolute -left-[17px] top-1" />
            <p className="font-semibold text-slate-200">1. Inbound Reply Received</p>
            <p className="text-[11px] text-slate-400">"Can deliver 50 boxes tomorrow at Rs 120"</p>
          </div>

          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-purple-400 absolute -left-[17px] top-1" />
            <p className="font-semibold text-slate-200">2. Structured AI Parsing</p>
            <p className="text-[11px] text-slate-400">Intent: MODIFY_PO_QTY • Entities: Qty=50, Price=120</p>
          </div>

          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-emerald-400 absolute -left-[17px] top-1" />
            <p className="font-semibold text-emerald-300">3. Policy Evaluation</p>
            <p className="text-[11px] text-slate-400">Auto-Approved (Variance &lt; 5% Limit)</p>
          </div>

          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-sky-400 absolute -left-[17px] top-1" />
            <p className="font-semibold text-sky-300">4. Purchase Order Updated</p>
            <p className="text-[11px] text-slate-400">PO-2026-0891 state updated to ORDER_CONFIRMED</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-2">
        <button className="w-full py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Approve Action Manually</span>
        </button>
      </div>
    </div>
  );
};
