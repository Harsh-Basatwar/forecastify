/**
 * Audit Engine
 * Immutable audit trail recording background job creation, execution, retries, worker state changes, and admin actions.
 */

export interface AuditRecord {
  id: string;
  storeId?: string;
  action: string;
  actor: string;
  resourceType: string;
  resourceId?: string;
  details: Record<string, any>;
  createdAt: string;
}

export class AuditEngine {
  private records: AuditRecord[] = [];

  constructor() {
    this.seedMockAuditRecords();
  }

  private seedMockAuditRecords() {
    this.records = [
      {
        id: "audit_1",
        storeId: "default-store-id",
        action: "MODEL_PROMOTED",
        actor: "ContinuousModelMonitor",
        resourceType: "ModelRegistry",
        resourceId: "ensemble-v3.0",
        details: { improvementMape: "20.8%" },
        createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      },
      {
        id: "audit_2",
        storeId: "default-store-id",
        action: "WORKER_RESTARTED",
        actor: "RecoveryEngine",
        resourceType: "WorkerOrchestrator",
        resourceId: "TrainingWorker-1",
        details: { reason: "Memory threshold breach" },
        createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
      },
      {
        id: "audit_3",
        storeId: "default-store-id",
        action: "CACHE_INVALIDATED",
        actor: "CacheWorker",
        resourceType: "CacheManager",
        resourceId: "ForecastCache",
        details: { invalidatedKeys: 120 },
        createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      },
    ];
  }

  public getAuditRecords(): AuditRecord[] {
    return [...this.records];
  }

  public logEvent(event: Omit<AuditRecord, "id" | "createdAt">): AuditRecord {
    const record: AuditRecord = {
      ...event,
      id: `audit_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.records.unshift(record);
    return record;
  }
}

export const auditEngine = new AuditEngine();
