/**
 * Impact Simulator & Predictor
 * Simulates Before, After, and Delta metrics (Inventory, Cash, Supplier, Profit)
 * for a recommendation or execution chain.
 */

import { FinancialImpact, RecommendationRuleInput, RecommendationType, SimulationResult } from './recommendation-types';

export class ImpactSimulator {
  public simulateImpact(
    type: RecommendationType,
    input: RecommendationRuleInput,
    impact: FinancialImpact
  ): SimulationResult {
    const currentInventory = input.currentStock;
    const currentCash = 100000; // Simulated available store cash ledger
    const unitCost = input.unitCost || 10;
    const unitPrice = input.unitPrice || 20;

    let inventoryDelta = 0;
    let cashDelta = 0;
    let supplierCapacityDelta = 0;

    switch (type) {
      case RecommendationType.ORDER_MORE:
      case RecommendationType.EMERGENCY_PURCHASE:
      case RecommendationType.BULK_BUY: {
        const orderQty = Math.max(1, Math.ceil(input.forecastDemand - input.currentStock));
        inventoryDelta = orderQty;
        cashDelta = -impact.expectedCost;
        supplierCapacityDelta = -orderQty;
        break;
      }
      case RecommendationType.MARKDOWN:
      case RecommendationType.MARKDOWN_PRODUCT: {
        const soldQty = Math.min(currentInventory, input.forecastDemand);
        inventoryDelta = -soldQty;
        cashDelta = impact.expectedRevenue;
        break;
      }
      case RecommendationType.TRANSFER_STOCK: {
        const transferQty = Math.min(currentInventory, input.forecastDemand);
        inventoryDelta = -transferQty;
        cashDelta = impact.expectedSavings;
        break;
      }
      default: {
        inventoryDelta = 0;
        cashDelta = impact.expectedSavings || 0;
        break;
      }
    }

    const before = {
      inventoryLevel: currentInventory,
      cashAvailable: currentCash,
      holdingCost: Number((currentInventory * unitCost * 0.20).toFixed(2)),
      expectedRevenue: Number((currentInventory * unitPrice).toFixed(2)),
    };

    const after = {
      inventoryLevel: Math.max(0, currentInventory + inventoryDelta),
      cashAvailable: Number((currentCash + cashDelta).toFixed(2)),
      holdingCost: Number((Math.max(0, currentInventory + inventoryDelta) * unitCost * 0.20).toFixed(2)),
      expectedRevenue: Number(((currentInventory + inventoryDelta) * unitPrice).toFixed(2)),
    };

    return {
      before,
      after,
      delta: {
        inventoryDelta,
        cashDelta: Number(cashDelta.toFixed(2)),
        supplierCapacityDelta,
        forecastImpactDelta: input.forecastDemand,
        expectedProfitDelta: impact.expectedProfit,
      },
    };
  }
}
