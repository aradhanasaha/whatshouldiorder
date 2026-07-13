// Live Swiggy MCP transport (remote, per-user OAuth).
//
// Two ways to reach the remote server, chosen by SWIGGY_MCP_TRANSPORT:
//
//   "proxy" (default) — spawn `mcp-remote <endpoint>` over stdio. mcp-remote performs the
//     OAuth dance in Node (no browser CORS), caches + refreshes the token under ~/.mcp-auth,
//     and speaks MCP to us. This reuses the exact login the developer already did, so there is
//     NO token to plumb. Ideal for (A) local-live dev. First run opens a browser for consent;
//     afterwards it's silent.
//
//   "direct" — connect StreamableHTTPClientTransport straight to the endpoint with a Bearer
//     token from the auth seam (session.accessToken). Use for (C) per-visitor OAuth in prod,
//     where each request carries the visitor's own token.
//
// Either way callTool() returns the tool result's `structuredContent` (the { addresses } /
// { restaurants } payload the normalizers expect), falling back to parsing the text content.

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

function unwrap(result) {
  if (result && result.structuredContent) return result.structuredContent;
  // Fallback: some tools only return text content — try to parse the first JSON block.
  const text = result?.content?.find?.((c) => c.type === 'text')?.text;
  if (text) {
    try {
      return JSON.parse(text);
    } catch {
      /* not JSON — leave as-is */
    }
  }
  return result || {};
}

async function connect(transport) {
  const client = new Client({ name: 'what-should-i-order', version: '0.3.0' }, { capabilities: {} });
  await client.connect(transport);
  return {
    async callTool(name, args = {}) {
      const result = await client.callTool({ name, arguments: args });
      return unwrap(result);
    },
    async close() {
      try {
        await client.close();
      } catch {
        /* already gone */
      }
    },
  };
}

export async function createHttpMcpTransport({ endpoint, session, env = {} } = {}) {
  const kind = (env.SWIGGY_MCP_TRANSPORT || 'proxy').toLowerCase();

  if (kind === 'direct') {
    if (!session || !session.accessToken) {
      throw new Error(
        'Swiggy MCP direct mode needs an OAuth access token (session.accessToken). ' +
          'Provide SWIGGY_ACCESS_TOKEN, or use SWIGGY_MCP_TRANSPORT=proxy for local dev.'
      );
    }
    const transport = new StreamableHTTPClientTransport(new URL(endpoint), {
      requestInit: { headers: { Authorization: `Bearer ${session.accessToken}` } },
    });
    return connect(transport);
  }

  // proxy (default): reuse mcp-remote's cached OAuth session.
  const command = env.SWIGGY_MCP_PROXY_CMD || (process.platform === 'win32' ? 'npx.cmd' : 'npx');
  const args = (env.SWIGGY_MCP_PROXY_ARGS || `-y mcp-remote ${endpoint}`).split(' ').filter(Boolean);
  const transport = new StdioClientTransport({ command, args, env: process.env });
  return connect(transport);
}
