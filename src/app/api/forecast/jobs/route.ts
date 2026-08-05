import { NextResponse } from 'next/server';
import { ForecastDomainService, ForecastJobType } from '@/lib/forecast';

/**
 * GET /api/forecast/jobs?jobId=...&storeId=...
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');
    const storeId = searchParams.get('storeId');

    if (!storeId || !jobId) {
      return NextResponse.json({ error: 'Missing required storeId or jobId parameter' }, { status: 400 });
    }

    const domainService = ForecastDomainService.createDefault();
    const job = await domainService.getForecastJob(jobId, storeId);

    if (!job) {
      return NextResponse.json({ error: 'Forecast job not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      job,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/forecast/jobs
 * Schedule a forecast background job
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { storeId, jobType, parameters } = body;

    if (!storeId || !jobType) {
      return NextResponse.json({ error: 'Missing required storeId or jobType' }, { status: 400 });
    }

    const domainService = ForecastDomainService.createDefault();
    const scheduledJob = await domainService.scheduleForecastJob(storeId, jobType as ForecastJobType, parameters || {});

    return NextResponse.json({
      success: true,
      job: scheduledJob,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
