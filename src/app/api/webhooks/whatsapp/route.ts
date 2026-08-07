/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { whatsappCloudProvider } from '@/lib/communication/providers/whatsapp-cloud-provider';
import { communicationEngine } from '@/lib/communication/communication-engine';
import { aiContextBuilder } from '@/lib/communication/ai-context-builder';
import { aiMessageParser } from '@/lib/communication/ai-message-parser';
import { workflowStateEngine } from '@/lib/communication/workflow-state-engine';
import { approvalPolicyEngine } from '@/lib/communication/approval-policy-engine';
import { communicationEventBus } from '@/lib/communication/communication-event-bus';
import { ConfidenceBand } from '@/lib/communication/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

/**
 * GET — Meta Webhook Verification Endpoint
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const expectedVerifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'forecastify_whatsapp_webhook';

  if (mode === 'subscribe' && token === expectedVerifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

/**
 * POST — Inbound Webhook Event Processing Engine
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('X-Hub-Signature-256') || '';

    // Validate Signature
    const appSecret = process.env.META_APP_SECRET || '';
    if (appSecret && !whatsappCloudProvider.verifyWebhookSignature(rawBody, signature, appSecret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);

    // Parse Meta Cloud API entry format
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    // Handle Delivery Status Receipts (sent, delivered, read)
    if (value?.statuses?.[0]) {
      const statusObj = value.statuses[0];
      const wamid = statusObj.id;
      const status = statusObj.status; // delivered, read, failed

      await supabase
        .from('messages')
        .update({
          delivery_status: status,
          delivered_at: status === 'delivered' ? new Date().toISOString() : undefined,
          read_at: status === 'read' ? new Date().toISOString() : undefined,
        })
        .eq('external_message_id', wamid);

      return NextResponse.json({ success: true, processed: 'status_update' });
    }

    // Handle Incoming Messages
    const messageObj = value?.messages?.[0];
    if (!messageObj) {
      return NextResponse.json({ success: true, processed: 'ignored' });
    }

    const wamid = messageObj.id;
    const phone = messageObj.from;
    const timestamp = messageObj.timestamp;

    // 1. Idempotency Check
    const { data: existingEvent } = await supabase
      .from('communication_webhook_events')
      .select('id')
      .eq('event_id', wamid)
      .limit(1)
      .maybeSingle();

    if (existingEvent) {
      return NextResponse.json({ success: true, processed: 'duplicate_ignored' });
    }

    // Log raw webhook event
    await supabase.from('communication_webhook_events').insert({
      event_id: wamid,
      provider: 'whatsapp',
      event_type: 'message',
      payload,
      processing_status: 'processed',
      processed_at: new Date().toISOString(),
    });

    // Extract message content or interactive button selection
    let messageText = '';
    if (messageObj.type === 'text') {
      messageText = messageObj.text?.body || '';
    } else if (messageObj.type === 'interactive') {
      messageText = messageObj.interactive?.button_reply?.title || messageObj.interactive?.button_reply?.id || '';
    }

    // 2. Resolve Store ID and Thread
    // Retrieve default store / organization for webhook (or first active store)
    const { data: store } = await supabase.from('stores').select('id, organization_id').limit(1).single();
    const storeId = store?.id || '00000000-0000-0000-0000-000000000000';
    const orgId = store?.organization_id || '00000000-0000-0000-0000-000000000000';

    const thread = await communicationEngine.getOrCreateThread(
      storeId,
      orgId,
      'supplier', // Resolves dynamically inside context builder
      phone,
      phone,
      'whatsapp'
    );

    if (!thread) {
      return NextResponse.json({ success: false, error: 'Failed to resolve thread' });
    }

    // Insert message into thread
    await supabase.from('messages').insert({
      thread_id: thread.id,
      store_id: storeId,
      external_message_id: wamid,
      direction: 'inbound',
      sender_type: 'contact',
      message_type: messageObj.type === 'interactive' ? 'interactive_button' : 'text',
      content: messageText,
      delivery_status: 'read',
      sent_at: new Date(parseInt(timestamp) * 1000).toISOString(),
    });

    // Update thread preview and unread count
    await supabase
      .from('message_threads')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: messageText,
        unread_count: (thread.unread_count || 0) + 1,
      })
      .eq('id', thread.id);

    // 3. Assemble 360-degree Operational Context
    const aiContext = await aiContextBuilder.buildContext(storeId, thread.id, phone);

    // 4. Parse Message Intent & Classify into 4-Tier Confidence Band
    const parseResult = await aiMessageParser.parseMessage(messageText, aiContext);

    // 5. Check Approval Policy Rules
    const policyResult = await approvalPolicyEngine.evaluateAction(
      orgId,
      parseResult.intent,
      aiContext.associatedPO ? 'purchase_order' : 'general',
      aiContext.associatedPO?.totalAmount || 0
    );

    // 6. Action Execution / Autonomous Action Queueing based on Band
    let executionStatus = 'proposed';
    if (parseResult.band === ConfidenceBand.BAND_3_INSTANT_EXECUTE && !policyResult.requiresApproval) {
      executionStatus = 'auto_approved';

      // Apply PO updates if PO present
      if (aiContext.associatedPO) {
        if (parseResult.intent === 'APPROVE_PO') {
          await supabase.from('purchase_orders').update({ status: 'ordered' }).eq('id', aiContext.associatedPO.poId);
          await workflowStateEngine.transitionState(thread.id, 'ORDER_CONFIRMED', {}, 'Supplier approved PO via WhatsApp');
        } else if (parseResult.intent === 'UPDATE_DELIVERY_DATE' && parseResult.extracted_entities.delivery_date) {
          await supabase.from('purchase_orders').update({ expected_delivery_date: parseResult.extracted_entities.delivery_date }).eq('id', aiContext.associatedPO.poId);
        }
      }
    } else if (parseResult.band >= ConfidenceBand.BAND_1_MANAGER_REVIEW) {
      // Queue Autonomous Action for Store Manager Approval
      await supabase.from('autonomous_actions').insert({
        store_id: storeId,
        action_type: parseResult.intent,
        action_title: `WhatsApp Action: ${parseResult.proposed_action}`,
        action_description: parseResult.approval_reason || `Proposed AI action from ${aiContext.senderName}`,
        urgency: parseResult.band === ConfidenceBand.BAND_2_SUGGESTED_AUTO ? 'high' : 'normal',
        data: {
          raw_text: messageText,
          confidence: parseResult.confidence,
          extracted_entities: parseResult.extracted_entities,
          associated_po: aiContext.associatedPO,
        },
        reference_id: aiContext.associatedPO?.poId || thread.id,
        reference_table: aiContext.associatedPO ? 'purchase_orders' : 'message_threads',
        approval_status: 'pending',
      });
    }

    // Publish Message Received Event
    await communicationEventBus.publish({
      eventType: 'message.received',
      source: 'WhatsAppWebhook',
      payload: { threadId: thread.id, wamid, text: messageText, intent: parseResult.intent, band: parseResult.band, executionStatus },
    });

    return NextResponse.json({ success: true, processed: 'inbound_message', intent: parseResult.intent, band: parseResult.band });
  } catch (err: any) {
    console.error('[WhatsAppWebhook] Ingestion error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
