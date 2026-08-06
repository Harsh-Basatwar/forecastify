/**
 * Counterfactual Engine (What-If Simulation)
 * Milestone 5 - Forecastify XAI
 */

import { CounterfactualScenario, CounterfactualStatus } from './explanation-types';
import { FeatureInputVector } from './feature-attribution-strategy';

export interface CounterfactualInput {
  explanationId?: string;
  scenarioName?: string;
  originalPrediction?: number;
  originalRecommendation?: string;
  modifiedInputs: {
    priceChangePercentage?: number; // e.g. -5 for 5% price reduction
    supplierDelayDaysDelta?: number; // e.g. +2 for 2 extra days delay
    promotionActive?: boolean;
    inventoryLevelChange?: number;
  };
}

export class CounterfactualEngine {
  public simulateScenario(input: CounterfactualInput): CounterfactualScenario {
    const runId = `cf_run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const scenarioId = `cf_scen_${Math.random().toString(36).slice(2, 9)}`;

    const origPred = input.originalPrediction ?? 120;
    const origRec = input.originalRecommendation ?? 'Order 50 Units';

    let simPred = origPred;
    let simRec = origRec;

    const modified = input.modifiedInputs;

    // Deterministic simulation physics:
    // Price decrease increases demand (elasticity ~ -1.2)
    if (modified.priceChangePercentage !== undefined) {
      const demandDeltaPct = -modified.priceChangePercentage * 1.2;
      simPred += Math.round((origPred * demandDeltaPct) / 100);
    }

    // Supplier delay shifts required reorder safety stock upwards
    if (modified.supplierDelayDaysDelta !== undefined) {
      const extraSafetyStock = modified.supplierDelayDaysDelta * 15;
      if (extraSafetyStock > 0) {
        simRec = `Expedite Order or Increase Reorder to ${50 + extraSafetyStock} Units`;
      }
    }

    // Promotion activation increases demand by +25%
    if (modified.promotionActive !== undefined) {
      if (modified.promotionActive) {
        simPred = Math.round(simPred * 1.25);
        simRec = `Increase Reorder Quantity to ${Math.round(simPred * 0.45)} Units`;
      } else {
        simPred = Math.round(simPred * 0.85);
      }
    }

    const predDelta = simPred - origPred;
    const pctChange = Math.round((predDelta / origPred) * 1000) / 10;
    const recChanged = simRec !== origRec;

    const scenarioName = input.scenarioName || 'Custom Input Modification Scenario';

    const explanationSummary = `Counterfactual simulation result for scenario "${scenarioName}": Predicted sales shifting from ${origPred} to ${simPred} units (${pctChange >= 0 ? '+' : ''}${pctChange}%). Recommendation ${recChanged ? `changed from "${origRec}" to "${simRec}"` : 'remains unchanged'}.`;

    return {
      scenarioId,
      runId,
      name: scenarioName,
      modifiedInputs: input.modifiedInputs,
      simulatedOutputs: {
        originalPrediction: origPred,
        simulatedPrediction: simPred,
        predictionDelta: predDelta,
        predictionPercentageChange: pctChange,
        originalRecommendation: origRec,
        simulatedRecommendation: simRec,
        recommendationChanged: recChanged,
      },
      assumptions: [
        {
          assumptionId: 'asm_sim_1',
          category: 'pricing',
          statement: `Modified price elasticity model applied with ${modified.priceChangePercentage ?? 0}% change.`,
          riskRating: 'MEDIUM',
          impactScope: 'Demand Simulation Vector',
          valueExpected: `${simPred} units`,
          isVerified: false,
        },
      ],
      explanationSummary,
      status: CounterfactualStatus.SIMULATED,
      timestamp: new Date().toISOString(),
    };
  }
}

export const counterfactualEngine = new CounterfactualEngine();
