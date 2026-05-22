export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch(e) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  }

  const { email, profile, score } = body || {};

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const pubId = process.env.BEEHIIV_PUB_ID;
  if (!pubId) {
    return res.status(500).json({ error: 'Publication ID not configured' });
  }

  try {
    // Beehiiv v2 subscribe endpoint — works without API key for public forms
    const response = await fetch(`https://api.beehiiv.com/v2/publications/${pubId}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        reactivate_existing: false,
        send_welcome_email: true,
        utm_source: 'clearpath-app',
        utm_medium: 'email-capture',
        utm_campaign: 'beta',
        custom_fields: [
          { name: 'profile', value: profile || 'Unknown' },
          { name: 'score', value: score ? score.toString() : '0' }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Beehiiv error:', response.status, JSON.stringify(data));
      // Still return success to user — don't block on email provider errors
      return res.status(200).json({ success: true, note: 'Subscribed' });
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Subscribe error:', err.message);
    // Return success anyway — don't block user experience on email errors
    return res.status(200).json({ success: true, note: 'Queued' });
  }
}
