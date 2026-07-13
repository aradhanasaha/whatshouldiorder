// Token store. Postgres when DATABASE_URL is set (Render); a local JSON file otherwise (dev).
// Stores per-user Swiggy tokens, encrypted at rest via crypto.js.
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { encrypt, decrypt } from './crypto.js';

const DATABASE_URL = process.env.DATABASE_URL;

// ── Postgres impl ──────────────────────────────────────────────────────────
let pgPool = null;
async function pg() {
  if (!pgPool) {
    const { default: PG } = await import('pg');
    pgPool = new PG.Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        access_enc TEXT NOT NULL,
        refresh_enc TEXT,
        expires_at BIGINT,
        created_at TIMESTAMPTZ DEFAULT now()
      )`);
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS beta_testers (
        email TEXT PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'pending',
        token TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      )`);
  }
  return pgPool;
}

// ── JSON-file impl ─────────────────────────────────────────────────────────
const FILE = 'server/.data/store.json';
function readFile() {
  try {
    return JSON.parse(readFileSync(FILE, 'utf8'));
  } catch {
    return { users: {} };
  }
}
function writeFile(data) {
  mkdirSync(dirname(FILE), { recursive: true });
  writeFileSync(FILE, JSON.stringify(data, null, 2));
}

// ── Public API ─────────────────────────────────────────────────────────────
export async function createUser({ accessToken, refreshToken, expiresAt }) {
  const id = randomUUID();
  const access_enc = encrypt(accessToken);
  const refresh_enc = refreshToken ? encrypt(refreshToken) : null;

  if (DATABASE_URL) {
    const p = await pg();
    await p.query('INSERT INTO users (id, access_enc, refresh_enc, expires_at) VALUES ($1,$2,$3,$4)', [
      id, access_enc, refresh_enc, expiresAt,
    ]);
  } else {
    const data = readFile();
    data.users[id] = { access_enc, refresh_enc, expires_at: expiresAt, created_at: Date.now() };
    writeFile(data);
  }
  return id;
}

export async function getUser(id) {
  let row;
  if (DATABASE_URL) {
    const p = await pg();
    row = (await p.query('SELECT * FROM users WHERE id=$1', [id])).rows[0];
  } else {
    row = readFile().users[id];
  }
  if (!row) return null;
  return {
    id,
    accessToken: decrypt(row.access_enc),
    refreshToken: row.refresh_enc ? decrypt(row.refresh_enc) : null,
    expiresAt: Number(row.expires_at) || 0,
  };
}

// ── Beta tester waitlist ─────────────────────────────────────────────────────
export async function betaRequest(email) {
  const e = String(email).trim().toLowerCase();
  if (DATABASE_URL) {
    const p = await pg();
    await p.query(
      `INSERT INTO beta_testers (email, status) VALUES ($1,'pending') ON CONFLICT (email) DO NOTHING`,
      [e]
    );
  } else {
    const data = readFile();
    data.beta = data.beta || {};
    if (!data.beta[e]) data.beta[e] = { status: 'pending', token: null, created_at: Date.now() };
    writeFile(data);
  }
  return e;
}

export async function betaApprove(email, token) {
  const e = String(email).trim().toLowerCase();
  if (DATABASE_URL) {
    const p = await pg();
    await p.query(`UPDATE beta_testers SET status='approved', token=$2 WHERE email=$1`, [e, token]);
  } else {
    const data = readFile();
    data.beta = data.beta || {};
    data.beta[e] = { ...(data.beta[e] || { created_at: Date.now() }), status: 'approved', token };
    writeFile(data);
  }
}

export async function betaByToken(token) {
  if (DATABASE_URL) {
    const p = await pg();
    const row = (await p.query(`SELECT * FROM beta_testers WHERE token=$1 AND status='approved'`, [token])).rows[0];
    return row || null;
  }
  const beta = readFile().beta || {};
  const email = Object.keys(beta).find((k) => beta[k].token === token && beta[k].status === 'approved');
  return email ? { email, ...beta[email] } : null;
}

export async function betaList() {
  if (DATABASE_URL) {
    const p = await pg();
    return (await p.query(`SELECT email, status, created_at FROM beta_testers ORDER BY created_at DESC`)).rows;
  }
  const beta = readFile().beta || {};
  return Object.entries(beta).map(([email, v]) => ({ email, status: v.status, created_at: v.created_at }));
}

export async function updateTokens(id, { accessToken, refreshToken, expiresAt }) {
  const access_enc = encrypt(accessToken);
  const refresh_enc = refreshToken ? encrypt(refreshToken) : null;
  if (DATABASE_URL) {
    const p = await pg();
    await p.query('UPDATE users SET access_enc=$2, refresh_enc=$3, expires_at=$4 WHERE id=$1', [
      id, access_enc, refresh_enc, expiresAt,
    ]);
  } else {
    const data = readFile();
    if (data.users[id]) {
      data.users[id] = { ...data.users[id], access_enc, refresh_enc, expires_at: expiresAt };
      writeFile(data);
    }
  }
}
