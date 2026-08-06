import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { backupManager } from "../../lib/background/backup";
import { disasterRecovery } from "../../lib/background/disaster";

describe("Backup & Disaster Recovery", () => {
  test("should create snapshots and execute recovery plan", () => {
    const snap = backupManager.createSnapshot("test_snap.snap", "FULL");
    assert.ok(snap.id);

    const rec = disasterRecovery.executeRecoveryPlan(snap.id);
    assert.equal(rec.success, true);
  });
});
