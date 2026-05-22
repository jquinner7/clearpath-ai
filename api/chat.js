export default async function handler(req, res) {
  // Broad CORS — allows all origins including mobile browsers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Parse body — handle both raw and pre-parsed
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch(e) {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }

  const { messages, system } = body || {};

  if (!messages || !system) {
    return res.status(400).json({ error: 'Missing messages or system prompt' });
  }

  // Trim to last 6 messages on server side too as a safety net
  const trimmedMessages = messages.slice(-6);

  if (!process.env.OPENROUTER_API_KEY) {
    console.error('OPENROUTER_API_KEY not set');
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://clearpath-app.netlify.app',
        'X-Title': 'Clearpath AI Coach'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4-5',
        max_tokens: 500,
        messages: [
          { role: 'system', content: system },
          ...trimmedMessages
        ]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('OpenRouter error:', response.status, err);
      return res.status(502).json({ error: 'AI service error', detail: err.slice(0, 200) });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;

    if (!text) {
      console.error('No text in response:', JSON.stringify(data));
      return res.status(502).json({ error: 'Empty response from AI' });
    }

    return res.status(200).json({ text });

  } catch (err) {
    console.error('Handler error:', err.message);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}
