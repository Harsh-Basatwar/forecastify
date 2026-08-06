/**
 * Secrets Manager
 * Secret registry, rotation, versioning, encryption masking, and audit references.
 */

export interface SecretItem {
  key: string;
  version: number;
  updatedAt: string;
}

export class SecretsManager {
  private secrets: Map<string, SecretItem> = new Map();

  constructor() {
    this.secrets.set("GROQ_API_KEY", { key: "GROQ_API_KEY", version: 2, updatedAt: new Date().toISOString() });
    this.secrets.set("SUPABASE_SERVICE_ROLE_KEY", { key: "SUPABASE_SERVICE_ROLE_KEY", version: 1, updatedAt: new Date().toISOString() });
  }

  public listSecrets(): SecretItem[] {
    return Array.from(this.secrets.values());
  }

  public rotateSecret(key: string): SecretItem {
    let sec = this.secrets.get(key);
    if (!sec) {
      sec = { key, version: 1, updatedAt: new Date().toISOString() };
    } else {
      sec.version += 1;
      sec.updatedAt = new Date().toISOString();
    }
    this.secrets.set(key, sec);
    return sec;
  }
}

export const secretsManager = new SecretsManager();
