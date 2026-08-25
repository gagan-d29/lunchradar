import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, currentHHMM, nowUTC } from './db.js';
import authRoutes from './routes/auth.js';
import spotRoutes from './routes/spots.js';
import adminRoutes from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: nowUTC(), local_time: currentHHMM(), uptime: process.uptime() });
});

app.use('/api/auth', authRoutes);
app.use('/api', spotRoutes);
app.use('/api/admin', adminRoutes);

// Optionally serve the built frontend (production mode):
//   cd frontend && npm run build   →   backend serves it on :4000
const dist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

// 404 + error handling
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🍛 LunchRadar API listening on http://0.0.0.0:${PORT}`);
});
