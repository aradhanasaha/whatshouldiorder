// API client — talks to the standalone backend (server/standalone.js) over the tunnel.
// Base URL comes from EXPO_PUBLIC_API_BASE (mobile/.env) or an in-app override in AsyncStorage
// (so you can repoint at a new tunnel without rebuilding). RN fetch has no CORS restrictions.

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'wsio_api_base';
let cachedBase;

export async function getApiBase() {
  if (cachedBase !== undefined) return cachedBase;
  const stored = await AsyncStorage.getItem(KEY);
  cachedBase = (stored || process.env.EXPO_PUBLIC_API_BASE || '').replace(/\/$/, '');
  return cachedBase;
}

export async function setApiBase(url) {
  cachedBase = (url || '').trim().replace(/\/$/, '');
  await AsyncStorage.setItem(KEY, cachedBase);
  return cachedBase;
}

// Set by auth.js to avoid an import cycle (api ← auth ← api).
let tokenGetter = async () => null;
export function setTokenGetter(fn) {
  tokenGetter = fn;
}

async function postJson(path, body) {
  const base = await getApiBase();
  if (!base) return { ok: false, status: 0, data: { error: 'No backend URL set' } };
  try {
    const token = await tokenGetter();
    const res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body || {}),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: { error: e?.message || 'network error' } };
  }
}

export async function fetchAddresses() {
  const { ok, status, data } = await postJson('/api/addresses', {});
  return { ok, status, addresses: data.addresses || [], error: data.error || null, mode: data.mode };
}

export async function discover({ addressId, cuisine, budget, veg }) {
  const { ok, status, data } = await postJson('/api/discover', { addressId, cuisine, budget, veg });
  return {
    ok,
    status,
    dishes: data.dishes || [],
    orderAgain: data.orderAgain || [],
    error: data.error || null,
    mode: data.mode,
  };
}
