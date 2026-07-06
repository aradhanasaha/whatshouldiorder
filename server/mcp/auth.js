// Auth / session seam for Swiggy MCP.
//
// This is deliberately the ONLY place that knows how a Swiggy OAuth session is obtained.
// Discovery code (swiggyFood.js / discoverApi.js) just asks for `getSession(env, req)` and
// gets back `{ accessToken } | null`. That indirection is what lets us move from:
//
//   (A) now  — one shared localhost-authorised session (you OAuth your own Swiggy account;
//              token lives in server env SWIGGY_ACCESS_TOKEN). Every request reuses it.
//   (C) later — per-visitor OAuth (once the app is live and the redirect URI is whitelisted).
//              Each request carries the visitor's own token (cookie/session store), and only
//              THIS file changes to read it from `req` instead of env.
//
// In mock mode no real session is needed, so getSession returns a stub token.

export function getSession(env = {}, req = null) {
  const mode = (env.SWIGGY_MCP_MODE || 'mock').toLowerCase();

  if (mode !== 'live') {
    return { accessToken: 'mock-session', mode: 'mock' };
  }

  // proxy transport (default) owns OAuth via mcp-remote's cached session — no token needed here.
  const transport = (env.SWIGGY_MCP_TRANSPORT || 'proxy').toLowerCase();
  if (transport !== 'direct') {
    return { accessToken: null, mode: 'shared-local' };
  }

  // (A/direct) single shared session from a localhost-authorised OAuth login.
  const token = env.SWIGGY_ACCESS_TOKEN || '';
  if (!token) return null;
  return { accessToken: token, mode: 'shared-local' };

  // (C) per-visitor — future: read the visitor's token off `req` (cookie/session store).
  // return readVisitorSession(req);
}
