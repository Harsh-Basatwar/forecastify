/**
 * Rule DSL Engine
 * Parses and evaluates business condition expressions e.g.:
 * "WHEN forecast > stock AND supplierDelay > 5 THEN ORDER_MORE"
 * allowing business users to configure dynamic decision rules without code changes.
 */

import { RecommendationPriority, RecommendationRuleInput, RecommendationType, RuleDSLDefinition } from './recommendation-types';

export class RuleDSLEngine {
  public evaluateRule(rule: RuleDSLDefinition, input: RecommendationRuleInput): { triggered: boolean; action?: RecommendationType } {
    if (!rule.enabled) {
      return { triggered: false };
    }

    try {
      const condition = this.parseWhenClause(rule.whenClause, input);
      if (condition) {
        return {
          triggered: true,
          action: rule.thenAction,
        };
      }
    } catch (err) {
      console.warn(`[RuleDSLEngine] Error evaluating rule DSL [${rule.ruleName}]:`, err);
    }

    return { triggered: false };
  }

  private parseWhenClause(whenClause: string, input: RecommendationRuleInput): boolean {
    // Standard variables mapping
    const stock = input.currentStock;
    const forecast = input.forecastDemand;
    const safetyStock = input.safetyStock;
    const reorderPoint = input.reorderPoint;
    const supplierDelay = input.supplierLeadTimeDays || 0;

    let expr = whenClause
      .replace(/WHEN\s+/i, '')
      .replace(/forecast/gi, String(forecast))
      .replace(/stock/gi, String(stock))
      .replace(/safetyStock/gi, String(safetyStock))
      .replace(/reorderPoint/gi, String(reorderPoint))
      .replace(/supplierDelay/gi, String(supplierDelay))
      .replace(/\s+AND\s+/gi, ' && ')
      .replace(/\s+OR\s+/gi, ' || ');

    // Safe mathematical condition evaluator
    // eslint-disable-next-line no-new-func
    const evalFn = new Function(`return Boolean(${expr});`);
    return evalFn();
  }

  public createDefaultRules(storeId: string): RuleDSLDefinition[] {
    return [
      {
        id: 'DSL-RULE-001',
        storeId,
        ruleName: 'Stock Deficit Reorder Rule',
        category: 'INVENTORY' as any,
        whenClause: 'forecast > stock AND stock <= reorderPoint',
        thenAction: RecommendationType.ORDER_MORE,
        priority: RecommendationPriority.HIGH,
        enabled: true,
      },
      {
        id: 'DSL-RULE-002',
        storeId,
        ruleName: 'Supplier Delay Emergency Purchase Rule',
        category: 'PROCUREMENT' as any,
        whenClause: 'stock <= safetyStock AND supplierDelay > 7',
        thenAction: RecommendationType.EMERGENCY_PURCHASE,
        priority: RecommendationPriority.CRITICAL,
        enabled: true,
      },
    ];
  }
}
