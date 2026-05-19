import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react(), tailwindcss(), deepSeekProxy(env)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // File watching can be disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});

function deepSeekProxy(env: Record<string, string>) {
  return {
    name: 'deepseek-api-proxy',
    configureServer(server: any) {
      server.middlewares.use('/api/deepseek/chat', async (req: any, res: any) => {
        await handleDeepSeekRequest(req, res, env);
      });
    },
    configurePreviewServer(server: any) {
      server.middlewares.use('/api/deepseek/chat', async (req: any, res: any) => {
        await handleDeepSeekRequest(req, res, env);
      });
    },
  };
}

async function handleDeepSeekRequest(req: any, res: any, env: Record<string, string>) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: { message: 'Method not allowed' } }));
    return;
  }

  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: { message: 'DEEPSEEK_API_KEY is not configured' } }));
    return;
  }

  try {
    const body = await readRequestBody(req);
    const payload = JSON.parse(body || '{}');
    const upstream = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
        ...payload,
      }),
    });

    res.statusCode = upstream.status;
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    res.end(await upstream.text());
  } catch (error: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: { message: error?.message || 'DeepSeek proxy request failed' } }));
  }
}

function readRequestBody(req: any): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
