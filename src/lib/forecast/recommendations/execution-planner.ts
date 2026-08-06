/**
 * Execution Planner & Recommendation Chaining Engine
 * Generates automated multi-step decision workflows:
 * e.g., ORDER_MORE -> Receive Goods -> Transfer Stock -> Start Promotion -> Markdown
 */

import { Recommendation, RecommendationType } from './recommendation-types';

export interface ExecutionStep {
  stepNumber: number;
  action: string;
  recommendationType: RecommendationType;
  description: string;
  targetModule: 'PROCUREMENT' | 'INVENTORY' | 'PRICING' | 'PROMOTION';
  payload: Record<string, unknown>;
}

export interface ExecutionChain {
  chainId: string;
  storeId: string;
  productId?: string;
  steps: ExecutionStep[];
}

export class ExecutionPlanner {
  public planChain(recommendation: Recommendation): ExecutionChain {
    const chainId = `CHAIN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const steps: ExecutionStep[] = [];

    switch (recommendation.type) {
      case RecommendationType.ORDER_MORE:
      case RecommendationType.EMERGENCY_PURCHASE: {
        steps.push({
          stepNumber: 1,
          action: 'Create Draft Purchase Order',
          recommendationType: recommendation.type,
          description: `Create purchase order in Procurement system for product ${recommendation.productId}`,
          targetModule: 'PROCUREMENT',
          payload: { productId: recommendation.productId, storeId: recommendation.storeId },
        });
        steps.push({
          stepNumber: 2,
          action: 'Schedule Inbound Receive',
          recommendationType: recommendation.type,
          description: 'Await delivery and verify inbound stock batch',
          targetModule: 'INVENTORY',
          payload: { storeId: recommendation.storeId },
        });
        steps.push({
          stepNumber: 3,
          action: 'Inter-Store Transfer',
          recommendationType: RecommendationType.TRANSFER_STOCK,
          description: 'Allocate incoming inventory to high-demand store locations',
          targetModule: 'INVENTORY',
          payload: { storeId: recommendation.storeId },
        });
        break;
      }
      case RecommendationType.MARKDOWN:
      case RecommendationType.MARKDOWN_PRODUCT: {
        steps.push({
          stepNumber: 1,
          action: 'Apply Discount Price',
          recommendationType: recommendation.type,
          description: 'Update shelf price in Pricing Engine to 20% markdown',
          targetModule: 'PRICING',
          payload: { productId: recommendation.productId, markdownPct: 20 },
        });
        steps.push({
          stepNumber: 2,
          action: 'Launch Clearance Promotion',
          recommendationType: RecommendationType.START_PROMOTION,
          description: 'Activate clearance marketing promotion banner',
          targetModule: 'PROMOTION',
          payload: { productId: recommendation.productId },
        });
        break;
      }
      default: {
        steps.push({
          stepNumber: 1,
          action: `Execute ${recommendation.type}`,
          recommendationType: recommendation.type,
          description: recommendation.reason,
          targetModule: 'INVENTORY',
          payload: { storeId: recommendation.storeId },
        });
        break;
      }
    }

    return {
      chainId,
      storeId: recommendation.storeId,
      productId: recommendation.productId,
      steps,
    };
  }
}
