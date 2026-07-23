// Hosted backend: Swiggy OAuth broker + per-user API. Each user authorizes their own Swiggy
// account; the app only ever holds our own session JWT. Runs locally (JSON store, localhost
// redirect) and on Render (Postgres, https redirect) with the same code.
import express from 'express';
import { readFileSync } from 'fs';
import { handleAddOrderAgain, handleAddToCart, handleDiscover, handleGetAddresses } from './discoverApi.js';
import { authorizeUrl, exchangeCode, makePkce, refreshTokens } from './oauthClient.js';
import { createUser, getUser, updateTokens } from './db.js';
import { mintSession, verifySession } from './session.js';
import { handleBetaApprove, handleBetaDownload, handleBetaList, handleBetaRequest, landingPage } from './beta.js';

// Minimal .env loader (dev) — no override of existing process.env.
function loadEnvFile(path) {
  try {
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
      if (!m || line.trimStart().startsWith('#')) continue;
      if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch {}
}
loadEnvFile('.env.local');
loadEnvFile('.env');

// This backend is always per-user: live Swiggy over the direct (Bearer-token) transport.
// (Overrides the .env.local proxy/single-session values used by the web dev path.)
process.env.SWIGGY_MCP_MODE = 'live';
process.env.SWIGGY_MCP_TRANSPORT = 'direct';

const PORT = Number(process.env.PORT) || 8787;
// On Render, RENDER_EXTERNAL_URL is set automatically → the OAuth redirect self-configures.
const PUBLIC_URL = (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const REDIRECT_URI = `${PUBLIC_URL}/auth/swiggy/callback`;
const REFRESH_SKEW_MS = 60_000;

const app = express();
app.use(express.json());

// CORS — needed when the Expo app runs on web (browser) during development.
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Short-lived PKCE/state store (single instance is fine for a closed test).
const pending = new Map(); // state -> { verifier, returnUrl, ts }
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of pending) if (now - v.ts > 10 * 60_000) pending.delete(k);
}, 60_000).unref?.();

app.get('/health', (_req, res) => res.json({ ok: true, mode: process.env.SWIGGY_MCP_MODE || 'mock' }));

// ── Beta waitlist / gated APK distribution ──
app.get('/', (_req, res) => res.type('html').send(landingPage()));

app.post('/beta/request', async (req, res) => {
  const r = await handleBetaRequest(req.body || {});
  res.status(r.status).json(r.payload);
});

function requireAdmin(req, res, next) {
  if ((req.headers['x-admin-token'] || '') !== (process.env.ADMIN_TOKEN || '')) {
    return res.status(401).json({ error: 'admin only' });
  }
  next();
}

app.post('/beta/approve', requireAdmin, async (req, res) => {
  const r = await handleBetaApprove(req.body || {}, PUBLIC_URL);
  res.status(r.status).json(r.payload);
});

app.get('/beta/list', requireAdmin, async (_req, res) => {
  const r = await handleBetaList();
  res.status(r.status).json(r.payload);
});

app.get('/beta/download', async (req, res) => {
  const r = await handleBetaDownload(req.query.token);
  if (r.redirect) return res.redirect(r.redirect);
  res.status(r.status).json(r.payload);
});

// 1) Kick off OAuth. `return` = the app's deep link to bounce back to (e.g. whatshouldiorder://auth).
app.get('/auth/swiggy/start', async (req, res) => {
  try {
    const { verifier, challenge } = makePkce();
    const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
    pending.set(state, { verifier, returnUrl: req.query.return || '', ts: Date.now() });
    res.redirect(await authorizeUrl({ redirectUri: REDIRECT_URI, challenge, state }));
  } catch (e) {
    res.status(500).send(`auth start failed: ${e.message}`);
  }
});

// 2) Swiggy redirects here with ?code&state → exchange, store tokens, mint our JWT, bounce to app.
app.get('/auth/swiggy/callback', async (req, res) => {
  const { code, state } = req.query;
  const entry = state && pending.get(state);
  if (!code || !entry) return res.status(400).send('invalid or expired auth state');
  pending.delete(state);

  try {
    const tokens = await exchangeCode({ redirectUri: REDIRECT_URI, code, verifier: entry.verifier });
    const userId = await createUser(tokens);
    const jwt = mintSession(userId);
    if (entry.returnUrl) {
      return res.redirect(`${entry.returnUrl}?token=${encodeURIComponent(jwt)}`);
    }
    // Browser test (no app return): show the token.
    res.type('html').send(`<h3>Connected ✓</h3><p>Session token:</p><code>${jwt}</code>`);
  } catch (e) {
    res.status(500).send(`auth callback failed: ${e.message}`);
  }
});

// Auth middleware — verify our JWT, load + refresh the user's Swiggy token, attach to req.
async function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const userId = token && verifySession(token);
  if (!userId) return res.status(401).json({ error: 'not_authenticated' });

  const user = await getUser(userId);
  if (!user) return res.status(401).json({ error: 'unknown_user' });

  let access = user.accessToken;
  if (user.expiresAt && Date.now() > user.expiresAt - REFRESH_SKEW_MS && user.refreshToken) {
    try {
      const fresh = await refreshTokens({ redirectUri: REDIRECT_URI, refreshToken: user.refreshToken });
      await updateTokens(userId, { ...fresh, refreshToken: fresh.refreshToken || user.refreshToken });
      access = fresh.accessToken;
    } catch {
      return res.status(401).json({ error: 'refresh_failed' });
    }
  }
  req.userId = userId;
  req.swiggyToken = access; // consumed by server/mcp/auth.js getSession
  next();
}

app.post('/api/addresses', requireAuth, async (req, res) => {
  const r = await handleGetAddresses(req.body, process.env, req);
  res.status(r.status).json(r.payload);
});

app.post('/api/discover', requireAuth, async (req, res) => {
  const r = await handleDiscover(req.body, process.env, req);
  res.status(r.status).json(r.payload);
});

app.post('/api/cart/add', requireAuth, async (req, res) => {
  const r = await handleAddToCart(req.body, process.env, req);
  res.status(r.status).json(r.payload);
});

app.post('/api/cart/order-again', requireAuth, async (req, res) => {
  const r = await handleAddOrderAgain(req.body, process.env, req);
  res.status(r.status).json(r.payload);
});

app.listen(PORT, () => {
  console.log(`[wsio] backend on ${PUBLIC_URL} (mode=${process.env.SWIGGY_MCP_MODE}, transport=${process.env.SWIGGY_MCP_TRANSPORT})`);
  console.log(`[wsio] redirect: ${REDIRECT_URI}`);
  console.log(`[wsio] login:    ${PUBLIC_URL}/auth/swiggy/start`);
});
