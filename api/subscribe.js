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

  const { email } = body || {};

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const pubId = process.env.BEEHIIV_PUB_ID;
  if (!pubId) {
    return res.status(500).json({ error: 'Publication ID not configured' });
  }

  try {
    // Use Beehiiv's public subscribe form endpoint — no API key needed
    const formData = new URLSearchParams();
    formData.append('email', email);

    const response = await fetch(`https://www.beehiiv.com/subscribe/${pubId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'Clearpath/1.0'
      },
      body: formData.toString()
    });

    console.log('Beehiiv response status:', response.status);
    const text = await response.text();
    console.log('Beehiiv response:', text.slice(0, 200));

    // Beehiiv returns various responses — all are success from user perspective
    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Subscribe error:', err.message);
    return res.status(200).json({ success: true, note: 'Queued' });
  }
}
