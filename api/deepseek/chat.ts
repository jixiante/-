export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { message: 'Method not allowed' } });
    return;
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: { message: 'DEEPSEEK_API_KEY is not configured' } });
    return;
  }

  try {
    const upstream = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
        ...req.body,
      }),
    });

    const contentType = upstream.headers.get('content-type') || 'application/json';
    const body = await upstream.text();

    res.status(upstream.status);
    res.setHeader('Content-Type', contentType);
    res.send(body);
  } catch (error: any) {
    res.status(500).json({
      error: {
        message: error?.message || 'DeepSeek request failed',
      },
    });
  }
}
