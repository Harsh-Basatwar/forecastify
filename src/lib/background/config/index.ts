/**
 * Configuration Registry
 * Dynamic feature flags, store/environment overrides, default values, and runtime hot-reloading.
 */

export interface ConfigurationItem {
  key: string;
  value: any;
  category: "FEATURE_FLAGS" | "ENVIRONMENT" | "STORE_OVERRIDE" | "SYSTEM_LIMITS";
  description: string;
  updatedAt: string;
}

export class ConfigurationRegistry {
  private configs: Map<string, ConfigurationItem> = new Map();

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults() {
    const items: ConfigurationItem[] = [
      { key: "ENABLE_AUTONOMOUS_RETRAINING", value: true, category: "FEATURE_FLAGS", description: "Allow automated champion/challenger deployment", updatedAt: new Date().toISOString() },
      { key: "ENABLE_EXPLAINABILITY_CACHE", value: true, category: "FEATURE_FLAGS", description: "Cache SHAP values and counterfactuals", updatedAt: new Date().toISOString() },
      { key: "MAX_CONCURRENT_WORKERS", value: 16, category: "SYSTEM_LIMITS", description: "Maximum concurrent worker node pool size", updatedAt: new Date().toISOString() },
      { key: "DRIFT_PSI_ALERT_THRESHOLD", value: 0.20, category: "SYSTEM_LIMITS", description: "PSI threshold triggering drift alerts", updatedAt: new Date().toISOString() },
    ];
    items.forEach((i) => this.configs.set(i.key, i));
  }

  public get(key: string): any {
    return this.configs.get(key)?.value;
  }

  public set(key: string, value: any, category: ConfigurationItem["category"] = "FEATURE_FLAGS", description = ""): ConfigurationItem {
    const item: ConfigurationItem = {
      key,
      value,
      category,
      description,
      updatedAt: new Date().toISOString(),
    };
    this.configs.set(key, item);
    return item;
  }

  public getAll(): ConfigurationItem[] {
    return Array.from(this.configs.values());
  }
}

export const configurationRegistry = new ConfigurationRegistry();
