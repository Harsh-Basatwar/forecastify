/**
 * Alternative Engine
 * Milestone 5 - Forecastify XAI
 */

import { AlternativeDecision } from './explanation-types';

export class AlternativeEngine {
  public generateAlternatives(
    primaryAction: string = 'Order Replenishment Stock (50 Units)',
    predictedDemand: number = 120,
    currentStock: number = 45
  ): AlternativeDecision[] {
    const deficit = Math.max(0, predictedDemand - currentStock);

    return [
      {
        alternativeId: 'alt_transfer_stock',
        title: 'Inter-Store Stock Transfer',
        actionType: 'TRANSFER_STOCK',
        description: `Transfer ${Math.min(30, deficit)} units from nearby Warehouse Hub B (Store #104).`,
        reasonNotChosen: 'Higher logistical transfer friction and 1.5-day internal transit delay compared to direct supplier purchase.',
        relativeConfidence: 84,
        financialImpactDelta: -1200, // Saves ₹1200 shipping fee but incurs internal handling
        tradeOffs: [
          'Eliminates external supplier purchase order lead time',
          'Consumes stock allocated to Store #104 reserve',
        ],
      },
      {
        alternativeId: 'alt_apply_markdown',
        title: 'Dynamic Price Adjustment / Demand Dampening',
        actionType: 'MARKDOWN_OR_MARKUP',
        description: 'Increase unit price by 8% to dampen excess demand velocity and prevent immediate stockout.',
        reasonNotChosen: 'Negative impact on customer retention and brand price perception during promotional window.',
        relativeConfidence: 76,
        financialImpactDelta: +450,
        tradeOffs: [
          'Preserves stock until scheduled replenishment arrival',
          'May reduce total sales transaction volume',
        ],
      },
      {
        alternativeId: 'alt_expedited_supplier',
        title: 'Expedited Express Supplier Delivery',
        actionType: 'EXPEDITED_ORDER',
        description: 'Place priority express order for 50 units with 24-hour SLA guarantee.',
        reasonNotChosen: 'High rush surcharge (₹2,500) reduces net gross profit margin by 14%.',
        relativeConfidence: 89,
        financialImpactDelta: -2500,
        tradeOffs: [
          'Guarantees zero stockout window',
          'Significant premium rush delivery cost',
        ],
      },
    ];
  }
}

export const alternativeEngine = new AlternativeEngine();
