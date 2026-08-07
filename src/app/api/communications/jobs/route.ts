/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { communicationEngine } from '@/lib/communication/communication-engine';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

/**
 * GET — Run pending communication queue jobs
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get('storeId');

  try {
    let query = supabase
      .from('communication_jobs')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .order('priority', { ascending: true })
      .limit(20);

    if (storeId) query = query.eq('store_id', storeId);

    const { data: jobs } = await query;
    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ success: true, processed: 0 });
    }

    let processedCount = 0;
    for (const job of jobs) {
      const result = await communicationEngine.dispatchMessage(
        job.store_id,
        job.organization_id,
        job.recipient_identifier,
        job.payload,
        job.channel_code,
        job.fallback_channel_code || undefined,
        job.thread_id || undefined
      );

      if (result.success) processedCount++;
    }

    return NextResponse.json({ success: true, totalJobs: jobs.length, processed: processedCount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
