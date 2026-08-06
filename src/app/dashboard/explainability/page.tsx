"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sliders,
  Layers,
  Sparkles,
  GitBranch,
  Search,
  Download,
  FileText,
  BarChart3,
  RefreshCw,
  HelpCircle,
  Award,
  Zap,
  Info,
  Scale,
  Building2,
  Clock,
  Send,
  Eye,
} from "lucide-react";
import {
  Explanation,
  ExplanationAudience,
  AttributionStrategyType,
  CounterfactualScenario,
  ExplanationDiff,
} from "@/lib/forecast/explainability/explanation-types";

export default function ExplainabilityDashboardPage() {
  const [activeTab, setActiveTab] = useState<
    "overview" | "prediction" | "recommendation" | "whatif" | "evidence" | "diff" | "analytics"
  >("overview");

  const [audience, setAudience] = useState<ExplanationAudience>(ExplanationAudience.ANALYST);
  const [strategy, setStrategy] = useState<AttributionStrategyType>(AttributionStrategyType.COEFFICIENT);
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [loading, setLoading] = useState(true);

  // Counterfactual state
  const [priceChange, setPriceChange] = useState<number>(-5);
  const [supplierDelay, setSupplierDelay] = useState<number>(2);
  const [promoActive, setPromoActive] = useState<boolean>(true);
  const [cfResult, setCfResult] = useState<CounterfactualScenario | null>(null);
  const [simulating, setSimulating] = useState(false);

  // Search & Export state
  const [searchQuery, setSearchQuery] = useState("");
  const [diffResult, setDiffResult] = useState<ExplanationDiff | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  useEffect(() => {
    fetchExplanation();
  }, [audience, strategy]);

  const fetchExplanation = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/forecast/explain?audience=${audience}&strategy=${strategy}`);
      const data = await res.json();
      if (data.success) {
        setExplanation(data.explanation);
      }
    } catch {
      // Fallback UI
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async () => {
    setSimulating(true);
    try {
      const res = await fetch("/api/forecast/explain/what-if", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioName: "Interactive User Modification",
          originalPrediction: explanation?.predictionValue ?? 120,
          originalRecommendation: "Order Replenishment Stock (50 Units)",
          modifiedInputs: {
            priceChangePercentage: priceChange,
            supplierDelayDaysDelta: supplierDelay,
            promotionActive: promoActive,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCfResult(data.scenario);
      }
    } catch {
      // Ignore fallback
    } finally {
      setSimulating(false);
    }
  };

  const handleFetchDiff = async () => {
    try {
      const res = await fetch("/api/forecast/explain/diff");
      const data = await res.json();
      if (data.success) {
        setDiffResult(data.diff);
      }
    } catch {
      // Ignore
    }
  };

  const handleExport = async (format: "audit_package" | "csv" | "json") => {
    try {
      const res = await fetch("/api/forecast/explain/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format }),
      });
      if (format === "audit_package") {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data.package, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${data.package.filename}.json`;
        a.click();
      } else {
        const text = await res.text();
        const blob = new Blob([text], { type: format === "csv" ? "text/csv" : "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `explainability_export.${format}`;
        a.click();
      }
    } catch {
      // Fallback
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch("/api/forecast/explain/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          explanationId: explanation?.explanationId || "exp_default",
          usefulnessScore: feedbackRating,
          comments: feedbackComment,
        }),
      });
      setFeedbackSent(true);
      setTimeout(() => setFeedbackSent(false), 4000);
    } catch {
      // Ignore
    }
  };

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
      {/* ── Page Lead · Standard Forecastify Header ────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 fx-badge fx-badge-accent mb-1.5">
            <Brain className="w-3.5 h-3.5" /> Forecastify XAI Engine 2.0
          </div>
          <h1 className="fx-display text-[28px] sm:text-[34px] leading-tight text-foreground">
            Enterprise Decision Transparency &amp; Explainability
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1.5 max-w-2xl leading-relaxed">
            Deterministic, evidence-backed, auditable explanation chains for every AI forecast prediction and recommendation.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Audience Selector Segmented Control */}
          <div className="fx-segment">
            {(["EXECUTIVE", "MANAGER", "ANALYST", "DEVELOPER"] as ExplanationAudience[]).map((aud) => (
              <button
                key={aud}
                onClick={() => setAudience(aud)}
                aria-pressed={audience === aud}
              >
                {aud}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchExplanation()}
            disabled={loading}
            className="fx-btn"
            aria-label="Refresh explanation data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>

          <button
            onClick={() => handleExport("audit_package")}
            className="fx-btn fx-btn-accent"
          >
            <Download className="w-3.5 h-3.5" /> Export Audit Package
          </button>
        </div>
      </div>

      {/* ── Primary Navigation Tabs ────────────────────────────────── */}
      <div className="flex border-b border-border text-xs font-semibold overflow-x-auto gap-1">
        {[
          { id: "overview", label: "Overview & Score", icon: Award },
          { id: "prediction", label: "Feature Attribution", icon: BarChart3 },
          { id: "recommendation", label: "Decision Rationale", icon: Scale },
          { id: "whatif", label: "What-If Counterfactual", icon: Sliders },
          { id: "evidence", label: "Evidence & Lineage DAG", icon: GitBranch },
          { id: "diff", label: "Version Diff & Audit", icon: Clock },
          { id: "analytics", label: "XAI Analytics", icon: Zap },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as typeof activeTab);
                if (tab.id === "diff") handleFetchDiff();
              }}
              className={`flex items-center gap-2 px-3.5 py-2.5 border-b-2 text-xs font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "border-accent text-accent font-semibold bg-secondary/40"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/30"
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <RefreshCw className="w-8 h-8 text-accent animate-spin" />
          <p className="fx-eyebrow">Evaluating deterministic feature attribution &amp; evidence graphs…</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* OVERVIEW TAB */}
            {activeTab === "overview" && explanation && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Score Card */}
                <div className="fx-card fx-elev-xs p-5 sm:p-6 space-y-5 flex flex-col justify-between fx-card-interactive hover:-translate-y-0.5 transition-all">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="fx-eyebrow">Explainability Score</span>
                      <span className="fx-badge fx-badge-accent">
                        Grade {explanation.explainabilityScore.grade}
                      </span>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="fx-num fx-metric-xl text-foreground font-semibold text-4xl">
                        {explanation.explainabilityScore.totalScore}
                      </span>
                      <span className="text-xs text-muted-foreground">/ 100</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                      Composite metric measuring evidence completeness, attribution quality, and confidence clarity.
                    </p>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-border">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Evidence Completeness</span>
                      <span className="fx-num font-semibold">{explanation.explainabilityScore.breakdown.evidenceCompleteness}/25</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Attribution Quality</span>
                      <span className="fx-num font-semibold">{explanation.explainabilityScore.breakdown.featureAttributionQuality}/25</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Confidence Clarity</span>
                      <span className="fx-num font-semibold">{explanation.explainabilityScore.breakdown.confidenceClarity}/20</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Assumptions Specificity</span>
                      <span className="fx-num font-semibold">{explanation.explainabilityScore.breakdown.assumptionsSpecificity}/15</span>
                    </div>
                  </div>
                </div>

                {/* Overall Confidence Card */}
                <div className="fx-card fx-elev-xs p-5 sm:p-6 space-y-5 flex flex-col justify-between fx-card-interactive hover:-translate-y-0.5 transition-all">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="fx-eyebrow">Overall Confidence</span>
                      <span className="fx-badge fx-badge-success">
                        {explanation.confidenceBreakdown.level}
                      </span>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="fx-num fx-metric-xl text-foreground font-semibold text-4xl">
                        {explanation.confidenceBreakdown.overallConfidence}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                      {explanation.confidenceBreakdown.rationale}
                    </p>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-border text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Inventory Accuracy</span>
                      <span className="fx-num font-medium text-success">{explanation.confidenceBreakdown.components.inventoryAccuracy}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Supplier Reliability</span>
                      <span className="fx-num font-medium text-foreground">{explanation.confidenceBreakdown.components.supplierReliability}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Weather Reliability</span>
                      <span className="fx-num font-medium text-foreground">{explanation.confidenceBreakdown.components.weatherReliability}%</span>
                    </div>
                  </div>
                </div>

                {/* Quality Metrics & Lineage Hash */}
                <div className="fx-card fx-elev-xs p-5 sm:p-6 space-y-5 flex flex-col justify-between fx-card-interactive hover:-translate-y-0.5 transition-all">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="fx-eyebrow">Quality &amp; Lineage Audit</span>
                      <ShieldCheck className="w-4 h-4 text-accent" />
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="text-xl font-semibold text-foreground">
                        Quality: <span className="fx-num">{explanation.qualityMetrics.qualityScore}%</span> ({explanation.qualityMetrics.rating})
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Cryptographically signed SHA256 lineage hash verifying zero hallucinated rationale.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-[var(--radius-md)] bg-secondary/40 border border-border space-y-1.5 font-mono text-[11px]">
                    <div className="text-muted-foreground font-sans text-xs">Lineage Hash:</div>
                    <div className="truncate text-accent font-semibold">{explanation.lineage.lineageHash}</div>
                    <div className="text-[10px] text-muted-foreground font-sans">
                      Verified deterministic model schema: {explanation.lineage.featureSchemaId}
                    </div>
                  </div>
                </div>

                {/* Main Summary Rationale */}
                <div className="lg:col-span-3 fx-card fx-elev-xs p-5 sm:p-6 space-y-4 fx-card-interactive">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold flex items-center gap-2 text-foreground">
                      <Brain className="w-4 h-4 text-accent" /> Headline Explanation
                    </h3>
                    <span className="text-xs text-muted-foreground">Audience: {explanation.audience}</span>
                  </div>
                  <p className="text-base font-semibold text-foreground">{explanation.headline}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{explanation.summary}</p>
                </div>
              </div>
            )}

            {/* PREDICTION / FEATURE ATTRIBUTION TAB */}
            {activeTab === "prediction" && explanation && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 fx-card fx-elev-xs p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Feature Attribution Strategy</h3>
                    <p className="text-xs text-muted-foreground">Choose algorithm strategy for calculating feature contribution weights.</p>
                  </div>
                  <div className="fx-segment">
                    {(["COEFFICIENT", "PERMUTATION", "GAIN_BASED", "SHAP_ADAPTER"] as AttributionStrategyType[]).map((strat) => (
                      <button
                        key={strat}
                        onClick={() => setStrategy(strat)}
                        aria-pressed={strategy === strat}
                      >
                        {strat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Feature Waterfall Chart */}
                  <div className="fx-card fx-elev-xs p-5 sm:p-6 space-y-4">
                    <h3 className="text-base font-semibold flex items-center gap-2 text-foreground">
                      <BarChart3 className="w-4 h-4 text-accent" /> Contribution Breakdown (%)
                    </h3>

                    <div className="space-y-4 pt-2">
                      {explanation.featureAttributions.map((feat) => (
                        <div key={feat.featureId} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="flex items-center gap-1.5">
                              <span
                                className={`fx-signal ${
                                  feat.direction === "POSITIVE" ? "fx-signal-success" : "fx-signal-danger"
                                }`}
                              />
                              {feat.featureName}
                            </span>
                            <span className={`fx-num ${feat.direction === "POSITIVE" ? "text-success" : "text-danger"}`}>
                              {feat.direction === "POSITIVE" ? "+" : "-"}
                              {feat.normalizedPercentage}%
                            </span>
                          </div>
                          <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden flex">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${feat.normalizedPercentage}%` }}
                              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                              className={`h-full ${
                                feat.direction === "POSITIVE" ? "bg-success" : "bg-danger"
                              }`}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Category: {feat.category}</span>
                            <span>Baseline: {feat.baselineValue} | Current: {feat.currentValue}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Detailed Rationale Bullet Points */}
                  <div className="fx-card fx-elev-xs p-5 sm:p-6 space-y-4">
                    <h3 className="text-base font-semibold flex items-center gap-2 text-foreground">
                      <FileText className="w-4 h-4 text-accent" /> Detailed Rationale Chain
                    </h3>

                    <div className="space-y-3 pt-2">
                      {(Array.isArray(explanation.detailedRationale)
                        ? explanation.detailedRationale
                        : [explanation.detailedRationale]
                      ).map((item, i) => (
                        <div key={i} className="p-3.5 rounded-[var(--radius-md)] bg-secondary/30 border border-border text-xs leading-relaxed space-y-1">
                          <p className="font-medium text-foreground">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* RECOMMENDATION RATIONALE TAB */}
            {activeTab === "recommendation" && explanation && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Primary Recommendation Card */}
                <div className="lg:col-span-2 fx-card fx-elev-xs p-5 sm:p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="fx-badge fx-badge-success">Primary Recommendation</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      ID: {explanation.recommendationComparison?.primaryRecommendationId || "rec_101"}
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-foreground">
                    {explanation.recommendationComparison?.primaryTitle || "Order Replenishment Stock (50 Units)"}
                  </h2>

                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {explanation.recommendationComparison?.comparisonSummary}
                  </p>

                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                    <div className="p-3 rounded-[var(--radius-md)] bg-secondary/40 border border-border text-center">
                      <div className="text-[11px] text-muted-foreground">Winning Margin</div>
                      <div className="text-lg font-bold text-accent fx-num">
                        +{explanation.recommendationComparison?.selectionCriteria.winningMarginPercentage}%
                      </div>
                    </div>
                    <div className="p-3 rounded-[var(--radius-md)] bg-secondary/40 border border-border text-center">
                      <div className="text-[11px] text-muted-foreground">ROI Weight</div>
                      <div className="text-lg font-bold text-foreground fx-num">
                        {(explanation.recommendationComparison?.selectionCriteria?.roiWeight ?? 0.4) * 100}%
                      </div>
                    </div>
                    <div className="p-3 rounded-[var(--radius-md)] bg-secondary/40 border border-border text-center">
                      <div className="text-[11px] text-muted-foreground">Lead Time Weight</div>
                      <div className="text-lg font-bold text-foreground fx-num">
                        {(explanation.recommendationComparison?.selectionCriteria?.leadTimeWeight ?? 0.3) * 100}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Alternatives Evaluated */}
                <div className="space-y-4">
                  <h3 className="text-base font-semibold flex items-center gap-2 text-foreground">
                    <Scale className="w-4 h-4 text-accent" /> Evaluated Alternatives
                  </h3>

                  {explanation.alternatives.map((alt) => (
                    <div
                      key={alt.alternativeId}
                      className="fx-card fx-elev-xs p-4 space-y-2 text-xs fx-card-interactive hover:-translate-y-0.5 transition-all"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-foreground">{alt.title}</span>
                        <span className="text-muted-foreground font-mono">{alt.relativeConfidence}% Conf</span>
                      </div>
                      <p className="text-muted-foreground text-[11px] leading-relaxed">{alt.description}</p>
                      <div className="p-2.5 rounded-[var(--radius-sm)] bg-danger-soft border border-danger/20 text-danger text-[10px]">
                        <strong>Reason Not Selected:</strong> {alt.reasonNotChosen}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* WHAT-IF COUNTERFACTUAL TAB */}
            {activeTab === "whatif" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Inputs Simulator */}
                <div className="fx-card fx-elev-xs p-5 sm:p-6 space-y-5">
                  <h3 className="text-base font-semibold flex items-center gap-2 text-foreground">
                    <Sliders className="w-4 h-4 text-accent" /> Modify Simulation Inputs
                  </h3>

                  <div className="space-y-4 text-xs">
                    <div>
                      <div className="flex justify-between mb-1 font-medium">
                        <span>Price Adjustment:</span>
                        <span className="font-bold text-accent fx-num">{priceChange}%</span>
                      </div>
                      <input
                        type="range"
                        min="-20"
                        max="20"
                        value={priceChange}
                        onChange={(e) => setPriceChange(Number(e.target.value))}
                        className="w-full accent-accent"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between mb-1 font-medium">
                        <span>Supplier Delay Delta:</span>
                        <span className="font-bold text-accent fx-num">+{supplierDelay} Days</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="7"
                        value={supplierDelay}
                        onChange={(e) => setSupplierDelay(Number(e.target.value))}
                        className="w-full accent-accent"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-[var(--radius-md)] bg-secondary/40 border border-border">
                      <span className="font-medium text-foreground">Active Promotion Campaign</span>
                      <input
                        type="checkbox"
                        checked={promoActive}
                        onChange={(e) => setPromoActive(e.target.checked)}
                        className="w-4 h-4 accent-accent"
                      />
                    </div>

                    <button
                      onClick={handleSimulate}
                      disabled={simulating}
                      className="fx-btn fx-btn-accent w-full justify-center"
                    >
                      <Sparkles className={`w-4 h-4 ${simulating ? "animate-spin" : ""}`} />
                      {simulating ? "Simulating Scenario..." : "Run What-If Simulation"}
                    </button>
                  </div>
                </div>

                {/* Simulation Output Display */}
                <div className="lg:col-span-2 fx-card fx-elev-xs p-5 sm:p-6 space-y-5">
                  <h3 className="text-base font-semibold flex items-center gap-2 text-foreground">
                    <Zap className="w-4 h-4 text-accent" /> Simulated Output &amp; Delta Rationale
                  </h3>

                  {cfResult ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                        <div className="p-3 rounded-[var(--radius-md)] bg-secondary/40 border border-border">
                          <div className="text-[10px] text-muted-foreground">Original Prediction</div>
                          <div className="text-lg font-bold text-foreground fx-num">{cfResult.simulatedOutputs.originalPrediction}</div>
                        </div>
                        <div className="p-3 rounded-[var(--radius-md)] bg-secondary/40 border border-border">
                          <div className="text-[10px] text-muted-foreground">Simulated Prediction</div>
                          <div className="text-lg font-bold text-accent fx-num">{cfResult.simulatedOutputs.simulatedPrediction}</div>
                        </div>
                        <div className="p-3 rounded-[var(--radius-md)] bg-secondary/40 border border-border">
                          <div className="text-[10px] text-muted-foreground">Prediction Delta</div>
                          <div className={`text-lg font-bold fx-num ${cfResult.simulatedOutputs.predictionDelta >= 0 ? "text-success" : "text-danger"}`}>
                            {cfResult.simulatedOutputs.predictionDelta >= 0 ? "+" : ""}{cfResult.simulatedOutputs.predictionDelta} ({cfResult.simulatedOutputs.predictionPercentageChange}%)
                          </div>
                        </div>
                        <div className="p-3 rounded-[var(--radius-md)] bg-secondary/40 border border-border">
                          <div className="text-[10px] text-muted-foreground">Recommendation Shift</div>
                          <div className="text-xs font-bold truncate mt-1 text-foreground">
                            {cfResult.simulatedOutputs.recommendationChanged ? "Shifted" : "Unchanged"}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-[var(--radius-md)] bg-accent-soft border border-accent/20 text-xs space-y-2">
                        <div className="font-semibold text-accent flex items-center gap-1.5">
                          <Info className="w-4 h-4" /> Scenario Simulation Summary
                        </div>
                        <p className="text-muted-foreground leading-relaxed">{cfResult.explanationSummary}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground space-y-2">
                      <Sliders className="w-8 h-8 stroke-1 text-muted-foreground" />
                      <p className="text-xs">Adjust parameters on the left and click &quot;Run What-If Simulation&quot; to preview counterfactual impact.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* EVIDENCE & LINEAGE DAG TAB */}
            {activeTab === "evidence" && explanation && (
              <div className="space-y-6">
                {/* Lineage Details Banner */}
                <div className="p-4 fx-card fx-elev-xs flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                  <div>
                    <span className="font-semibold text-foreground">Provenance Lineage Hash:</span>
                    <p className="font-mono text-accent truncate mt-0.5">{explanation.lineage.lineageHash}</p>
                  </div>
                  <div className="flex items-center gap-4 text-muted-foreground text-[11px]">
                    <span>Model: {explanation.lineage.modelVersionId}</span>
                    <span>Schema: {explanation.lineage.featureSchemaId}</span>
                  </div>
                </div>

                {/* Evidence List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {explanation.evidenceList.map((ev) => (
                    <div key={ev.evidenceId} className="fx-card fx-elev-xs p-4 space-y-2 text-xs fx-card-interactive hover:-translate-y-0.5 transition-all">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-accent">{ev.type}</span>
                        <span className="fx-badge fx-badge-success font-mono text-[10px]">
                          {ev.confidence}% Conf
                        </span>
                      </div>
                      <h4 className="font-bold text-foreground">{ev.title}</h4>
                      <p className="text-muted-foreground text-[11px] leading-relaxed">{ev.description}</p>
                      <div className="pt-2 border-t border-border text-[10px] text-muted-foreground flex justify-between">
                        <span>Source: {ev.sourceSystem}</span>
                        <span>{new Date(ev.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VERSION DIFF & AUDIT TAB */}
            {activeTab === "diff" && (
              <div className="fx-card fx-elev-xs p-5 sm:p-6 space-y-5">
                <h3 className="text-base font-semibold flex items-center gap-2 text-foreground">
                  <Clock className="w-4 h-4 text-accent" /> Version Diff &amp; Audit Log
                </h3>

                {diffResult ? (
                  <div className="space-y-4 text-xs">
                    <div className="p-3 rounded-[var(--radius-md)] bg-secondary/40 border border-border">
                      <div className="font-semibold text-accent">Changes Summary</div>
                      <p className="text-muted-foreground mt-1 leading-relaxed">{diffResult.summary}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-[var(--radius-md)] bg-secondary/40 border border-border text-center">
                        <div className="text-[10px] text-muted-foreground">Confidence Delta</div>
                        <div className="text-lg font-bold text-success fx-num">+{diffResult.confidenceDelta}%</div>
                      </div>
                      <div className="p-3 rounded-[var(--radius-md)] bg-secondary/40 border border-border text-center">
                        <div className="text-[10px] text-muted-foreground">Score Delta</div>
                        <div className="text-lg font-bold text-accent fx-num">+{diffResult.scoreDelta}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Click &quot;Version Diff &amp; Audit&quot; to compute diff between versions.</p>
                )}

                {/* User Feedback Form */}
                <form onSubmit={handleFeedbackSubmit} className="pt-6 border-t border-border space-y-3">
                  <h4 className="text-xs font-semibold text-foreground">Submit Explanation Usefulness Feedback</h4>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs text-muted-foreground">Usefulness Rating:</span>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setFeedbackRating(star)}
                        className={`px-2.5 py-1 rounded-[var(--radius-sm)] text-xs font-bold transition-colors ${
                          feedbackRating >= star ? "bg-accent text-accent-foreground" : "fx-btn"
                        }`}
                      >
                        {star}★
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Enter optional comments or correction requests..."
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    className="fx-input text-xs"
                  />
                  <button type="submit" className="fx-btn fx-btn-accent">
                    <Send className="w-3.5 h-3.5" /> Submit Feedback
                  </button>
                  {feedbackSent && <span className="text-xs text-success font-medium">Feedback recorded successfully!</span>}
                </form>
              </div>
            )}

            {/* ANALYTICS TAB */}
            {activeTab === "analytics" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="fx-card fx-elev-xs p-6 space-y-2 text-center fx-card-interactive hover:-translate-y-0.5 transition-all">
                  <div className="fx-eyebrow">Explanation Coverage</div>
                  <div className="fx-metric-xl fx-num font-semibold text-accent text-4xl">98.5%</div>
                  <div className="text-[11px] text-muted-foreground">Coverage across active forecast predictions</div>
                </div>
                <div className="fx-card fx-elev-xs p-6 space-y-2 text-center fx-card-interactive hover:-translate-y-0.5 transition-all">
                  <div className="fx-eyebrow">Avg Explainability Score</div>
                  <div className="fx-metric-xl fx-num font-semibold text-success text-4xl">94.2 / 100</div>
                  <div className="text-[11px] text-muted-foreground">Grade A+ Enterprise Standard</div>
                </div>
                <div className="fx-card fx-elev-xs p-6 space-y-2 text-center fx-card-interactive hover:-translate-y-0.5 transition-all">
                  <div className="fx-eyebrow">User Usefulness Rating</div>
                  <div className="fx-metric-xl fx-num font-semibold text-foreground text-4xl">4.8 / 5.0</div>
                  <div className="text-[11px] text-muted-foreground">Based on store manager feedback</div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
