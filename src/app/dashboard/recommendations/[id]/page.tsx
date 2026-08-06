'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  CheckCircle,
  Play,
  RotateCcw,
  Cpu,
  BarChart2,
} from 'lucide-react';
import { Recommendation } from '@/lib/forecast/recommendations';

export default function RecommendationDetailPage({ params }: { params: { id: string } }) {
  const [recommendation] = useState<Recommendation>({
    id: params.id,
    storeId: 'demo-store-001',
    productId: 'PROD-001',
    type: 'ORDER_MORE' as any,
    category: 'INVENTORY' as any,
    priority: 'CRITICAL' as any,
    status: 'GENERATED' as any,
    version: 1,
    confidence: 0.91,
    explainabilityScore: 92,
    riskScore: 80,
    score: 88,
    reason: 'Current stock (12 units) is below projected forecast demand (85 units) and safety threshold (30 units).',
    validUntil: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    financialImpact: {
      expectedProfit: 3400.0,
      expectedSavings: 480.0,
      expectedRevenue: 13600.0,
      expectedCost: 10200.0,
      expectedInventoryReduction: 0,
      blockedCapitalReleased: 0,
    },
    simulationResults: {
      before: { inventoryLevel: 12, cashAvailable: 100000, holdingCost: 288, expectedRevenue: 1920 },
      after: { inventoryLevel: 97, cashAvailable: 89800, holdingCost: 2328, expectedRevenue: 15520 },
      delta: { inventoryDelta: 85, cashDelta: -10200, supplierCapacityDelta: -85, forecastImpactDelta: 85, expectedProfitDelta: 3400 },
    },
    explanationDetails: {
      whyGenerated: 'Action ORDER_MORE triggered for Organic Whole Milk 1L due to projected stock deficit.',
      supportingForecasts: ['Prediction ID: PRED-MLK-101', 'Demand Forecast: 85 units', 'Confidence: 91.0%'],
      supportingFeatures: { currentStock: 12, safetyStock: 30, reorderPoint: 45, unitCost: 120, unitPrice: 160 },
      supportingInventory: { productName: 'Organic Whole Milk 1L', expiryDate: '2026-08-16' },
      expectedOutcome: 'Executing ORDER_MORE delivers $3,400 expected gross profit and prevents stockout.',
      riskAssessment: 'CRITICAL STOCKOUT RISK: Stock is below safety threshold.',
      confidenceJustification: 'Verified model confidence of 91% and telemetry stock ledger.',
      alternativeActions: ['Manual inventory count', 'Inter-store transfer from Store B'],
    },
    generatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const [executing, setExecuting] = useState(false);

  const handleExecute = async () => {
    setExecuting(true);
    try {
      await fetch('/api/forecast/recommendations/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendationId: recommendation.id }),
      });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/dashboard/recommendations"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Recommendation Center
        </Link>
      </div>

      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
              {recommendation.priority}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">
              {recommendation.category}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ID: {recommendation.id}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-slate-100">
            {recommendation.type} — Decision Detail
          </h1>
          <p className="text-slate-400 text-sm">{recommendation.reason}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExecute}
            disabled={executing}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition shadow-lg shadow-indigo-600/25 flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            {executing ? 'Executing Action...' : 'One-Click Execute'}
          </button>
        </div>
      </div>

      {/* Decision Scores Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
            <span>Recommendation Score</span>
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-indigo-400 mt-2">
            {recommendation.score} <span className="text-sm font-normal text-slate-500">/ 100</span>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
            <span>Explainability Score</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400 mt-2">
            {recommendation.explainabilityScore} <span className="text-sm font-normal text-slate-500">/ 100</span>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
            <span>Model Confidence</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-extrabold text-cyan-400 mt-2">
            {(recommendation.confidence * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Pre-Execution Simulator Widget (Before / After / Delta) */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-indigo-400" />
            Impact Simulator (Before / After / Delta)
          </h2>
          <span className="text-xs text-slate-400">Pre-execution digital twin simulation</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Before */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Before Execution</div>
            <div className="text-sm text-slate-300">Inventory Level: <strong>{recommendation.simulationResults?.before.inventoryLevel} units</strong></div>
            <div className="text-sm text-slate-300">Available Cash: <strong>${recommendation.simulationResults?.before.cashAvailable.toLocaleString()}</strong></div>
            <div className="text-sm text-slate-300">Holding Cost: <strong>${recommendation.simulationResults?.before.holdingCost}</strong></div>
          </div>

          {/* After */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">After Execution</div>
            <div className="text-sm text-slate-300">Inventory Level: <strong>{recommendation.simulationResults?.after.inventoryLevel} units</strong></div>
            <div className="text-sm text-slate-300">Available Cash: <strong>${recommendation.simulationResults?.after.cashAvailable.toLocaleString()}</strong></div>
            <div className="text-sm text-slate-300">Holding Cost: <strong>${recommendation.simulationResults?.after.holdingCost}</strong></div>
          </div>

          {/* Delta */}
          <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-2">
            <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Simulated Delta</div>
            <div className="text-sm text-slate-200">Inventory Delta: <strong className="text-emerald-400">+{recommendation.simulationResults?.delta.inventoryDelta} units</strong></div>
            <div className="text-sm text-slate-200">Cash Flow Delta: <strong className="text-amber-400">${recommendation.simulationResults?.delta.cashDelta}</strong></div>
            <div className="text-sm text-slate-200">Expected Profit Delta: <strong className="text-emerald-400">+${recommendation.simulationResults?.delta.expectedProfitDelta}</strong></div>
          </div>
        </div>
      </div>

      {/* Grounded Explanation & Evidence */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          Evidence-Grounded Explanation (Zero Hallucination)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="text-xs font-semibold text-slate-400 uppercase">Supporting Forecast Trace</div>
            <ul className="list-disc list-inside space-y-1 text-slate-300 text-xs">
              {recommendation.explanationDetails?.supportingForecasts.map((sf, idx) => (
                <li key={idx}>{sf}</li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="text-xs font-semibold text-slate-400 uppercase">Risk Assessment</div>
            <p className="text-xs text-amber-400 font-medium">
              {recommendation.explanationDetails?.riskAssessment}
            </p>
            <p className="text-xs text-slate-400 mt-2">
              {recommendation.explanationDetails?.confidenceJustification}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
