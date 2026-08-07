/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * EmailProvider — Provider implementation for Email Services (SendGrid / AWS SES)
 */

import type { ChannelCode, ICommunicationProvider, OutboundMessagePayload } from '../types';

export class EmailProvider implements ICommunicationProvider {
  channelCode: ChannelCode = 'email';
  providerName = 'sendgrid_email';

  async sendMessage(
    recipientIdentifier: string,
    payload: OutboundMessagePayload,
    secretToken: string,
    accountIdentifier: string,
    _config?: Record<string, any>
  ): Promise<{ success: boolean; externalMessageId?: string; error?: string; latencyMs?: number }> {
    const startTime = Date.now();
    const mockEmailId = `msg_email_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    if (secretToken && secretToken !== 'mock' && accountIdentifier) {
      try {
        const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${secretToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: recipientIdentifier }] }],
            from: { email: accountIdentifier },
            subject: payload.filename || 'Forecastify Business Communication',
            content: [{ type: 'text/html', value: `<p>${payload.text || ''}</p>` }],
          }),
        });

        if (!res.ok) {
          return { success: false, error: `Email Send Error ${res.status}`, latencyMs: Date.now() - startTime };
        }
        return { success: true, externalMessageId: mockEmailId, latencyMs: Date.now() - startTime };
      } catch (err: any) {
        return { success: false, error: err.message, latencyMs: Date.now() - startTime };
      }
    }

    return {
      success: true,
      externalMessageId: mockEmailId,
      latencyMs: Date.now() - startTime,
    };
  }

  verifyWebhookSignature(_rawBody: string, _signature: string, _secretToken: string): boolean {
    return true;
  }
}

export const emailProvider = new EmailProvider();
