/**
 * Raw Procurement Feature Builder
 */

import {
  IFeatureBuilder,
  FeatureBuildContext,
  FeatureBuildResult,
  ModelCompatibility,
} from '../../feature-types';
import { FeatureLineageTracker } from '../../feature-lineage';

export class RawProcurementFeatureBuilder implements IFeatureBuilder {
  public readonly name = 'RawProcurementFeatureBuilder';
  public readonly version = '1.0.0';
  public readonly stage = 'raw' as const;
  public readonly dependencies: string[] = [];
  public readonly compatibility: ModelCompatibility[] = ['All Models'];

  public async build(context: FeatureBuildContext): Promise<FeatureBuildResult> {
    const proc = context.rawInput.procurement || {
      averageLeadTimeDays: 7,
      supplierDelayDays: 0,
      openPurchaseOrdersCount: 0,
      incomingQuantity: 0,
      procurementCost: 0,
      supplierFillRate: 0.95,
      supplierReliability: 0.9,
    };

    const features = {
      raw_average_lead_time_days: proc.averageLeadTimeDays,
      raw_supplier_delay_days: proc.supplierDelayDays,
      raw_open_purchase_orders_count: proc.openPurchaseOrdersCount,
      raw_procurement_incoming_quantity: proc.incomingQuantity,
      raw_procurement_cost: proc.procurementCost,
      raw_supplier_fill_rate: proc.supplierFillRate,
      raw_supplier_reliability: proc.supplierReliability,
    };

    const lineage = {
      raw_average_lead_time_days: FeatureLineageTracker.createLineage('raw_average_lead_time_days', 'purchase_orders', 'lead_time', this.name, this.version),
      raw_supplier_delay_days: FeatureLineageTracker.createLineage('raw_supplier_delay_days', 'purchase_orders', 'delay_days', this.name, this.version),
    };

    return { features, lineage };
  }
}
