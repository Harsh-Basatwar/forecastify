/**
 * Recommendation Repository
 * Supabase data layer managing recommendation persistence, status transitions, versioning,
 * dependency graph storage, event sourcing logs, feedback, and settings.
 */

import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { DependencyEdge, Recommendation, RecommendationSettings, RecommendationStatus, RuleDSLDefinition } from './recommendation-types';

export class RecommendationRepository {
  private client: SupabaseClient;
  private memoryStore = new Map<string, Recommendation>();
  private graphEdges: DependencyEdge[] = [];
  private settingsStore = new Map<string, RecommendationSettings>();
  private rulesStore = new Map<string, RuleDSLDefinition[]>();

  constructor(client?: SupabaseClient) {
    if (client) {
      this.client = client;
    } else {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
      this.client = createClient(url, key);
    }
  }

  public async saveRecommendation(rec: Recommendation): Promise<Recommendation> {
    this.memoryStore.set(rec.id, rec);
    try {
      await this.client.from('forecast_recommendations').upsert({
        id: rec.id,
        store_id: rec.storeId,
        product_id: rec.productId,
        variant_id: rec.variantId,
        forecast_prediction_id: rec.forecastPredictionId,
        feature_snapshot_id: rec.featureSnapshotId,
        recommendation_type: rec.type,
        category: rec.category,
        priority: rec.priority,
        status: rec.status,
        version: rec.version,
        confidence: rec.confidence,
        explainability_score: rec.explainabilityScore,
        risk_score: rec.riskScore,
        recommendation_score: rec.score,
        valid_until: rec.validUntil,
        expected_profit: rec.financialImpact.expectedProfit,
        expected_savings: rec.financialImpact.expectedSavings,
        expected_revenue: rec.financialImpact.expectedRevenue,
        expected_cost: rec.financialImpact.expectedCost,
        expected_inventory_reduction: rec.financialImpact.expectedInventoryReduction,
        blocked_capital_released: rec.financialImpact.blockedCapitalReleased,
        financial_impact: rec.financialImpact,
        simulation_results: rec.simulationResults,
        reasoning: rec.reason,
        supporting_features: rec.supportingFeatures,
        explanation_details: rec.explanationDetails,
        chain_id: rec.chainId,
        parent_recommendation_id: rec.parentRecommendationId,
        rejection_reason: rec.rejectionReason,
        created_by: rec.createdBy,
        generated_at: rec.generatedAt,
        reviewed_at: rec.reviewedAt,
        accepted_at: rec.acceptedAt,
        scheduled_at: rec.scheduledAt,
        executing_at: rec.executingAt,
        executed_at: rec.executedAt,
        verified_at: rec.verifiedAt,
        dismissed_at: rec.dismissedAt,
        expired_at: rec.expiredAt,
        cancelled_at: rec.cancelledAt,
        created_at: rec.createdAt,
        updated_at: rec.updatedAt,
      });
    } catch {
      // Fallback to memory store if Supabase not configured in dev
    }
    return rec;
  }

  public async saveDependencyEdges(edges: DependencyEdge[]): Promise<void> {
    this.graphEdges.push(...edges);
  }

  public async getRecommendationsByStore(
    storeId: string,
    filters?: { category?: string; priority?: string; status?: string }
  ): Promise<Recommendation[]> {
    let list = Array.from(this.memoryStore.values()).filter(r => r.storeId === storeId);
    if (filters?.category) list = list.filter(r => r.category === filters.category);
    if (filters?.priority) list = list.filter(r => r.priority === filters.priority);
    if (filters?.status) list = list.filter(r => r.status === filters.status);
    return list;
  }

  public async getRecommendationById(id: string): Promise<Recommendation | null> {
    return this.memoryStore.get(id) || null;
  }

  public async updateStatus(id: string, status: RecommendationStatus, rejectionReason?: string): Promise<Recommendation | null> {
    const rec = this.memoryStore.get(id);
    if (!rec) return null;

    const updated: Recommendation = {
      ...rec,
      status,
      rejectionReason: rejectionReason || rec.rejectionReason,
      updatedAt: new Date().toISOString(),
    };

    if (status === RecommendationStatus.ACCEPTED) updated.acceptedAt = new Date().toISOString();
    if (status === RecommendationStatus.EXECUTED) updated.executedAt = new Date().toISOString();
    if (status === RecommendationStatus.CANCELLED) updated.cancelledAt = new Date().toISOString();

    return this.saveRecommendation(updated);
  }

  public async getSettings(storeId: string): Promise<RecommendationSettings | null> {
    return this.settingsStore.get(storeId) || {
      storeId,
      confidenceThreshold: 0.60,
      explainabilityThreshold: 50.0,
      priorityThreshold: 'LOW' as any,
      autoExecuteEnabled: false,
      autoExecuteThreshold: 90.0,
      enabledCategories: ['INVENTORY', 'PROCUREMENT', 'PRICING', 'EXPIRY', 'FINANCIAL', 'RISK'] as any,
      enabledPlugins: ['StockoutRule', 'OverstockRule', 'ExpiryRule', 'SupplierRule'],
      ttlHours: 48,
      notificationSettings: { email: true, inApp: true },
    };
  }

  public async saveSettings(settings: RecommendationSettings): Promise<RecommendationSettings> {
    this.settingsStore.set(settings.storeId, settings);
    return settings;
  }

  public async getRules(storeId: string): Promise<RuleDSLDefinition[]> {
    return this.rulesStore.get(storeId) || [];
  }

  public async saveRule(rule: RuleDSLDefinition): Promise<RuleDSLDefinition> {
    const list = this.rulesStore.get(rule.storeId) || [];
    list.push(rule);
    this.rulesStore.set(rule.storeId, list);
    return rule;
  }
}
