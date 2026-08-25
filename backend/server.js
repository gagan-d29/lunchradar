import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, currentHHMM, nowUTC } from './db.js';
import authRoutes from './routes/auth.js';
import spotRoutes from './routes/spots.js';
import adminRoutes from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4000;

// Comma-separated list of allowed frontend origins, e.g.
//   ALLOWED_ORIGINS=https://lunchradar.app,https://www.lunchradar.app
// Falls back to allowing any origin in dev so `npm run dev` keeps working.
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : true;

const app = express();
app.set('trust proxy', 1); // needed for correct req.ip behind a reverse proxy/load balancer
app.use(helmet());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '100kb' })); // guards against oversized-payload DoS

// Auth endpoints get their own stricter limiter — these are the ones worth
// brute-forcing (login) or spamming (register), so they're capped tighter
// than general API traffic.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' },
});

// A lighter limiter for everything else, mainly to blunt scraping/DoS.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: nowUTC(), local_time: currentHHMM(), uptime: process.uptime() });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api', apiLimiter, spotRoutes);
app.use('/api/admin', apiLimiter, adminRoutes);
// 404 + error handling
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🍛 LunchRadar API listening on http://0.0.0.0:${PORT}`);
});
