/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * CommunicationEngine — Provider-Agnostic Enterprise Orchestrator
 */

import { createClient } from '@supabase/supabase-js';
import type { ChannelCode, OutboundMessagePayload, MessageThreadRow, MessageRow } from './types';
import { providerRegistry, secretVaultResolver } from './provider-registry';
import { whatsappCloudProvider } from './providers/whatsapp-cloud-provider';
import { smsProvider } from './providers/sms-provider';
import { emailProvider } from './providers/email-provider';
import { communicationEventBus } from './communication-event-bus';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export class CommunicationEngine {
  constructor() {
    // Register standard channel providers
    providerRegistry.register(whatsappCloudProvider);
    providerRegistry.register(smsProvider);
    providerRegistry.register(emailProvider);
  }

  /**
   * Get or create thread for participant
   */
  async getOrCreateThread(
    storeId: string,
    organizationId: string,
    participantType: 'supplier' | 'customer' | 'employee' | 'driver',
    participantId: string,
    identifier: string,
    channelCode: ChannelCode = 'whatsapp',
    title?: string
  ): Promise<MessageThreadRow | null> {
    try {
      // Find existing participant junction
      const { data: existingPart } = await supabase
        .from('conversation_participants')
        .select('thread_id, message_threads(*)')
        .eq('entity_type', participantType)
        .eq('entity_id', participantId)
        .limit(1)
        .maybeSingle();

      if (existingPart && existingPart.message_threads) {
        const tObj = Array.isArray(existingPart.message_threads) ? existingPart.message_threads[0] : existingPart.message_threads;
        return tObj as unknown as MessageThreadRow;
      }

      // Create new message thread
      const { data: thread, error: threadErr } = await supabase
        .from('message_threads')
        .insert({
          organization_id: organizationId,
          store_id: storeId,
          channel_code: channelCode,
          thread_title: title || `${participantType.toUpperCase()}: ${identifier}`,
          unread_count: 0,
          status: 'open',
          session_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (threadErr || !thread) return null;

      // Add conversation participant
      await supabase.from('conversation_participants').insert({
        thread_id: thread.id,
        entity_type: participantType,
        entity_id: participantId,
        identifier,
        role: 'primary',
      });

      return thread as MessageThreadRow;
    } catch (err) {
      console.error('[CommunicationEngine] getOrCreateThread error:', err);
      return null;
    }
  }

  /**
   * Enqueue & Dispatch Outbound Message with Retry & Fallback Capabilities
   */
  async dispatchMessage(
    storeId: string,
    organizationId: string,
    recipientIdentifier: string,
    payload: OutboundMessagePayload,
    channelCode: ChannelCode = 'whatsapp',
    fallbackChannelCode?: ChannelCode,
    threadId?: string
  ): Promise<{ success: boolean; messageId?: string; jobId?: string; error?: string }> {
    try {
      // 1. Create communication_job record
      const { data: job, error: jobErr } = await supabase
        .from('communication_jobs')
        .insert({
          organization_id: organizationId,
          store_id: storeId,
          thread_id: threadId || null,
          channel_code: channelCode,
          fallback_channel_code: fallbackChannelCode || null,
          recipient_identifier: recipientIdentifier,
          payload,
          priority: 5,
          status: 'processing',
        })
        .select()
        .single();

      if (jobErr || !job) {
        return { success: false, error: jobErr?.message || 'Failed to create job' };
      }

      // 2. Resolve Provider configuration from database
      const { data: providerConfig } = await supabase
        .from('communication_providers')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('channel_code', channelCode)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .limit(1)
        .maybeSingle();

      const providerName = providerConfig?.provider_name || (channelCode === 'whatsapp' ? 'meta_cloud' : channelCode === 'sms' ? 'twilio_sms' : 'sendgrid_email');
      const accountIdentifier = providerConfig?.account_identifier || process.env.META_PHONE_NUMBER_ID || 'mock_account';
      const secretRef = providerConfig?.provider_secret_reference || 'env:META_ACCESS_TOKEN';

      // Resolve Secret token dynamically
      const secretToken = await secretVaultResolver.resolveSecret(secretRef);

      // Lookup provider dispatcher from registry
      const provider = providerRegistry.getProvider(channelCode, providerName);
      if (!provider) {
        // Trigger fallback if primary provider unavailable
        if (fallbackChannelCode) {
          return this.dispatchMessage(storeId, organizationId, recipientIdentifier, payload, fallbackChannelCode, undefined, threadId);
        }
        return { success: false, error: `Provider ${channelCode}:${providerName} not found` };
      }

      // 3. Dispatch execution call
      const sendResult = await provider.sendMessage(
        recipientIdentifier,
        payload,
        secretToken,
        accountIdentifier,
        providerConfig?.config || {}
      );

      // Record job attempt
      await supabase.from('communication_job_attempts').insert({
        job_id: job.id,
        provider_id: providerConfig?.id || null,
        attempt_number: 1,
        status: sendResult.success ? 'success' : 'failure',
        response_payload: { wamid: sendResult.externalMessageId },
        error_message: sendResult.error || null,
        latency_ms: sendResult.latencyMs || 0,
      });

      // Update provider health
      if (providerConfig?.id) {
        await providerRegistry.updateHealth(providerConfig.id, sendResult.latencyMs || 0, sendResult.success, sendResult.error);
      }

      // Handle delivery failure -> retry or fallback
      if (!sendResult.success) {
        if (fallbackChannelCode) {
          console.warn(`[CommunicationEngine] ${channelCode} failed. Triggering fallback to ${fallbackChannelCode}`);
          return this.dispatchMessage(storeId, organizationId, recipientIdentifier, payload, fallbackChannelCode, undefined, threadId);
        }

        // Dead-letter queue insertion
        await supabase.from('communication_jobs').update({ status: 'failed', dead_lettered: true }).eq('id', job.id);
        await supabase.from('dead_letter_messages').insert({
          job_id: job.id,
          store_id: storeId,
          recipient_identifier: recipientIdentifier,
          channel_code: channelCode,
          last_error: sendResult.error || 'Send failed',
          payload,
        });

        await communicationEventBus.publish({
          eventType: 'job.dead_lettered',
          source: 'CommunicationEngine',
          payload: { jobId: job.id, recipientIdentifier, error: sendResult.error },
        });

        return { success: false, jobId: job.id, error: sendResult.error };
      }

      // 4. Update job completion
      await supabase.from('communication_jobs').update({ status: 'completed' }).eq('id', job.id);

      // 5. Save message record in `messages`
      let messageId: string | undefined;
      if (threadId) {
        const { data: msg } = await supabase
          .from('messages')
          .insert({
            thread_id: threadId,
            store_id: storeId,
            provider_id: providerConfig?.id || null,
            external_message_id: sendResult.externalMessageId,
            direction: 'outbound',
            sender_type: 'system',
            message_type: payload.message_type,
            content: payload.text || payload.template_key || 'Interactive Content',
            interactive_payload: payload.buttons ? { buttons: payload.buttons } : {},
            delivery_status: 'sent',
            sent_at: new Date().toISOString(),
            associated_entity_type: payload.associated_entity_type,
            associated_entity_id: payload.associated_entity_id,
          })
          .select()
          .single();

        messageId = msg?.id;

        // Update thread preview
        await supabase
          .from('message_threads')
          .update({
            last_message_at: new Date().toISOString(),
            last_message_preview: payload.text || `Sent ${payload.message_type}`,
          })
          .eq('id', threadId);
      }

      // Log cost entry
      await supabase.from('communication_costs').insert({
        organization_id: organizationId,
        store_id: storeId,
        message_id: messageId || null,
        channel_code: channelCode,
        provider_id: providerConfig?.id || null,
        category: payload.message_type === 'template' ? 'UTILITY' : 'TRANSACTIONAL',
        cost_amount: channelCode === 'whatsapp' ? 0.75 : 0.25,
        currency: 'INR',
      });

      await communicationEventBus.publish({
        eventType: 'message.sent',
        source: 'CommunicationEngine',
        payload: { messageId, threadId, recipientIdentifier, externalMessageId: sendResult.externalMessageId },
      });

      return { success: true, messageId, jobId: job.id };
    } catch (err: any) {
      console.error('[CommunicationEngine] dispatchMessage error:', err);
      return { success: false, error: err.message };
    }
  }
}

export const communicationEngine = new CommunicationEngine();
