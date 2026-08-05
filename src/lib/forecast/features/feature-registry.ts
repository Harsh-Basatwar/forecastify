/**
 * Feature Registry for dynamic builder registration & retrieval
 */

import { IFeatureBuilder } from './feature-types';

export class FeatureRegistry {
  private builders: Map<string, IFeatureBuilder> = new Map();

  public registerBuilder(builder: IFeatureBuilder): void {
    if (this.builders.has(builder.name)) {
      console.warn(`[FeatureRegistry] Overwriting existing builder: ${builder.name}`);
    }
    this.builders.set(builder.name, builder);
  }

  public unregisterBuilder(name: string): boolean {
    return this.builders.delete(name);
  }

  public getBuilder(name: string): IFeatureBuilder | undefined {
    return this.builders.get(name);
  }

  public getAllBuilders(): IFeatureBuilder[] {
    return Array.from(this.builders.values());
  }

  public getRawBuilders(): IFeatureBuilder[] {
    return this.getAllBuilders().filter((b) => b.stage === 'raw');
  }

  public getDerivedBuilders(): IFeatureBuilder[] {
    return this.getAllBuilders().filter((b) => b.stage === 'derived');
  }

  public clear(): void {
    this.builders.clear();
  }
}
