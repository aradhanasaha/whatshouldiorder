import {
  handleEstimateMacros,
  jsonResponse,
  parseRequestBody,
} from '../server/openaiApi.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    jsonResponse(res, 405, { error: 'Method not allowed.' });
    return;
  }

  const body = await parseRequestBody(req);
  const result = await handleEstimateMacros(body, process.env);
  jsonResponse(res, result.status, result.payload);
}
