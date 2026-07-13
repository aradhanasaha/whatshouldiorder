// Swiggy OAuth broker — OAuth 2.1 public client + PKCE (S256), open dynamic client registration.
// Verified endpoints (see memory: swiggy-mcp-facts). No client secret.
import { createHash, randomBytes } from 'crypto';

const ISSUER = process.env.SWIGGY_AUTH_ISSUER || 'https://mcp.swiggy.com/auth';
const SCOPE = 'mcp:tools';

let metaCache = null;
async function metadata() {
  if (metaCache) return metaCache;
  const res = await fetch('https://mcp.swiggy.com/.well-known/oauth-authorization-server');
  if (!res.ok) throw new Error(`OAuth metadata ${res.status}`);
  metaCache = await res.json();
  return metaCache;
}

// Register (once per redirect URI) → client_id. Cached in-memory per redirect.
const clientCache = new Map();
export async function getClientId(redirectUri) {
  if (clientCache.has(redirectUri)) return clientCache.get(redirectUri);
  const meta = await metadata();
  const res = await fetch(meta.registration_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: 'What Should I Order',
      redirect_uris: [redirectUri],
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      scope: SCOPE,
    }),
  });
  if (!res.ok) throw new Error(`DCR ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const info = await res.json();
  clientCache.set(redirectUri, info.client_id);
  return info.client_id;
}

const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export function makePkce() {
  const verifier = b64url(randomBytes(48));
  const challenge = b64url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

export async function authorizeUrl({ redirectUri, challenge, state }) {
  const meta = await metadata();
  const clientId = await getClientId(redirectUri);
  const p = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    scope: SCOPE,
    state,
  });
  return `${meta.authorization_endpoint}?${p}`;
}

async function tokenRequest(params) {
  const meta = await metadata();
  const res = await fetch(meta.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
  if (!res.ok) throw new Error(`token ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const t = await res.json();
  return {
    accessToken: t.access_token,
    refreshToken: t.refresh_token || null,
    expiresAt: Date.now() + (Number(t.expires_in) || 3600) * 1000,
  };
}

export async function exchangeCode({ redirectUri, code, verifier }) {
  const clientId = await getClientId(redirectUri);
  return tokenRequest({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
    client_id: clientId,
  });
}

export async function refreshTokens({ redirectUri, refreshToken }) {
  const clientId = await getClientId(redirectUri);
  return tokenRequest({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: clientId });
}
