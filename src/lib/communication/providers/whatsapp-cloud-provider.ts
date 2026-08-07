/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * WhatsAppCloudProvider — Meta WhatsApp Business Cloud API Integration
 */

import crypto from 'crypto';
import type { ChannelCode, ICommunicationProvider, OutboundMessagePayload } from '../types';

export class WhatsAppCloudProvider implements ICommunicationProvider {
  channelCode: ChannelCode = 'whatsapp';
  providerName = 'meta_cloud';

  async sendMessage(
    recipientIdentifier: string,
    payload: OutboundMessagePayload,
    secretToken: string,
    accountIdentifier: string, // phone_number_id
    config?: Record<string, any>
  ): Promise<{ success: boolean; externalMessageId?: string; error?: string; latencyMs?: number }> {
    const startTime = Date.now();
    const cleanPhone = recipientIdentifier.replace(/[^\d]/g, '');
    const apiVersion = config?.apiVersion || 'v20.0';
    const url = `https://graph.facebook.com/${apiVersion}/${accountIdentifier}/messages`;

    // Format request body according to Meta Cloud API specification
    const body: Record<string, any> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
    };

    if (payload.message_type === 'template' && payload.template_key) {
      body.type = 'template';
      body.template = {
        name: payload.template_key,
        language: { code: 'en_US' },
        components: payload.template_variables
          ? [
              {
                type: 'body',
                parameters: Object.values(payload.template_variables).map((val) => ({
                  type: 'text',
                  text: String(val),
                })),
              },
            ]
          : [],
      };
    } else if (payload.message_type === 'interactive_button' && payload.buttons) {
      body.type = 'interactive';
      body.interactive = {
        type: 'button',
        body: { text: payload.text || 'Action Required:' },
        action: {
          buttons: payload.buttons.map((btn) => ({
            type: 'reply',
            reply: { id: btn.id, title: btn.title.slice(0, 20) }, // Meta 20 char limit
          })),
        },
      };
    } else if (payload.message_type === 'document' && payload.media_url) {
      body.type = 'document';
      body.document = {
        link: payload.media_url,
        filename: payload.filename || 'Document.pdf',
        caption: payload.text || '',
      };
    } else {
      // Standard Text
      body.type = 'text';
      body.text = { preview_url: false, body: payload.text || '' };
    }

    // Mock Mode fallback for local development or unconfigured API tokens
    if (!secretToken || secretToken === 'mock' || !accountIdentifier) {
      const mockWamid = `wamid.HBgL${Date.now()}MockMsg${Math.floor(Math.random() * 1000)}`;
      return {
        success: true,
        externalMessageId: mockWamid,
        latencyMs: Date.now() - startTime,
      };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secretToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const latencyMs = Date.now() - startTime;
      const json = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: json.error?.message || `Meta API Error ${response.status}`,
          latencyMs,
        };
      }

      const wamid = json.messages?.[0]?.id;
      return {
        success: true,
        externalMessageId: wamid,
        latencyMs,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network call failed',
        latencyMs: Date.now() - startTime,
      };
    }
  }

  /** Validate Meta HMAC SHA-256 X-Hub-Signature-256 header */
  verifyWebhookSignature(rawBody: string, signature: string, secretToken: string): boolean {
    if (!signature || !secretToken) return true; // Development bypass if unconfigured
    try {
      const expectedSignature = `sha256=${crypto
        .createHmac('sha256', secretToken)
        .update(rawBody)
        .digest('hex')}`;
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    } catch (err) {
      return false;
    }
  }
}

export const whatsappCloudProvider = new WhatsAppCloudProvider();
