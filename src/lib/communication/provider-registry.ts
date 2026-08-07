/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ProviderRegistry & Secret Vault Resolver
 */

import { createClient } from '@supabase/supabase-js';
import type { ChannelCode, ICommunicationProvider, SecretVaultResolver } from './types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

/** Dynamic Secret Vault Resolver — Resolves secret references without storing tokens in DB */
export class EnvironmentSecretVaultResolver implements SecretVaultResolver {
  async resolveSecret(secretRef: string): Promise<string> {
    if (!secretRef) return '';

    // Handle "env:VAR_NAME"
    if (secretRef.startsWith('env:')) {
      const envKey = secretRef.replace('env:', '');
      return process.env[envKey] || '';
    }

    // Handle mock or static reference
    if (secretRef.startsWith('vault:')) {
      // In production: Connect to Supabase Vault or AWS Secrets Manager
      return process.env.META_WHATSAPP_TOKEN || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    }

    return secretRef; // Direct fallback
  }
}

export const secretVaultResolver = new EnvironmentSecretVaultResolver();

class ProviderRegistry {
  private providers: Map<string, ICommunicationProvider> = new Map();

  register(provider: ICommunicationProvider): void {
    const key = `${provider.channelCode}:${provider.providerName}`;
    this.providers.set(key, provider);
  }

  getProvider(channelCode: ChannelCode, providerName: string): ICommunicationProvider | undefined {
    return this.providers.get(`${channelCode}:${providerName}`);
  }

  /** Update health status of a provider */
  async updateHealth(providerId: string, latencyMs: number, success: boolean, errorMessage?: string): Promise<void> {
    try {
      const now = new Date().toISOString();
      const status = success ? 'healthy' : 'degraded';

      await supabase.from('provider_health').upsert({
        provider_id: providerId,
        status,
        latency_ms: latencyMs,
        last_successful_ping: success ? now : undefined,
        last_error_message: errorMessage || null,
        updated_at: now,
      });
    } catch (err) {
      console.error('[ProviderRegistry] Health update failed:', err);
    }
  }
}

export const providerRegistry = new ProviderRegistry();
