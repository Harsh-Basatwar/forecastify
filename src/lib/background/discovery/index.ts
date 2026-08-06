/**
 * Service Discovery
 * Subsystem registration, heartbeats, node availability, capabilities matrix, and version specs.
 */

export interface RegisteredService {
  serviceId: string;
  serviceName: string;
  status: "ONLINE" | "DEGRADED" | "OFFLINE";
  version: string;
  capabilities: string[];
  lastPing: string;
}

export class ServiceDiscovery {
  private services: Map<string, RegisteredService> = new Map();

  constructor() {
    const list: RegisteredService[] = [
      { serviceId: "srv-forecast", serviceName: "Forecast Engine", status: "ONLINE", version: "2.0.0", capabilities: ["INFERENCE", "ENSEMBLE", "BATCH"], lastPing: new Date().toISOString() },
      { serviceId: "srv-feature", serviceName: "Feature Store", status: "ONLINE", version: "2.0.0", capabilities: ["DERIVED_FEATURES", "LINEAGE", "NORMALIZATION"], lastPing: new Date().toISOString() },
      { serviceId: "srv-recommendation", serviceName: "Recommendation Engine", status: "ONLINE", version: "2.0.0", capabilities: ["REORDER", "EXPIRY_RISK", "DECISION_GRAPH"], lastPing: new Date().toISOString() },
      { serviceId: "srv-explainability", serviceName: "Explainability Engine", status: "ONLINE", version: "2.0.0", capabilities: ["SHAP", "COUNTERFACTUALS"], lastPing: new Date().toISOString() },
    ];
    list.forEach((s) => this.services.set(s.serviceId, s));
  }

  public getServices(): RegisteredService[] {
    return Array.from(this.services.values());
  }
}

export const serviceDiscovery = new ServiceDiscovery();
