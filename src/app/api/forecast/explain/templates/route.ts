import { NextResponse } from 'next/server';
import { ExplanationAudience, AudienceTemplate } from '@/lib/forecast/explainability/explanation-types';

export async function GET() {
  try {
    const templates: AudienceTemplate[] = [
      {
        templateKey: 'executive',
        audience: ExplanationAudience.EXECUTIVE,
        sections: {
          headline: true,
          summary: true,
          detailedRationale: false,
          featureWaterfall: true,
          confidenceBreakdown: true,
          assumptions: true,
          alternatives: true,
          lineageHash: true,
          graphData: false,
          rawEvidence: false,
        },
      },
      {
        templateKey: 'manager',
        audience: ExplanationAudience.MANAGER,
        sections: {
          headline: true,
          summary: true,
          detailedRationale: true,
          featureWaterfall: true,
          confidenceBreakdown: true,
          assumptions: true,
          alternatives: true,
          lineageHash: true,
          graphData: true,
          rawEvidence: false,
        },
      },
      {
        templateKey: 'analyst',
        audience: ExplanationAudience.ANALYST,
        sections: {
          headline: true,
          summary: true,
          detailedRationale: true,
          featureWaterfall: true,
          confidenceBreakdown: true,
          assumptions: true,
          alternatives: true,
          lineageHash: true,
          graphData: true,
          rawEvidence: true,
        },
      },
      {
        templateKey: 'developer',
        audience: ExplanationAudience.DEVELOPER,
        sections: {
          headline: true,
          summary: true,
          detailedRationale: true,
          featureWaterfall: true,
          confidenceBreakdown: true,
          assumptions: true,
          alternatives: true,
          lineageHash: true,
          graphData: true,
          rawEvidence: true,
        },
      },
      {
        templateKey: 'api',
        audience: ExplanationAudience.API,
        sections: {
          headline: true,
          summary: true,
          detailedRationale: true,
          featureWaterfall: true,
          confidenceBreakdown: true,
          assumptions: true,
          alternatives: true,
          lineageHash: true,
          graphData: true,
          rawEvidence: true,
        },
      },
    ];

    return NextResponse.json({
      success: true,
      templates,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
