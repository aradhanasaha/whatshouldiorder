// Per-user Swiggy login via the backend OAuth broker.
// Flow: open <backend>/auth/swiggy/start?return=<app deep link> in a secure web session →
// user logs into Swiggy → backend bounces back to the app with ?token=<our JWT> → store it.
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { deleteItem, getItem, setItem } from './storage';
import { getApiBase, setTokenGetter } from './api';

WebBrowser.maybeCompleteAuthSession();

const TOKEN_KEY = 'wsio_session_token';
let cached; // undefined = unknown, null = none, string = token

export async function getToken() {
  if (cached !== undefined) return cached;
  cached = await getItem(TOKEN_KEY);
  return cached;
}

// Let the API client read the current token without an import cycle.
setTokenGetter(getToken);

async function setToken(token) {
  cached = token || null;
  if (token) await setItem(TOKEN_KEY, token);
  else await deleteItem(TOKEN_KEY);
}

export async function logout() {
  await setToken(null);
}

// Dev helper: inject a session token obtained from a localhost browser OAuth (since only
// localhost is whitelisted while the hosted domain awaits Swiggy approval).
export async function setSessionToken(token) {
  await setToken(String(token).trim());
}

/** Runs the OAuth flow. Returns { ok, error }. On success the session token is stored. */
export async function login() {
  const base = await getApiBase();
  if (!base) return { ok: false, error: 'Backend URL not set' };

  const redirect = Linking.createURL('auth'); // exp://… in Expo Go, whatshouldiorder://auth in a build
  const startUrl = `${base}/auth/swiggy/start?return=${encodeURIComponent(redirect)}`;

  const result = await WebBrowser.openAuthSessionAsync(startUrl, redirect);
  if (result.type !== 'success' || !result.url) {
    return { ok: false, error: result.type === 'cancel' ? 'Login cancelled' : 'Login failed' };
  }

  const token = Linking.parse(result.url).queryParams?.token;
  if (!token) return { ok: false, error: 'No session token returned' };

  await setToken(String(token));
  return { ok: true };
}
