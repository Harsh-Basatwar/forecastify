/**
 * Counterfactual Session Manager
 * Milestone 5 - Forecastify XAI
 */

import { CounterfactualSession, CounterfactualScenario } from './explanation-types';
import { counterfactualEngine, CounterfactualInput } from './counterfactual-engine';

export class CounterfactualSessionManager {
  private sessions: Map<string, CounterfactualSession> = new Map();

  public createSession(storeId: string, title?: string, baselineExplanationId?: string): CounterfactualSession {
    const sessionId = `cf_sess_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const session: CounterfactualSession = {
      sessionId,
      storeId,
      title: title || 'What-If Interactive Simulation Session',
      status: 'ACTIVE',
      baselineExplanationId: baselineExplanationId || 'exp_default',
      scenarios: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  public getSession(sessionId: string): CounterfactualSession | undefined {
    return this.sessions.get(sessionId);
  }

  public addScenarioToSession(sessionId: string, input: CounterfactualInput): CounterfactualScenario {
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = this.createSession('store_default', 'New Simulation Session');
    }

    const scenario = counterfactualEngine.simulateScenario({
      ...input,
      explanationId: session.baselineExplanationId,
    });
    scenario.sessionId = session.sessionId;

    session.scenarios.push(scenario);
    session.updatedAt = new Date().toISOString();
    this.sessions.set(session.sessionId, session);

    return scenario;
  }

  public compareScenarios(sessionId: string): {
    sessionId: string;
    baselinePrediction: number;
    scenarioComparisons: {
      name: string;
      simulatedPrediction: number;
      delta: number;
      recommendation: string;
    }[];
  } {
    const session = this.sessions.get(sessionId);
    if (!session || session.scenarios.length === 0) {
      return {
        sessionId: sessionId || 'empty',
        baselinePrediction: 120,
        scenarioComparisons: [],
      };
    }

    const baselinePred = session.scenarios[0].simulatedOutputs.originalPrediction;

    const scenarioComparisons = session.scenarios.map((scen) => ({
      name: scen.name,
      simulatedPrediction: scen.simulatedOutputs.simulatedPrediction,
      delta: scen.simulatedOutputs.predictionDelta,
      recommendation: scen.simulatedOutputs.simulatedRecommendation,
    }));

    return {
      sessionId: session.sessionId,
      baselinePrediction: baselinePred,
      scenarioComparisons,
    };
  }
}

export const counterfactualSessionManager = new CounterfactualSessionManager();
