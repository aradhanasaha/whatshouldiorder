// App session tokens (our own JWT) — identifies a user to our backend. Distinct from the
// Swiggy tokens, which never leave the server.
import jwt from 'jsonwebtoken';

const SECRET = () => process.env.JWT_SECRET || 'wsio-dev-jwt-secret';
const TTL = '30d';

export function mintSession(userId) {
  return jwt.sign({ uid: userId }, SECRET(), { expiresIn: TTL });
}

export function verifySession(token) {
  try {
    return jwt.verify(token, SECRET()).uid;
  } catch {
    return null;
  }
}
