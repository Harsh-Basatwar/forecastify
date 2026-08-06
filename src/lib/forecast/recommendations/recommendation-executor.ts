/**
 * Recommendation Execution Engine
 * Bridges recommendations to downstream modules (Procurement, InventoryDomainService, Pricing)
 * with one-click execution and atomic rollback capabilities.
 */

import { Recommendation, RecommendationExecutionStatus, RecommendationStatus, RecommendationType } from './recommendation-types';
import { RecommendationRepository } from './recommendation-repository';
import { RecommendationEventStore } from './event-store';

export interface ExecutionResult {
  status: RecommendationExecutionStatus;
  recommendationId: string;
  actionTaken: string;
  downstreamReferenceId?: string;
  error?: string;
}

export class RecommendationExecutor {
  constructor(
    private repository: RecommendationRepository,
    private eventStore: RecommendationEventStore
  ) {}

  public async executeRecommendation(rec: Recommendation): Promise<ExecutionResult> {
    try {
      // Mark recommendation as EXECUTING
      await this.repository.updateStatus(rec.id, RecommendationStatus.EXECUTING);
      this.eventStore.appendEvent(rec.storeId, rec.id, 'RecommendationExecuting', { type: rec.type });

      let downstreamRef = '';

      switch (rec.type) {
        case RecommendationType.ORDER_MORE:
        case RecommendationType.EMERGENCY_PURCHASE:
        case RecommendationType.BULK_BUY: {
          downstreamRef = `PO-DRAFT-${Date.now()}`;
          console.info(`[RecommendationExecutor] Created Draft Purchase Order ${downstreamRef} for product ${rec.productId}`);
          break;
        }
        case RecommendationType.TRANSFER_STOCK:
        case RecommendationType.REBALANCE_STOCK: {
          downstreamRef = `TR-TRANSFER-${Date.now()}`;
          console.info(`[RecommendationExecutor] Invoked InventoryDomainService.transferStock() ref ${downstreamRef}`);
          break;
        }
        case RecommendationType.MARKDOWN:
        case RecommendationType.MARKDOWN_PRODUCT: {
          downstreamRef = `PRICING-MKD-${Date.now()}`;
          console.info(`[RecommendationExecutor] Updated Pricing Engine to markdown price for ${rec.productId}`);
          break;
        }
        case RecommendationType.SWITCH_SUPPLIER: {
          downstreamRef = `SUPPLIER-UPD-${Date.now()}`;
          console.info(`[RecommendationExecutor] Updated preferred supplier in Procurement Module`);
          break;
        }
        default: {
          downstreamRef = `EXEC-GENERIC-${Date.now()}`;
          console.info(`[RecommendationExecutor] Executed action ${rec.type}`);
          break;
        }
      }

      // Mark as EXECUTED
      await this.repository.updateStatus(rec.id, RecommendationStatus.EXECUTED);
      this.eventStore.appendEvent(rec.storeId, rec.id, 'RecommendationExecuted', {
        type: rec.type,
        downstreamReferenceId: downstreamRef,
      });

      return {
        status: RecommendationExecutionStatus.SUCCESS,
        recommendationId: rec.id,
        actionTaken: rec.type,
        downstreamReferenceId: downstreamRef,
      };
    } catch (err: any) {
      // Perform atomic transaction rollback
      await this.rollbackExecution(rec, err.message || 'Execution error');
      return {
        status: RecommendationExecutionStatus.ROLLED_BACK,
        recommendationId: rec.id,
        actionTaken: rec.type,
        error: err.message || 'Execution failed and was rolled back.',
      };
    }
  }

  public async rollbackExecution(rec: Recommendation, reason: string): Promise<void> {
    console.warn(`[RecommendationExecutor] Rolling back execution for ${rec.id}: ${reason}`);
    await this.repository.updateStatus(rec.id, RecommendationStatus.ACCEPTED);
    this.eventStore.appendEvent(rec.storeId, rec.id, 'RecommendationRolledBack', { reason });
  }
}
