/**
 * Evidence Builder
 * Milestone 5 - Forecastify XAI
 */

import { Evidence, EvidenceType, EvidenceConfidenceMap } from './explanation-types';
import { FeatureInputVector } from './feature-attribution-strategy';

export interface EvidenceInputPayload {
  predictionId?: string;
  recommendationId?: string;
  productId?: string;
  storeId?: string;
  predictionValue?: number;
  features?: FeatureInputVector;
  inventoryLevel?: number;
  supplierLeadTimeDays?: number;
  supplierName?: string;
  price?: number;
  modelName?: string;
  modelVersion?: string;
}

export class EvidenceBuilder {
  public buildEvidenceList(payload: EvidenceInputPayload): {
    evidenceList: Evidence[];
    evidenceConfidenceMap: EvidenceConfidenceMap;
  } {
    const timestamp = new Date().toISOString();
    const evidenceList: Evidence[] = [];

    // Per-evidence confidence metrics
    const inventoryConfidence = payload.inventoryLevel !== undefined && payload.inventoryLevel >= 0 ? 98 : 70;
    const supplierConfidence = payload.supplierLeadTimeDays && payload.supplierLeadTimeDays <= 5 ? 88 : 75;
    const weatherConfidence = payload.features?.temperatureCelsius !== undefined ? 82 : 65;
    const promoConfidence = payload.features?.promotionActive !== undefined ? 95 : 80;
    const pricingConfidence = payload.price && payload.price > 0 ? 99 : 85;

    const overallEvidenceConfidence = Math.round(
      (inventoryConfidence * 0.25 +
        supplierConfidence * 0.25 +
        weatherConfidence * 0.15 +
        promoConfidence * 0.15 +
        pricingConfidence * 0.2)
    );

    // 1. Prediction Evidence
    if (payload.predictionId) {
      evidenceList.push({
        evidenceId: `ev_pred_${payload.predictionId}`,
        type: EvidenceType.PREDICTION,
        entityId: payload.predictionId,
        title: 'Forecast Engine Prediction Output',
        description: `Deterministic 7-day sales forecast value of ${payload.predictionValue ?? 120} units for Product ${payload.productId ?? 'PROD-101'}.`,
        confidence: 94,
        timestamp,
        sourceSystem: 'ForecastEngine2.0',
        metadata: {
          predictionValue: payload.predictionValue ?? 120,
          productId: payload.productId,
          storeId: payload.storeId,
        },
      });
    }

    // 2. Feature Vector Evidence
    evidenceList.push({
      evidenceId: `ev_feat_${payload.productId ?? 'default'}`,
      type: EvidenceType.FEATURE_VECTOR,
      entityId: `fv_${payload.productId ?? '101'}`,
      title: 'Engineered Feature Vector Snapshot',
      description: 'Historical lag sales, promotional status, calendar day, and weather indicators.',
      confidence: 91,
      timestamp,
      sourceSystem: 'FeatureEngineeringPipeline',
      metadata: payload.features ?? {},
    });

    // 3. Inventory Snapshot Evidence
    evidenceList.push({
      evidenceId: `ev_inv_${payload.productId ?? 'default'}`,
      type: EvidenceType.INVENTORY_SNAPSHOT,
      entityId: `inv_${payload.productId ?? '101'}`,
      title: 'Real-Time Inventory Level Snapshot',
      description: `Current stock level recorded at ${payload.inventoryLevel ?? 45} units.`,
      confidence: inventoryConfidence,
      timestamp,
      sourceSystem: 'InventoryManagementService',
      metadata: {
        inventoryLevel: payload.inventoryLevel ?? 45,
        reorderPoint: 30,
        safetyStock: 15,
      },
    });

    // 4. Supplier Snapshot Evidence
    evidenceList.push({
      evidenceId: `ev_sup_${payload.productId ?? 'default'}`,
      type: EvidenceType.SUPPLIER_SNAPSHOT,
      entityId: `sup_${payload.productId ?? '101'}`,
      title: 'Supplier Lead Time & Reliability Track',
      description: `Supplier "${payload.supplierName ?? 'Apex Logistics'}" lead time SLA is ${payload.supplierLeadTimeDays ?? 3} days.`,
      confidence: supplierConfidence,
      timestamp,
      sourceSystem: 'ProcurementSystem',
      metadata: {
        supplierName: payload.supplierName ?? 'Apex Logistics',
        leadTimeDays: payload.supplierLeadTimeDays ?? 3,
        onTimeFulfillmentRate: 0.94,
      },
    });

    // 5. Pricing Snapshot Evidence
    evidenceList.push({
      evidenceId: `ev_price_${payload.productId ?? 'default'}`,
      type: EvidenceType.PRICING_SNAPSHOT,
      entityId: `price_${payload.productId ?? '101'}`,
      title: 'Product Pricing & Elasticity Vector',
      description: `Unit price ₹${payload.price ?? 250} with historical price elasticity index -1.2.`,
      confidence: pricingConfidence,
      timestamp,
      sourceSystem: 'SalesBillingService',
      metadata: {
        unitPrice: payload.price ?? 250,
        priceElasticity: -1.2,
      },
    });

    // 6. Model Metadata Evidence
    evidenceList.push({
      evidenceId: `ev_model_${payload.modelVersion ?? 'v1'}`,
      type: EvidenceType.MODEL_METADATA,
      entityId: `model_${payload.modelName ?? 'ensemble'}`,
      title: 'Deployed Forecast Model Architecture',
      description: `Model "${payload.modelName ?? 'Ensemble Hybrid Forecast'}" version ${payload.modelVersion ?? 'v2.1.0'}.`,
      confidence: 96,
      timestamp,
      sourceSystem: 'ModelRegistryService',
      metadata: {
        modelName: payload.modelName ?? 'Ensemble Hybrid Forecast',
        modelVersion: payload.modelVersion ?? 'v2.1.0',
        validationAccuracy: 0.925,
      },
    });

    // 7. Recommendation Evidence (if available)
    if (payload.recommendationId) {
      evidenceList.push({
        evidenceId: `ev_rec_${payload.recommendationId}`,
        type: EvidenceType.RECOMMENDATION,
        entityId: payload.recommendationId,
        title: 'Recommendation Engine Decision Node',
        description: `Automated reorder recommendation generated by Milestone 4 Recommendation Engine.`,
        confidence: 90,
        timestamp,
        sourceSystem: 'RecommendationEngine',
        metadata: {
          recommendationId: payload.recommendationId,
        },
      });
    }

    const evidenceConfidenceMap: EvidenceConfidenceMap = {
      inventorySnapshotConfidence: inventoryConfidence,
      supplierReliabilityConfidence: supplierConfidence,
      weatherConfidence,
      promotionConfidence: promoConfidence,
      pricingConfidence,
      overallEvidenceConfidence,
    };

    return { evidenceList, evidenceConfidenceMap };
  }
}

export const evidenceBuilder = new EvidenceBuilder();
