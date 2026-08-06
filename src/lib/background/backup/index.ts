/**
 * Backup Manager
 * Snapshot backups (Database, Feature Store, Model Registry, Recommendations, Explanations, Configs) & restore support.
 */

export interface BackupSnapshot {
  id: string;
  backupName: string;
  backupType: "FULL" | "DELTA" | "CONFIG";
  sizeBytes: number;
  status: "COMPLETED" | "FAILED" | "IN_PROGRESS";
  storageLocation: string;
  createdAt: string;
}

export class BackupManager {
  private backups: BackupSnapshot[] = [];

  constructor() {
    this.backups = [
      {
        id: "bk_1",
        backupName: "daily_full_snapshot_20260806.snap",
        backupType: "FULL",
        sizeBytes: 450000000,
        status: "COMPLETED",
        storageLocation: "s3://forecastify-backups/daily_full_snapshot_20260806.snap",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
  }

  public getBackups(): BackupSnapshot[] {
    return [...this.backups];
  }

  public createSnapshot(name: string, backupType: BackupSnapshot["backupType"] = "FULL"): BackupSnapshot {
    const bk: BackupSnapshot = {
      id: `bk_${Date.now()}`,
      backupName: name,
      backupType,
      sizeBytes: Math.floor(Math.random() * 100000000) + 200000000,
      status: "COMPLETED",
      storageLocation: `s3://forecastify-backups/${name}`,
      createdAt: new Date().toISOString(),
    };
    this.backups.unshift(bk);
    return bk;
  }
}

export const backupManager = new BackupManager();
