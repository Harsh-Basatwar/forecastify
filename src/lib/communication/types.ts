/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Phase 2 — Communication Subsystem TypeScript Models & Provider Contracts
 */

export type ChannelCode = 'whatsapp' | 'sms' | 'email' | 'push' | 'rcs' | 'telegram' | 'slack';

export interface CommunicationChannelRow {
  id: string;
  code: ChannelCode;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface CommunicationProviderRow {
  id: string;
  organization_id: string;
  store_id?: string | null;
  channel_code: ChannelCode;
  provider_name: string; // e.g. 'meta_cloud' | 'twilio' | 'sendgrid' | 'gupshup'
  provider_secret_reference: string; // Secret vault lookup key e.g. "env:META_ACCESS_TOKEN_STORE_1"
  account_identifier: string; // Phone ID, WABA ID, Twilio SID, Sender Email
  config: Record<string, any>;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProviderHealthRow {
  id: string;
  provider_id: string;
  status: 'healthy' | 'degraded' | 'down';
  latency_ms: number;
  availability_pct: number;
  failure_rate_pct: number;
  queue_depth: number;
  last_successful_ping: string;
  last_error_message?: string | null;
  updated_at: string;
}

export interface MessageTemplateRow {
  id: string;
  organization_id: string;
  channel_code: ChannelCode;
  template_key: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION' | 'OPERATIONS';
  name: string;
  current_version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplateVersionRow {
  id: string;
  template_id: string;
  version: number;
  language: string;
  external_template_id?: string | null;
  header_type: 'NONE' | 'TEXT' | 'IMAGE' | 'DOCUMENT';
  body_text: string;
  footer_text?: string | null;
  buttons: TemplateButton[];
  variables_schema: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejection_reason?: string | null;
  created_at: string;
}

export interface TemplateButton {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
  text: string;
  payload?: string;
  url?: string;
  phone_number?: string;
}

export interface MessageThreadRow {
  id: string;
  organization_id: string;
  store_id: string;
  channel_code: ChannelCode;
  thread_title?: string | null;
  last_message_at: string;
  last_message_preview?: string | null;
  unread_count: number;
  status: 'open' | 'closed' | 'archived' | 'pending_human';
  session_expires_at?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  participants?: ConversationParticipantRow[];
}

export interface ConversationParticipantRow {
  id: string;
  thread_id: string;
  entity_type: 'supplier' | 'customer' | 'employee' | 'driver' | 'hq_user';
  entity_id: string;
  identifier: string;
  role: 'primary' | 'member' | 'observer' | 'manager';
  joined_at: string;
  entity_name?: string;
}

export interface MessageRow {
  id: string;
  thread_id: string;
  store_id: string;
  provider_id?: string | null;
  external_message_id?: string | null;
  direction: 'inbound' | 'outbound';
  sender_type: 'system' | 'ai_agent' | 'user' | 'contact';
  sender_id?: string | null;
  message_type: 'text' | 'template' | 'interactive_button' | 'list' | 'document' | 'image' | 'audio';
  content?: string | null;
  media_url?: string | null;
  media_mime_type?: string | null;
  interactive_payload?: Record<string, any>;
  template_version_id?: string | null;
  delivery_status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  sent_at?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
  ai_parsed: boolean;
  associated_entity_type?: string | null;
  associated_entity_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommunicationJobRow {
  id: string;
  organization_id: string;
  store_id: string;
  thread_id?: string | null;
  channel_code: ChannelCode;
  preferred_provider_id?: string | null;
  fallback_channel_code?: ChannelCode | null;
  recipient_identifier: string;
  payload: OutboundMessagePayload;
  priority: number;
  scheduled_at: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  attempts_count: number;
  max_attempts: number;
  dead_lettered: boolean;
  created_at: string;
  updated_at: string;
}

export interface OutboundMessagePayload {
  message_type: 'text' | 'template' | 'interactive_button' | 'list' | 'document' | 'image';
  text?: string;
  template_key?: string;
  template_variables?: Record<string, any>;
  buttons?: Array<{ id: string; title: string }>;
  media_url?: string;
  filename?: string;
  associated_entity_type?: string;
  associated_entity_id?: string;
}

export interface WorkflowStateRow {
  id: string;
  store_id: string;
  thread_id: string;
  workflow_type: 'supplier_po_negotiation' | 'customer_khata_recovery' | 'employee_audit';
  entity_type: 'purchase_order' | 'khata_account' | 'employee_task';
  entity_id: string;
  current_state: WorkflowStateStep;
  state_data: Record<string, any>;
  history: Array<{ state: WorkflowStateStep; timestamp: string; note?: string }>;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export type WorkflowStateStep =
  | 'INITIATED'
  | 'WAITING_SUPPLIER_RESPONSE'
  | 'PARTIAL_ACCEPTED'
  | 'PRICE_NEGOTIATION'
  | 'MANAGER_APPROVAL'
  | 'ORDER_CONFIRMED'
  | 'DISPATCH_PENDING'
  | 'DELIVERED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'WAITING_CUSTOMER_PAYMENT'
  | 'PAYMENT_PROMISED'
  | 'PAID';

export interface ApprovalPolicyRow {
  id: string;
  organization_id: string;
  policy_name: string;
  trigger_action: string;
  entity_type: string;
  min_amount: number;
  max_variance_pct: number;
  required_role: string;
  auto_approve_if_below: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommunicationPreferenceRow {
  id: string;
  organization_id: string;
  entity_type: 'supplier' | 'customer' | 'employee';
  entity_id: string;
  channel_code: ChannelCode;
  message_category: 'marketing' | 'utility' | 'transactional' | 'operational';
  is_enabled: boolean;
  preferred_time_start: string;
  preferred_time_end: string;
  created_at: string;
  updated_at: string;
}

/** 4-Tier AI Human Confidence Band */
export enum ConfidenceBand {
  BAND_0_REJECT = 0, // 0 - 59% -> Reject
  BAND_1_MANAGER_REVIEW = 1, // 60 - 84% -> Flag for Review
  BAND_2_SUGGESTED_AUTO = 2, // 85 - 94% -> Queue with auto-approve timer
  BAND_3_INSTANT_EXECUTE = 3, // 95 - 100% -> Immediate execution
}

export interface ParsedActionResult {
  intent: string;
  confidence: number;
  band: ConfidenceBand;
  raw_text: string;
  extracted_entities: {
    po_number?: string;
    delivery_date?: string;
    quantity?: number;
    unit_price?: number;
    payment_date?: string;
    payment_amount?: number;
    reason?: string;
  };
  proposed_action: string;
  requires_approval: boolean;
  approval_reason?: string;
}

/** Dynamic Secret Reference Resolver Interface */
export interface SecretVaultResolver {
  resolveSecret(secretRef: string): Promise<string>;
}

/** Provider Contract for Output Channel Dispatchers */
export interface ICommunicationProvider {
  channelCode: ChannelCode;
  providerName: string;
  sendMessage(
    recipientIdentifier: string,
    payload: OutboundMessagePayload,
    secretToken: string,
    accountIdentifier: string,
    config?: Record<string, any>
  ): Promise<{ success: boolean; externalMessageId?: string; error?: string; latencyMs?: number }>;
  verifyWebhookSignature(rawBody: string, signature: string, secretToken: string): boolean;
}
