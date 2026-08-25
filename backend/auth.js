import jwt from 'jsonwebtoken';
import { db } from './db.js';
// In production, a missing JWT_SECRET must NOT silently fall back to a
// hardcoded value — that value is public (it's in this source file on
// GitHub), so anyone could forge admin tokens. Only allow the dev fallback
// outside production.
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error(
    'JWT_SECRET environment variable is required in production. ' +
    'Set it to a long, random value (e.g. `openssl rand -hex 32`).'
  );
}
  

export const JWT_SECRET = process.env.JWT_SECRET || 'lunchradar-dev-secret-change-me';

export function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'You need to be logged in.' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(payload.id);
    if (!user) return res.status(401).json({ error: 'Account not found.' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admins only.' });
    }
    next();
  });
}
