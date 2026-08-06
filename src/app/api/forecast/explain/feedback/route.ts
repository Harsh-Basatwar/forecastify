import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { explanationId, userId, usefulnessScore, comments, correctionRequests } = body;

    if (!explanationId || !usefulnessScore) {
      return NextResponse.json({ success: false, error: 'explanationId and usefulnessScore required' }, { status: 400 });
    }

    const feedbackRecord = {
      feedbackId: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      explanationId,
      userId: userId || 'usr_dev',
      usefulnessScore: Number(usefulnessScore),
      comments: comments || '',
      correctionRequests: correctionRequests || '',
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      feedback: feedbackRecord,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
