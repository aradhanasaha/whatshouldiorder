import { loadEnv } from 'vite';
import {
  handleEstimateMacros,
  handleRestaurantFallback,
  jsonResponse,
  parseRequestBody,
} from './openaiApi.js';

function registerApiMiddleware(server, env) {
  server.middlewares.use(async (req, res, next) => {
    if (req.method === 'POST' && req.url === '/api/estimate-macros') {
      const body = await parseRequestBody(req);
      const result = await handleEstimateMacros(body, env);
      jsonResponse(res, result.status, result.payload);
      return;
    }

    if (req.method === 'POST' && req.url === '/api/restaurant-web-fallback') {
      const body = await parseRequestBody(req);
      const result = await handleRestaurantFallback(body, env);
      jsonResponse(res, result.status, result.payload);
      return;
    }

    next();
  });
}

export function openaiApiPlugin() {
  let env = {};

  return {
    name: 'openai-api-plugin',
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
