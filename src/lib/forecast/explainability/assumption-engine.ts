/**
 * Assumption Engine
 * Milestone 5 - Forecastify XAI
 */

import { Assumption } from './explanation-types';
import { FeatureInputVector } from './feature-attribution-strategy';

export class AssumptionEngine {
  public generateAssumptions(features?: FeatureInputVector, supplierLeadTime?: number): Assumption[] {
    const leadTime = supplierLeadTime ?? 3;
    const promoActive = features?.promotionActive ?? true;

    return [
      {
        assumptionId: 'asm_sup_delay',
        category: 'supplier',
        statement: `Supplier lead time remains static at ${leadTime} business days without unexpected fulfillment delays.`,
        riskRating: leadTime > 4 ? 'HIGH' : 'LOW',
        impactScope: 'Safety Stock Buffer & Order Arrival Date',
        valueExpected: `${leadTime} days`,
        isVerified: true,
      },
      {
        assumptionId: 'asm_weather_static',
        category: 'weather',
        statement: 'Regional weather conditions follow seasonal baseline averages without extreme precipitation events.',
        riskRating: 'MEDIUM',
        impactScope: 'Foot Traffic & In-Store Beverage Demand',
        valueExpected: 'Seasonal Normal',
        isVerified: true,
      },
      {
        assumptionId: 'asm_pricing_static',
        category: 'pricing',
        statement: 'Unit retail selling price and competitor pricing index remain static across the forecast horizon.',
        riskRating: 'LOW',
        impactScope: 'Price Elasticity & Gross Profit Margin',
        valueExpected: 'Unchanged',
        isVerified: true,
      },
      {
        assumptionId: 'asm_promo_schedule',
        category: 'promotion',
        statement: promoActive
          ? 'Active marketing campaign runs for planned duration without early termination.'
          : 'No unannounced flash promotions introduced during current forecast period.',
        riskRating: 'LOW',
        impactScope: 'Promotional Demand Lift Vector',
        valueExpected: promoActive ? 'Active 15% Discount' : 'None',
        isVerified: true,
      },
      {
        assumptionId: 'asm_inventory_shrinkage',
        category: 'inventory',
        statement: 'Physical inventory count matches recorded stock level with 0% unscheduled shrinkage.',
        riskRating: 'LOW',
        impactScope: 'Available On-Hand Stock',
        valueExpected: '0% Variance',
        isVerified: true,
      },
    ];
  }
}

export const assumptionEngine = new AssumptionEngine();
