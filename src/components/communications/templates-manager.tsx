/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState } from 'react';
import { FileText, CheckCircle2, Clock, Plus, ShieldCheck } from 'lucide-react';

export const TemplatesManager: React.FC = () => {
  const [templates] = useState([
    {
      id: '1',
      name: 'po_send_v2',
      category: 'UTILITY',
      channel: 'whatsapp',
      version: 2,
      body: 'Namaste {{1}}! Purchase Order #{{2}} for {{3}} items (₹{{4}}) is placed. Delivery: {{5}}.',
      status: 'APPROVED',
      variables: ['supplier_name', 'po_number', 'item_count', 'total_amount', 'delivery_date'],
    },
    {
      id: '2',
      name: 'khata_reminder_v1',
      category: 'UTILITY',
      channel: 'whatsapp',
      version: 1,
      body: 'Namaste {{1}}! Gentle reminder regarding outstanding Khata balance of ₹{{2}}. Please use button below to clear.',
      status: 'APPROVED',
      variables: ['customer_name', 'balance'],
    },
    {
      id: '3',
      name: 'festival_greeting_v1',
      category: 'MARKETING',
      channel: 'whatsapp',
      version: 1,
      body: 'Wishing you a very Happy {{1}}! Visit us today for special offers up to {{2}}% off.',
      status: 'PENDING',
      variables: ['festival_name', 'discount_pct'],
    },
  ]);

  return (
    <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Message Templates & Immutable Versions</span>
          </h3>
          <p className="text-xs text-slate-400">Meta WhatsApp Cloud API registered template catalogue</p>
        </div>
        <button className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" />
          <span>New Template</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {templates.map((tpl) => (
          <div key={tpl.id} className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-slate-200">{tpl.name}</span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  tpl.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {tpl.status}
              </span>
            </div>

            <p className="text-xs text-slate-300 bg-slate-900/90 p-2 rounded border border-slate-800 font-mono text-[11px] leading-relaxed">
              {tpl.body}
            </p>

            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Category: {tpl.category}</span>
              <span className="font-mono text-purple-400">Version {tpl.version}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
