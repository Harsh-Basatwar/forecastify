/**
 * Sandbox Mode
 * Runs pipelines in dry-run mode without modifying production databases.
 */

export class SandboxMode {
  private isSandboxEnabled = false;

  public setSandboxMode(enabled: boolean) {
    this.isSandboxEnabled = enabled;
  }

  public isSandbox(): boolean {
    return this.isSandboxEnabled;
  }
}

export const sandboxMode = new SandboxMode();
