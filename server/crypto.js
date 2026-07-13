// AES-256-GCM encryption for Swiggy tokens at rest. Key from TOKEN_ENC_KEY (base64 or hex, 32
// bytes). In dev, if unset, a fixed dev key is used (NOT for production).
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

function keyBytes() {
  // Derive a 32-byte key from any secret string (so Render's auto-generated value works).
  // Dev fallback is deterministic and clearly not for prod.
  return createHash('sha256').update(process.env.TOKEN_ENC_KEY || 'wsio-dev-key').digest();
}

export function encrypt(plain) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyBytes(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${enc.toString('base64')}`;
}

export function decrypt(blob) {
  const [ivB, tagB, dataB] = String(blob).split('.');
  const decipher = createDecipheriv('aes-256-gcm', keyBytes(), Buffer.from(ivB, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB, 'base64')), decipher.final()]).toString('utf8');
}
