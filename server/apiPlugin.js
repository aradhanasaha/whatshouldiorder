import { loadEnv } from 'vite';
import { handleEstimateMacros, jsonResponse, parseRequestBody } from './openaiApi.js';
import { handleDiscover, handleGetAddresses } from './discoverApi.js';

function registerApiMiddleware(server, env) {
  server.middlewares.use(async (req, res, next) => {
    // Swiggy MCP discovery (rn build).
    if (req.method === 'POST' && req.url === '/api/addresses') {
      const body = await parseRequestBody(req);
      const result = await handleGetAddresses(body, env, req);
      jsonResponse(res, result.status, result.payload);
      return;
    }

    if (req.method === 'POST' && req.url === '/api/discover') {
      const body = await parseRequestBody(req);
      const result = await handleDiscover(body, env, req);
      jsonResponse(res, result.status, result.payload);
      return;
    }

    // Phase 2 (quarantined): macro estimation stays reachable but is not called by the rn flow.
    if (req.method === 'POST' && req.url === '/api/estimate-macros') {
      const body = await parseRequestBody(req);
      const result = await handleEstimateMacros(body, env);
      jsonResponse(res, result.status, result.payload);
      return;
    }

    next();
  });
}

export function apiPlugin() {
  let env = {};

  return {
    name: 'wsio-api-plugin',
    configResolved(config) {
      env = loadEnv(config.mode, process.cwd(), '');
    },
    configureServer(server) {
      registerApiMiddleware(server, env);
    },
    configurePreviewServer(server) {
      registerApiMiddleware(server, env);
    },
  };
}
