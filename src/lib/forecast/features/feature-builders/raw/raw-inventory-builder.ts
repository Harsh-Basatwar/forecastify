/**
 * Raw Inventory Feature Builder
 */

import {
  IFeatureBuilder,
  FeatureBuildContext,
  FeatureBuildResult,
  ModelCompatibility,
} from '../../feature-types';
import { FeatureLineageTracker } from '../../feature-lineage';

export class RawInventoryFeatureBuilder implements IFeatureBuilder {
  public readonly name = 'RawInventoryFeatureBuilder';
  public readonly version = '1.0.0';
  public readonly stage = 'raw' as const;
  public readonly dependencies: string[] = [];
  public readonly compatibility: ModelCompatibility[] = ['All Models'];

  public async build(context: FeatureBuildContext): Promise<FeatureBuildResult> {
    const inv = context.rawInput.inventory || {
      currentStock: 0,
      availableStock: 0,
      reservedStock: 0,
      incomingStock: 0,
      onOrderStock: 0,
      safetyStock: 0,
      reorderPoint: 0,
      stockAgeDays: 0,
    };

    const features = {
      raw_current_stock: Math.max(0, inv.currentStock),
      raw_available_stock: Math.max(0, inv.availableStock),
      raw_reserved_stock: Math.max(0, inv.reservedStock),
      raw_incoming_stock: Math.max(0, inv.incomingStock),
      raw_on_order_stock: Math.max(0, inv.onOrderStock),
      raw_safety_stock: Math.max(0, inv.safetyStock),
      raw_reorder_point: Math.max(0, inv.reorderPoint),
      raw_stock_age_days: Math.max(0, inv.stockAgeDays || 0),
    };

    const lineage = {
      raw_current_stock: FeatureLineageTracker.createLineage('raw_current_stock', 'inventory_items', 'quantity', this.name, this.version),
      raw_available_stock: FeatureLineageTracker.createLineage('raw_available_stock', 'inventory_items', 'available_quantity', this.name, this.version),
      raw_reserved_stock: FeatureLineageTracker.createLineage('raw_reserved_stock', 'inventory_items', 'reserved_quantity', this.name, this.version),
    };

    return {
      features,
      lineage,
      missingCount: context.rawInput.inventory ? 0 : 8,
    };
  }
}
