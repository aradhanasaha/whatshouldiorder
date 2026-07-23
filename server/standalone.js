// Standalone backend process for the native app. Reuses the exact same handlers the Vite
// middleware uses — this just runs them on a plain Node http server so the API can be started
// (and tunneled) without booting the web frontend.
//
//   SWIGGY_MCP_MODE=live SWIGGY_MCP_TRANSPORT=proxy node server/standalone.js
//   ngrok http 8787   (or: cloudflared tunnel --url http://localhost:8787)
//
// React Native's fetch is not subject to CORS, so no CORS headers are required — but we send a
// permissive set anyway so the same server also works from a browser during testing.

import { createServer } from 'http';
import { readFileSync } from 'fs';
import { jsonResponse, parseRequestBody } from './openaiApi.js';
import { handleAddOrderAgain, handleAddToCart, handleDiscover, handleGetAddresses } from './discoverApi.js';

// Minimal .env loader (no dependency) — populates process.env without overriding existing vars.
function loadEnvFile(path) {
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return;
  }
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!m || line.trimStart().startsWith('#')) continue;
    const key = m[1];
    let val = m[2].trim().replace(/^["']|["']$/g, '');
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

const PORT = Number(process.env.PORT) || 8787;

const ROUTES = {
  '/api/addresses': handleGetAddresses,
  '/api/discover': handleDiscover,
  '/api/cart/add': handleAddToCart,
  '/api/cart/order-again': handleAddOrderAgain,
};

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const path = (req.url || '').split('?')[0];
  const handler = ROUTES[path];

  if (req.method === 'POST' && handler) {
    try {
      const body = await parseRequestBody(req);
      const result = await handler(body, process.env, req);
      jsonResponse(res, result.status, result.payload);
    } catch (error) {
      jsonResponse(res, 500, { error: error?.message || 'server error' });
    }
    return;
  }

  if (req.method === 'GET' && path === '/health') {
    jsonResponse(res, 200, { ok: true, mode: process.env.SWIGGY_MCP_MODE || 'mock' });
    return;
  }

  jsonResponse(res, 404, { error: 'not found' });
});

server.listen(PORT, () => {
  console.log(`[wsio] api on http://localhost:${PORT}  (mode=${process.env.SWIGGY_MCP_MODE || 'mock'}, transport=${process.env.SWIGGY_MCP_TRANSPORT || 'proxy'})`);
  console.log(`[wsio] tunnel it:  ngrok http ${PORT}`);
});
