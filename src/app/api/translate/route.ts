import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { from = 'en', to, json } = body;

    if (!to || !json) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const apiKey = process.env.RAPIDAPI_KEY || 'dbd1341a70msh7fb2b5c52656361p1ee998jsnc82f12670eed'; // fallback to provided key if env not set

    const response = await fetch('https://google-translate113.p.rapidapi.com/api/v1/translator/json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': 'google-translate113.p.rapidapi.com',
        'x-rapidapi-key': apiKey
      },
      body: JSON.stringify({
        from,
        to,
        json
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Translation API error:', errorText);
      return NextResponse.json({ error: 'Translation failed' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Translation route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
