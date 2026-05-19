import express from 'express';
import { config } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

config({ path: '.env.local' });
config();

const app = express();
const port = process.env.PORT || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, 'dist');

app.use(express.json({ limit: '10mb' }));

app.post('/api/deepseek/chat', async (req, res) => {
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

    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    res.send(await upstream.text());
  } catch (error) {
    res.status(500).json({
      error: {
        message: error?.message || 'DeepSeek request failed',
      },
    });
  }
});

app.use(express.static(distDir));

app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(port, () => {
  console.log(`DianQian demo server running on http://0.0.0.0:${port}`);
});
