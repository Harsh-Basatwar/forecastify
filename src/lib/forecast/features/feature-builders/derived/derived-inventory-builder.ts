/**
 * Derived Inventory Feature Builder (Stock Cover Days, Inventory Turnover)
 */

import {
  IFeatureBuilder,
  FeatureBuildContext,
  FeatureBuildResult,
  ModelCompatibility,
} from '../../feature-types';
import { FeatureLineageTracker } from '../../feature-lineage';

export class DerivedInventoryFeatureBuilder implements IFeatureBuilder {
  public readonly name = 'DerivedInventoryFeatureBuilder';
  public readonly version = '1.0.0';
  public readonly stage = 'derived' as const;
  public readonly dependencies: string[] = ['RawInventoryFeatureBuilder', 'RawSalesFeatureBuilder'];
  public readonly compatibility: ModelCompatibility[] = ['All Models'];

  public async build(context: FeatureBuildContext): Promise<FeatureBuildResult> {
    const rawStock = Number(context.existingRawFeatures?.raw_available_stock ?? context.rawInput.inventory?.availableStock ?? 0);
    const dailySales = Number(context.existingRawFeatures?.raw_daily_sales_quantity ?? 1);

    const safeDailySales = dailySales > 0 ? dailySales : 1;

    // Stock Cover Days = Available Stock / Daily Sales Velocity
    const stockCoverDays = Math.round((rawStock / safeDailySales) * 10) / 10;

    // Inventory Turnover (Annualized ratio placeholder) = (Daily Sales * 365) / Current Stock
    const currentStock = Number(context.existingRawFeatures?.raw_current_stock ?? 1);
    const safeCurrentStock = currentStock > 0 ? currentStock : 1;
    const inventoryTurnover = Math.round(((dailySales * 365) / safeCurrentStock) * 100) / 100;

    const features = {
      derived_stock_cover_days: stockCoverDays,
      derived_inventory_turnover: inventoryTurnover,
    };

    const lineage = {
      derived_stock_cover_days: FeatureLineageTracker.createLineage('derived_stock_cover_days', 'inventory_items', 'available_stock', this.name, this.version, 'stock / daily_sales'),
      derived_inventory_turnover: FeatureLineageTracker.createLineage('derived_inventory_turnover', 'inventory_items', 'current_stock', this.name, this.version, '(daily_sales * 365) / stock'),
    };

    return { features, lineage };
  }
}
