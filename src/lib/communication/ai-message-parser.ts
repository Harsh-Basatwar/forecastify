/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * AIMessageParser — 4-Tier Confidence Band Natural Language Parser
 */

import { ConfidenceBand, type ParsedActionResult } from './types';
import type { AIContextData } from './ai-context-builder';

export class AIMessageParser {
  /**
   * Parse free-text inbound message with 360-degree operational context
   */
  async parseMessage(rawText: string, context: AIContextData): Promise<ParsedActionResult> {
    const textLower = rawText.toLowerCase().trim();

    // Default Fallback Result
    let intent = 'UNKNOWN';
    let confidence = 0.50;
    const extracted_entities: ParsedActionResult['extracted_entities'] = {};
    let proposed_action = 'FLAG_HUMAN_REVIEW';
    let requires_approval = true;
    let approval_reason = 'Unclear message intent';

    // 1. Interactive Button Trigger Matching
    if (textLower.includes('approve') || textLower.includes('accept') || textLower.includes('yes po')) {
      intent = 'APPROVE_PO';
      confidence = 0.98;
      proposed_action = 'CONFIRM_PURCHASE_ORDER';
      requires_approval = false;
      approval_reason = 'Direct confirmation reply';
    } else if (textLower.includes('reject') || textLower.includes('cancel po') || textLower.includes('cannot fulfill')) {
      intent = 'REJECT_PO';
      confidence = 0.95;
      proposed_action = 'CANCEL_PURCHASE_ORDER';
      requires_approval = true;
      approval_reason = 'Supplier rejected purchase order';
    } else if (textLower.includes('pay') || textLower.includes('paid') || textLower.includes('sent via upi')) {
      intent = 'KHATA_PAYMENT_PROMISE';
      confidence = 0.92;
      proposed_action = 'RECORD_PAYMENT_PROMISE';
      requires_approval = false;
    }

    // 2. Pattern & Entity Extraction Rules
    // Extract Delivery Date (e.g. "tomorrow", "next monday", "08-10")
    if (textLower.includes('tomorrow')) {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      extracted_entities.delivery_date = tomorrow.toISOString().split('T')[0];
      if (intent === 'UNKNOWN') {
        intent = 'UPDATE_DELIVERY_DATE';
        confidence = 0.90;
        proposed_action = 'UPDATE_PO_DELIVERY_DATE';
      }
    }

    // Extract Quantity (e.g. "only 80 units", "50 boxes")
    const qtyMatch = textLower.match(/(\d+)\s*(units|boxes|pcs|items|kg)/);
    if (qtyMatch) {
      extracted_entities.quantity = parseInt(qtyMatch[1]);
      if (context.associatedPO && extracted_entities.quantity < context.associatedPO.itemCount) {
        intent = 'PARTIAL_QUANTITY_NEGOTIATION';
        confidence = 0.88;
        proposed_action = 'MODIFY_PO_QUANTITY';
        requires_approval = true;
        approval_reason = `Quantity reduced from ${context.associatedPO.itemCount} to ${extracted_entities.quantity}`;
      }
    }

    // Extract Price Increase (e.g. "price is 120", "rs 150 per unit")
    const priceMatch = textLower.match(/(rs\.?|₹|\binr\b)\s*(\d+)/) || textLower.match(/price\s*(\d+)/);
    if (priceMatch) {
      extracted_entities.unit_price = parseFloat(priceMatch[2] || priceMatch[1]);
      intent = 'PRICE_NEGOTIATION';
      confidence = 0.86;
      proposed_action = 'MODIFY_PO_UNIT_PRICE';
      requires_approval = true;
      approval_reason = `Supplier quoted price of ₹${extracted_entities.unit_price}`;
    }

    // Extract Khata Payment Date (e.g. "will pay Friday", "pay next week")
    if (context.senderType === 'customer' && (textLower.includes('pay') || textLower.includes('next'))) {
      intent = 'KHATA_PAYMENT_PROMISE';
      confidence = 0.89;
      extracted_entities.payment_date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      proposed_action = 'UPDATE_KHATA_SCHEDULE';
      requires_approval = false;
    }

    // 3. Classify into 4-Tier Confidence Band
    let band: ConfidenceBand = ConfidenceBand.BAND_0_REJECT;

    if (confidence >= 0.95) {
      band = ConfidenceBand.BAND_3_INSTANT_EXECUTE;
    } else if (confidence >= 0.85) {
      band = ConfidenceBand.BAND_2_SUGGESTED_AUTO;
    } else if (confidence >= 0.60) {
      band = ConfidenceBand.BAND_1_MANAGER_REVIEW;
    } else {
      band = ConfidenceBand.BAND_0_REJECT;
    }

    return {
      intent,
      confidence,
      band,
      raw_text: rawText,
      extracted_entities,
      proposed_action,
      requires_approval,
      approval_reason,
    };
  }
}

export const aiMessageParser = new AIMessageParser();
