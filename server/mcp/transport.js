// MCP transport seam.
//
// The rest of the app only ever talks to an object shaped like `McpTransport`:
//
//   { callTool(name, args) -> Promise<any>, close() -> Promise<void> }
//
// Today we ship two implementations behind this seam:
//   - MockTransport  (server/mcp/mockTransport.js) — canned responses matching the
//     documented Swiggy Food schema, so the whole app runs end-to-end with no OAuth.
//   - HttpMcpTransport (server/mcp/httpTransport.js) — the real remote Swiggy MCP over
//     Streamable HTTP + OAuth. Stubbed until a live session is wired in.
//
// Swapping mock <-> live is a single env var: SWIGGY_MCP_MODE = "mock" | "live".
// The auth/session concern lives separately in server/mcp/auth.js so that going from
// the (A) single localhost OAuth session to (C) per-visitor OAuth never touches this file.

import { createMockTransport } from './mockTransport.js';
import { createHttpMcpTransport } from './httpTransport.js';

export const SWIGGY_FOOD_ENDPOINT = 'https://mcp.swiggy.com/food';

/**
 * Open one MCP transport for a single discovery request.
 * Callers must `close()` when done (one session per /api/discover invocation).
 *
 * @param {object} env      process env (SWIGGY_MCP_MODE, tokens, ...)
 * @param {object} session  auth session from getSession() in auth.js
 * @returns {Promise<{callTool: (name: string, args: object) => Promise<any>, close: () => Promise<void>}>}
 */
export async function openTransport(env = {}, session = null) {
  const mode = (env.SWIGGY_MCP_MODE || 'mock').toLowerCase();

  if (mode === 'live') {
    return createHttpMcpTransport({
      endpoint: env.SWIGGY_MCP_FOOD_ENDPOINT || SWIGGY_FOOD_ENDPOINT,
      session,
      env,
    });
  }

  return createMockTransport();
}
