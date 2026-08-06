import { NextResponse } from 'next/server';
import { counterfactualEngine } from '@/lib/forecast/explainability/counterfactual-engine';
import { counterfactualSessionManager } from '@/lib/forecast/explainability/counterfactual-session';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, scenarioName, originalPrediction, originalRecommendation, modifiedInputs } = body;

    if (sessionId) {
      const scenario = counterfactualSessionManager.addScenarioToSession(sessionId, {
        scenarioName,
        originalPrediction,
        originalRecommendation,
        modifiedInputs: modifiedInputs || {},
      });
      const sessionComparison = counterfactualSessionManager.compareScenarios(sessionId);
      return NextResponse.json({
        success: true,
        scenario,
        sessionComparison,
      });
    }

    const scenario = counterfactualEngine.simulateScenario({
      scenarioName,
      originalPrediction,
      originalRecommendation,
      modifiedInputs: modifiedInputs || {},
    });

    return NextResponse.json({
      success: true,
      scenario,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
