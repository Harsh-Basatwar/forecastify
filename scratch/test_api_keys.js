const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
    }
  }
});

async function testFetch(name, url, options = {}) {
  try {
    const res = await fetch(url, options);
    const status = res.status;
    const text = await res.text().catch(() => '');

    if (status >= 200 && status < 300) {
      return { status, name, working: true, details: text.slice(0, 150) };
    } else if (status === 429) {
      return { status, name, working: false, reason: 'Exhausted / Rate Limited (429)', details: text.slice(0, 200) };
    } else if (status === 402) {
      return { status, name, working: false, reason: 'Quota / Credit Exhausted (402)', details: text.slice(0, 200) };
    } else if (status === 401 || status === 403) {
      return { status, name, working: false, reason: `Invalid/Expired/Unauthorized (${status})`, details: text.slice(0, 200) };
    } else {
      return { status, name, working: false, reason: `Status ${status}`, details: text.slice(0, 200) };
    }
  } catch (err) {
    return { status: 0, name, working: false, reason: `Network Error: ${err.message}` };
  }
}

async function runDiagnostics() {
  const results = [];

  // Supabase Table Query test
  if (env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    results.push(await testFetch('SUPABASE_ANON_KEY (Table REST Query)', `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/inventory?select=*&limit=1`, {
      headers: {
        'apikey': env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
      }
    }));
  }

  // Groq Keys
  if (env.GROQ_API_KEY) {
    results.push(await testFetch('GROQ_API_KEY (Key 1)', 'https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${env.GROQ_API_KEY}` }
    }));
  }

  if (env.GROQ_API_KEY_2) {
    results.push(await testFetch('GROQ_API_KEY_2 (Key 2)', 'https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${env.GROQ_API_KEY_2}` }
    }));
  }

  if (env.GROQ_API_KEY_3) {
    results.push(await testFetch('GROQ_API_KEY_3 (Key 3)', 'https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${env.GROQ_API_KEY_3}` }
    }));
  }

  // Serper
  if (env.SERPER_API_KEY) {
    results.push(await testFetch('SERPER_API_KEY', 'https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': env.SERPER_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: 'test query' })
    }));
  }

  // OpenWeather
  if (env.OPENWEATHER_API_KEY) {
    results.push(await testFetch('OPENWEATHER_API_KEY', `https://api.openweathermap.org/data/2.5/weather?q=Mumbai&appid=${env.OPENWEATHER_API_KEY}`));
  }

  // Google Maps
  if (env.GOOGLE_MAPS_API_KEY) {
    results.push(await testFetch('GOOGLE_MAPS_API_KEY', `https://maps.googleapis.com/maps/api/geocode/json?address=Mumbai&key=${env.GOOGLE_MAPS_API_KEY}`));
  }

  // Gemini
  if (env.GEMINI_API_KEY) {
    results.push(await testFetch('GEMINI_API_KEY', `https://generativelanguage.googleapis.com/v1beta/models?key=${env.GEMINI_API_KEY}`));
  }

  console.log('\n==================================================');
  console.log('            API KEY AUDIT REPORT                  ');
  console.log('==================================================\n');

  results.forEach(r => {
    if (r.working) {
      console.log(`✅ [WORKING] ${r.name}`);
    } else {
      console.log(`❌ [FAILED / EXHAUSTED] ${r.name}`);
      console.log(`   Status: ${r.status}`);
      console.log(`   Reason: ${r.reason}`);
      console.log(`   Details: ${r.details}`);
    }
  });
}

runDiagnostics();
