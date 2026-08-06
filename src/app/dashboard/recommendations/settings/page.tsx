'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sliders, Save, CheckCircle } from 'lucide-react';
import { RecommendationSettings } from '@/lib/forecast/recommendations';

export default function RecommendationSettingsPage() {
  const storeId = 'demo-store-001';
  const [settings, setSettings] = useState<RecommendationSettings>({
    storeId,
    confidenceThreshold: 0.60,
    explainabilityThreshold: 50.0,
    priorityThreshold: 'LOW' as any,
    autoExecuteEnabled: false,
    autoExecuteThreshold: 90.0,
    enabledCategories: ['INVENTORY', 'PROCUREMENT', 'PRICING', 'EXPIRY', 'FINANCIAL', 'RISK'] as any,
    enabledPlugins: ['StockoutRule', 'OverstockRule', 'ExpiryRule'],
    ttlHours: 48,
    notificationSettings: { email: true, inApp: true },
  });

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/forecast/recommendations/settings?storeId=${storeId}`)
      .then(res => res.json())
      .then(data => {
        if (data.settings) setSettings(data.settings);
      });
  }, []);

  const handleSave = async () => {
    const res = await fetch('/api/forecast/recommendations/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
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
        <Link href="/dashboard/recommendations/rules" className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition">
          Rule DSL & Plugins
        </Link>
        <Link href="/dashboard/recommendations/settings" className="px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
          Engine Settings
        </Link>
      </div>

      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Sliders className="w-6 h-6 text-indigo-400" />
            Recommendation Engine Configuration
          </h1>
          <p className="text-slate-400 text-sm">Tune confidence thresholds, auto-execution thresholds, and validity windows</p>
        </div>

        <button
          onClick={handleSave}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/25 flex items-center gap-2"
        >
          {saved ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-6 max-w-2xl text-sm">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase">Confidence Threshold (0.1 - 1.0)</label>
          <input
            type="number"
            step="0.05"
            min="0.1"
            max="1.0"
            value={settings.confidenceThreshold}
            onChange={e => setSettings({ ...settings, confidenceThreshold: parseFloat(e.target.value) })}
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase">Validity Window TTL (Hours)</label>
          <input
            type="number"
            value={settings.ttlHours}
            onChange={e => setSettings({ ...settings, ttlHours: parseInt(e.target.value, 10) })}
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
          />
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800">
          <div>
            <div className="text-sm font-bold text-slate-200">Enable Auto-Execution</div>
            <div className="text-xs text-slate-400">Automatically execute high-confidence recommendations</div>
          </div>
          <input
            type="checkbox"
            checked={settings.autoExecuteEnabled}
            onChange={e => setSettings({ ...settings, autoExecuteEnabled: e.target.checked })}
            className="w-5 h-5 accent-indigo-600 rounded"
          />
        </div>
      </div>
    </div>
  );
}
