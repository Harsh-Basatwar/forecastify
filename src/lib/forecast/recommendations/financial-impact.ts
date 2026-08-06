/**
 * Financial Impact Engine
 * Calculates expected savings, gross profit, margin improvement, carrying costs,
 * blocked capital released, and turnover gains.
 */

import { FinancialImpact, RecommendationRuleInput, RecommendationType } from './recommendation-types';

export class FinancialImpactEngine {
  public calculateImpact(
    type: RecommendationType,
    input: RecommendationRuleInput,
    suggestedQuantity: number = 0
  ): FinancialImpact {
    const unitCost = input.unitCost || 0;
    const unitPrice = input.unitPrice || 0;
    const margin = unitPrice - unitCost;
    const forecastDemand = input.forecastDemand || 0;

    let expectedProfit = 0;
    let expectedSavings = 0;
    let expectedRevenue = 0;
    let expectedCost = 0;
    let expectedInventoryReduction = 0;
    let blockedCapitalReleased = 0;
    let carryingCostReduction = 0;
    let cashFlowImprovement = 0;

    const annualHoldingCostRate = 0.20; // 20% holding cost per year

    switch (type) {
      case RecommendationType.ORDER_MORE:
      case RecommendationType.EMERGENCY_PURCHASE:
      case RecommendationType.BULK_BUY: {
        const qty = suggestedQuantity || Math.max(1, Math.ceil(forecastDemand - input.currentStock));
        expectedCost = qty * unitCost;
        expectedRevenue = qty * unitPrice;
        expectedProfit = qty * margin;
        if (type === RecommendationType.BULK_BUY) {
          expectedSavings = qty * unitCost * 0.08; // 8% bulk discount savings
        }
        break;
      }
      case RecommendationType.REDUCE_ORDER:
      case RecommendationType.OVERSTOCK_RISK: {
        const excessQty = Math.max(0, input.currentStock - forecastDemand);
        blockedCapitalReleased = excessQty * unitCost;
        carryingCostReduction = excessQty * unitCost * annualHoldingCostRate;
        expectedSavings = carryingCostReduction;
        break;
      }
      case RecommendationType.MARKDOWN:
      case RecommendationType.MARKDOWN_PRODUCT: {
        const markdownPrice = unitPrice * 0.80; // 20% markdown
        const markdownMargin = markdownPrice - unitCost;
        const clearanceQty = Math.min(input.currentStock, forecastDemand * 1.5);
        expectedRevenue = clearanceQty * markdownPrice;
        expectedProfit = clearanceQty * markdownMargin;
        blockedCapitalReleased = clearanceQty * unitCost;
        carryingCostReduction = clearanceQty * unitCost * annualHoldingCostRate;
        expectedSavings = carryingCostReduction;
        break;
      }
      case RecommendationType.TRANSFER_STOCK:
      case RecommendationType.REBALANCE_STOCK: {
        const transferQty = Math.min(input.currentStock, forecastDemand);
        expectedRevenue = transferQty * unitPrice;
        expectedProfit = transferQty * margin;
        expectedSavings = transferQty * unitCost * 0.15; // avoided emergency re-order cost
        break;
      }
      case RecommendationType.SWITCH_SUPPLIER: {
        const orderValue = forecastDemand * unitCost;
        expectedSavings = orderValue * 0.05; // 5% supplier cost optimization
        cashFlowImprovement = expectedSavings;
        break;
      }
      default: {
        expectedRevenue = forecastDemand * unitPrice;
        expectedProfit = forecastDemand * margin;
        break;
      }
    }

    const marginImprovementPct = unitPrice > 0 ? Number(((margin / unitPrice) * 100).toFixed(2)) : 0;
    const turnoverGainPct = input.currentStock > 0 ? Number(((forecastDemand / input.currentStock) * 10).toFixed(2)) : 0;

    return {
      expectedProfit: Number(expectedProfit.toFixed(2)),
      expectedSavings: Number(expectedSavings.toFixed(2)),
      expectedRevenue: Number(expectedRevenue.toFixed(2)),
      expectedCost: Number(expectedCost.toFixed(2)),
      expectedInventoryReduction: Number(expectedInventoryReduction.toFixed(2)),
      blockedCapitalReleased: Number(blockedCapitalReleased.toFixed(2)),
      carryingCostReduction: Number(carryingCostReduction.toFixed(2)),
      marginImprovementPct,
      cashFlowImprovement: Number((cashFlowImprovement || expectedSavings).toFixed(2)),
      turnoverGainPct,
    };
  }
}
