/**
 * Explanation Repository
 * Milestone 5 - Forecastify XAI
 */

import { Explanation, CounterfactualScenario } from './explanation-types';
import { createClient } from '@supabase/supabase-js';

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
};

export class ExplanationRepository {
  private store: Map<string, Explanation> = new Map();

  public async saveExplanation(explanation: Explanation): Promise<void> {
    this.store.set(explanation.explanationId, explanation);

    const supabase = getSupabase();
    if (!supabase) return;

    try {
      await supabase.from('explanation_records').upsert({
        explanation_id: explanation.explanationId,
        prediction_id: explanation.predictionId,
        recommendation_id: explanation.recommendationId,
        model_version: explanation.lineage.modelVersionId,
        feature_schema_version: explanation.lineage.featureSchemaId,
        explanation_version: explanation.metadata.version,
        explanation_type: explanation.explanationType,
        explanation_json: explanation,
        explanation_graph_json: explanation.graph,
        explanation_score: explanation.explainabilityScore.totalScore,
        quality_score: explanation.qualityMetrics.qualityScore,
        store_id: explanation.metadata.storeId,
        ttl_expires_at: explanation.metadata.ttlExpiresAt,
        updated_at: new Date().toISOString(),
      });

      await supabase.from('explanation_evidence').insert({
        explanation_id: explanation.explanationId,
        feature_ids: explanation.featureAttributions.map((f) => f.featureId),
        evidence_confidence_json: explanation.confidenceBreakdown.evidenceConfidenceMap,
        source_metadata: {
          evidenceCount: explanation.evidenceList.length,
          generatedAt: explanation.metadata.generatedAt,
        },
      });

      await supabase.from('explanation_lineage').insert({
        explanation_id: explanation.explanationId,
        prediction_id: explanation.predictionId,
        feature_vector_id: explanation.lineage.featureVectorId,
        model_version_id: explanation.lineage.modelVersionId,
        training_dataset_id: explanation.lineage.trainingDatasetId,
        feature_schema_id: explanation.lineage.featureSchemaId,
        recommendation_id: explanation.recommendationId,
        lineage_hash: explanation.lineage.lineageHash,
      });
    } catch {
      // Fallback gracefully to in-memory store if DB is unconfigured
    }
  }

  public async getExplanation(explanationId: string): Promise<Explanation | null> {
    if (this.store.has(explanationId)) {
      return this.store.get(explanationId)!;
    }

    const supabase = getSupabase();
    if (!supabase) return null;

    try {
      const { data } = await supabase
        .from('explanation_records')
        .select('explanation_json')
        .eq('explanation_id', explanationId)
        .single();
      return (data?.explanation_json as Explanation) || null;
    } catch {
      return null;
    }
  }

  public async saveCounterfactualRun(run: CounterfactualScenario): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      await supabase.from('counterfactual_runs').upsert({
        run_id: run.runId,
        session_id: run.sessionId,
        explanation_id: run.scenarioId,
        scenario_name: run.name,
        assumptions: run.assumptions,
        modified_inputs: run.modifiedInputs,
        simulated_outputs: run.simulatedOutputs,
      });
    } catch {
      // Ignore fallback
    }
  }

  public getAll(): Explanation[] {
    return Array.from(this.store.values());
  }

  public clear(): void {
    this.store.clear();
  }
}

export const explanationRepository = new ExplanationRepository();
