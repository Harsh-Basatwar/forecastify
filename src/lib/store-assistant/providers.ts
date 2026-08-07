/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * External Provider Abstractions
 * Supports Mock, Dev, and Production implementations for multi-channel messaging & document generation.
 */

export interface DispatchResult {
  success: boolean;
  messageId?: string;
  recipient?: string;
  error?: string;
  timestamp: string;
}

export interface WhatsAppProvider {
  sendTextMessage(phone: string, text: string): Promise<DispatchResult>;
  sendPOMessage(phone: string, poData: Record<string, any>): Promise<DispatchResult>;
}

export interface EmailProvider {
  sendEmail(to: string, subject: string, body: string, attachments?: any[]): Promise<DispatchResult>;
}

export interface SMSProvider {
  sendSMS(phone: string, message: string): Promise<DispatchResult>;
}

export interface PDFProvider {
  generatePOPDF(poData: Record<string, any>): Promise<{ pdfBuffer?: ArrayBuffer; pdfText: string }>;
}

/** Mock WhatsApp Provider for test & dev environments */
export class MockWhatsAppProvider implements WhatsAppProvider {
  async sendTextMessage(phone: string, text: string): Promise<DispatchResult> {
    return {
      success: true,
      messageId: `wa_mock_${Date.now()}`,
      recipient: phone,
      timestamp: new Date().toISOString(),
    };
  }

  async sendPOMessage(phone: string, poData: Record<string, any>): Promise<DispatchResult> {
    return {
      success: true,
      messageId: `wa_po_mock_${Date.now()}`,
      recipient: phone,
      timestamp: new Date().toISOString(),
    };
  }
}

/** Mock Email Provider */
export class MockEmailProvider implements EmailProvider {
  async sendEmail(to: string, subject: string, body: string): Promise<DispatchResult> {
    return {
      success: true,
      messageId: `email_mock_${Date.now()}`,
      recipient: to,
      timestamp: new Date().toISOString(),
    };
  }
}

/** Mock SMS Provider */
export class MockSMSProvider implements SMSProvider {
  async sendSMS(phone: string, message: string): Promise<DispatchResult> {
    return {
      success: true,
      messageId: `sms_mock_${Date.now()}`,
      recipient: phone,
      timestamp: new Date().toISOString(),
    };
  }
}

/** Mock PDF Provider */
export class MockPDFProvider implements PDFProvider {
  async generatePOPDF(poData: Record<string, any>): Promise<{ pdfText: string }> {
    return {
      pdfText: `PDF Document PO #${poData.po_number || poData.poId || 'PO-1001'} Total: ₹${poData.total_amount || 0}`,
    };
  }
}

// Singleton instances
export const whatsAppProvider: WhatsAppProvider = new MockWhatsAppProvider();
export const emailProvider: EmailProvider = new MockEmailProvider();
export const smsProvider: SMSProvider = new MockSMSProvider();
export const pdfProvider: PDFProvider = new MockPDFProvider();
