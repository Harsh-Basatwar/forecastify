/**
 * Recommendation Registry
 * Registry registering standard rules and custom dynamic marketplace plugins.
 */

import { RecommendationMarketplace } from './recommendation-marketplace';

export class RecommendationRegistry {
  private marketplace: RecommendationMarketplace;

  constructor() {
    this.marketplace = new RecommendationMarketplace();
  }

  public getMarketplace(): RecommendationMarketplace {
    return this.marketplace;
  }
}
