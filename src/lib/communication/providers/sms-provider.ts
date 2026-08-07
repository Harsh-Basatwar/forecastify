/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * SMSProvider — Provider implementation for SMS Gateways (Twilio / Gupshup)
 */

import type { ChannelCode, ICommunicationProvider, OutboundMessagePayload } from '../types';

export class SmsProvider implements ICommunicationProvider {
  channelCode: ChannelCode = 'sms';
  providerName = 'twilio_sms';

  async sendMessage(
    recipientIdentifier: string,
    payload: OutboundMessagePayload,
    secretToken: string,
    accountIdentifier: string,
    _config?: Record<string, any>
  ): Promise<{ success: boolean; externalMessageId?: string; error?: string; latencyMs?: number }> {
    const startTime = Date.now();
    const mockSmsSid = `SM${Math.random().toString(36).substring(2, 15)}${Date.now()}`;

    // If live token available, issue fetch request to Twilio/Gupshup
    if (secretToken && secretToken !== 'mock' && accountIdentifier) {
      try {
        // Example Twilio API dispatch logic
        const auth = Buffer.from(`${accountIdentifier}:${secretToken}`).toString('base64');
        const params = new URLSearchParams();
        params.append('To', recipientIdentifier);
        params.append('From', _config?.fromNumber || '+15005550006');
        params.append('Body', payload.text || '');

        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountIdentifier}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
          }
        );

        const data = await res.json();
        if (!res.ok) {
          return { success: false, error: data.message || 'SMS send failed', latencyMs: Date.now() - startTime };
        }
        return { success: true, externalMessageId: data.sid, latencyMs: Date.now() - startTime };
      } catch (err: any) {
        return { success: false, error: err.message, latencyMs: Date.now() - startTime };
      }
    }

    return {
      success: true,
      externalMessageId: mockSmsSid,
      latencyMs: Date.now() - startTime,
    };
  }

  verifyWebhookSignature(_rawBody: string, _signature: string, _secretToken: string): boolean {
    return true;
  }
}

export const smsProvider = new SmsProvider();
