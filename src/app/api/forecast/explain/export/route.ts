import { NextResponse } from 'next/server';
import { explanationEngine } from '@/lib/forecast/explainability/explanation-engine';
import { explanationExportService } from '@/lib/forecast/explainability/explanation-export';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const explanation = await explanationEngine.generatePredictionExplanation({
      predictionId: body.predictionId || 'pred_101',
    });

    const format = body.format || 'audit_package';

    if (format === 'csv') {
      const csv = explanationExportService.exportCSV(explanation);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="xai_${explanation.explanationId}.csv"`,
        },
      });
    }

    if (format === 'json') {
      const json = explanationExportService.exportJSON(explanation);
      return new NextResponse(json, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="xai_${explanation.explanationId}.json"`,
        },
      });
    }

    const pkg = explanationExportService.exportAuditPackage(explanation);
    return NextResponse.json({
      success: true,
      package: pkg,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
