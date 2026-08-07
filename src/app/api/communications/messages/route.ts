/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { communicationEngine } from '@/lib/communication/communication-engine';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

/**
 * GET — Fetch thread message history
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const threadId = searchParams.get('threadId');
  const limit = parseInt(searchParams.get('limit') || '50');

  if (!threadId) {
    return NextResponse.json({ error: 'threadId required' }, { status: 400 });
  }

  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Reset unread count for thread
    await supabase.from('message_threads').update({ unread_count: 0 }).eq('id', threadId);

    return NextResponse.json({ success: true, messages: messages || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST — Send Outbound Message from Conversation Center
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { storeId, organizationId, threadId, recipientIdentifier, text, messageType, buttons, channelCode } = body;

    if (!storeId || !recipientIdentifier || (!text && !buttons)) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const orgId = organizationId || '00000000-0000-0000-0000-000000000000';
    const channel = channelCode || 'whatsapp';

    const result = await communicationEngine.dispatchMessage(
      storeId,
      orgId,
      recipientIdentifier,
      {
        message_type: messageType || (buttons ? 'interactive_button' : 'text'),
        text,
        buttons,
      },
      channel,
      'sms', // Fallback to SMS if WhatsApp fails
      threadId
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, messageId: result.messageId, jobId: result.jobId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
