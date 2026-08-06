/**
 * Maintenance Manager
 * Controls NORMAL, READ_ONLY, MAINTENANCE, EMERGENCY_SHUTDOWN, and GRACEFUL_SHUTDOWN modes.
 */

export type MaintenanceModeState = "NORMAL" | "READ_ONLY" | "MAINTENANCE" | "EMERGENCY_SHUTDOWN" | "GRACEFUL_SHUTDOWN";

export class MaintenanceManager {
  private currentMode: MaintenanceModeState = "NORMAL";

  public getMode(): MaintenanceModeState {
    return this.currentMode;
  }

  public setMode(mode: MaintenanceModeState): MaintenanceModeState {
    this.currentMode = mode;
    return this.currentMode;
  }
}

export const maintenanceManager = new MaintenanceManager();
