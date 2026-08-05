export class ModelVersion {
  public readonly major: number;
  public readonly minor: number;
  public readonly patch: number;
  public readonly raw: string;

  constructor(versionString: string) {
    this.raw = versionString.startsWith('v') ? versionString.slice(1) : versionString;
    const parts = this.raw.split('.').map((p) => parseInt(p, 10) || 0);
    this.major = parts[0] || 1;
    this.minor = parts[1] || 0;
    this.patch = parts[2] || 0;
  }

  public compareTo(other: ModelVersion): number {
    if (this.major !== other.major) return this.major - other.major;
    if (this.minor !== other.minor) return this.minor - other.minor;
    return this.patch - other.patch;
  }

  public isCompatibleWith(other: ModelVersion): boolean {
    return this.major === other.major;
  }

  public bumpMajor(): ModelVersion {
    return new ModelVersion(`${this.major + 1}.0.0`);
  }

  public bumpMinor(): ModelVersion {
    return new ModelVersion(`${this.major}.${this.minor + 1}.0`);
  }

  public bumpPatch(): ModelVersion {
    return new ModelVersion(`${this.major}.${this.minor}.${this.patch + 1}`);
  }

  public toString(): string {
    return `${this.major}.${this.minor}.${this.patch}`;
  }
}
