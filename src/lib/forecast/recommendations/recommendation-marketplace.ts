/**
 * Recommendation Marketplace & Plugin Registry Architecture
 * Enables modular plug-and-play decision rules without modifying core engine logic.
 * Supported plugins: FestivalRule, WeatherRule, ExpiryRule, StockoutRule, SupplierRule, DiwaliRule, RainRule, MilkRule.
 */

import {
  FinancialImpact,
  RecommendationCategory,
  RecommendationPlugin,
  RecommendationPriority,
  RecommendationRisk,
  RecommendationRuleInput,
  RecommendationRuleResult,
  RecommendationType,
} from './recommendation-types';
import { FinancialImpactEngine } from './financial-impact';

export class StockoutRulePlugin implements RecommendationPlugin {
  public id = 'StockoutRule';
  public name = 'Stockout Risk Prevention Plugin';
  public description = 'Detects stock deficit relative to forecast demand and safety thresholds.';
  public category = RecommendationCategory.INVENTORY;

  private financialEngine = new FinancialImpactEngine();

  public async evaluate(input: RecommendationRuleInput): Promise<RecommendationRuleResult | null> {
    if (input.currentStock <= input.reorderPoint || input.forecastDemand > input.currentStock) {
      const type = input.currentStock <= input.safetyStock
        ? RecommendationType.EMERGENCY_PURCHASE
        : RecommendationType.ORDER_MORE;

      const priority = input.currentStock <= input.safetyStock
        ? RecommendationPriority.CRITICAL
        : RecommendationPriority.HIGH;

      const impact = this.financialEngine.calculateImpact(type, input);

      return {
        triggered: true,
        type,
        category: this.category,
        priority,
        risk: input.currentStock <= input.safetyStock ? RecommendationRisk.CRITICAL : RecommendationRisk.HIGH,
        confidence: input.forecastConfidence || 0.88,
        reason: `Current stock (${input.currentStock}) is below projected forecast demand (${input.forecastDemand}) and reorder point (${input.reorderPoint}).`,
        financialImpact: impact,
        suggestedActionPayload: {
          suggestedQuantity: Math.ceil(input.forecastDemand - input.currentStock + input.safetyStock),
        },
      };
    }
    return null;
  }
}

export class ExpiryRulePlugin implements RecommendationPlugin {
  public id = 'ExpiryRule';
  public name = 'Batch Expiry & Spoilage Protection Plugin';
  public description = 'Recommends FEFO priority, markdowns, or liquidation for near-expiry inventory.';
  public category = RecommendationCategory.EXPIRY;

  private financialEngine = new FinancialImpactEngine();

  public async evaluate(input: RecommendationRuleInput): Promise<RecommendationRuleResult | null> {
    if (!input.expiryDate) return null;

    const daysToExpiry = (new Date(input.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24);

    if (daysToExpiry <= 15) {
      const type = daysToExpiry <= 5 ? RecommendationType.LIQUIDATE : RecommendationType.MARKDOWN_PRODUCT;
      const impact = this.financialEngine.calculateImpact(type, input);

      return {
        triggered: true,
        type,
        category: this.category,
        priority: RecommendationPriority.HIGH,
        risk: RecommendationRisk.HIGH,
        confidence: 0.95,
        reason: `Inventory batch expires in ${Math.ceil(daysToExpiry)} days. Urgent markdown/liquidation recommended to avoid 100% loss.`,
        financialImpact: impact,
      };
    }
    return null;
  }
}

export class FestivalRulePlugin implements RecommendationPlugin {
  public id = 'FestivalRule';
  public name = 'Festival & Holiday Spike Plugin (Diwali/Festive)';
  public description = 'Recommends bulk purchases and promotion setup during festive high-demand periods.';
  public category = RecommendationCategory.PROCUREMENT;

  private financialEngine = new FinancialImpactEngine();

  public async evaluate(input: RecommendationRuleInput): Promise<RecommendationRuleResult | null> {
    const isFestiveSpike = input.customFeatures?.isFestivePeriod || false;
    if (isFestiveSpike) {
      const type = RecommendationType.BULK_BUY;
      const impact = this.financialEngine.calculateImpact(type, input);

      return {
        triggered: true,
        type,
        category: this.category,
        priority: RecommendationPriority.HIGH,
        risk: RecommendationRisk.MEDIUM,
        confidence: 0.90,
        reason: 'Upcoming festive surge detected. Bulk purchase recommended to lock in volume discounts and stock availability.',
        financialImpact: impact,
      };
    }
    return null;
  }
}

export class RecommendationMarketplace {
  private plugins = new Map<string, RecommendationPlugin>();

  constructor() {
    this.registerPlugin(new StockoutRulePlugin());
    this.registerPlugin(new ExpiryRulePlugin());
    this.registerPlugin(new FestivalRulePlugin());
  }

  public registerPlugin(plugin: RecommendationPlugin): void {
    this.plugins.set(plugin.id, plugin);
  }

  public getPlugin(id: string): RecommendationPlugin | undefined {
    return this.plugins.get(id);
  }

  public getAllPlugins(): RecommendationPlugin[] {
    return Array.from(this.plugins.values());
  }

  public async evaluateAll(input: RecommendationRuleInput): Promise<RecommendationRuleResult[]> {
    const results: RecommendationRuleResult[] = [];
    for (const plugin of this.plugins.values()) {
      try {
        const res = await plugin.evaluate(input);
        if (res && res.triggered) {
          results.push(res);
        }
      } catch (err) {
        console.warn(`[RecommendationMarketplace] Error in plugin ${plugin.id}:`, err);
      }
    }
    return results;
  }
}
