/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

/**
 * GET — List active conversation threads with participant data
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get('storeId');
  const channel = searchParams.get('channel');
  const status = searchParams.get('status') || 'open';
  const participantType = searchParams.get('participantType');

  try {
    let query = supabase
      .from('message_threads')
      .select('*, conversation_participants(*)')
      .order('last_message_at', { ascending: false });

    if (storeId) query = query.eq('store_id', storeId);
    if (channel && channel !== 'all') query = query.eq('channel_code', channel);
    if (status && status !== 'all') query = query.eq('status', status);

    const { data: threads, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let filtered = threads || [];
    if (participantType && participantType !== 'all') {
      filtered = filtered.filter((t: any) =>
        t.conversation_participants?.some((p: any) => p.entity_type === participantType)
      );
    }

    return NextResponse.json({ success: true, threads: filtered });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
