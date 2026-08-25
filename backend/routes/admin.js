import { Router } from 'express';
import { db, withStatus, toISO, nowUTC } from '../db.js';
import { requireAdmin } from '../auth.js';

const router = Router();
router.use(requireAdmin);

// ---------------------------------------------------------------------------
// Stats for the admin dashboard
// ---------------------------------------------------------------------------
router.get('/stats', (req, res) => {
  const users = db.prepare(`SELECT COUNT(*) c FROM users WHERE role='student'`).get().c;
  const spots = db.prepare(`SELECT COUNT(*) c FROM spots`).get().c;
  const pending = db.prepare(`SELECT COUNT(*) c FROM spots WHERE status='pending'`).get().c;
  const reports24h = db
    .prepare(`SELECT COUNT(*) c FROM reports WHERE created_at >= datetime('now', '-1 day')`)
    .get().c;
  res.json({ users, spots, pending, reports24h });
});

// ---------------------------------------------------------------------------
// List spots (pending or all) with submitter info
// ---------------------------------------------------------------------------
router.get('/spots', (req, res) => {
  const status = req.query.status; // 'pending' | 'all'
  let rows;
  if (status === 'all') {
    rows = db
      .prepare(
        `SELECT s.*, u.name AS submitted_by_name FROM spots s
          LEFT JOIN users u ON u.id = s.submitted_by ORDER BY s.id DESC`
      )
      .all();
  } else {
    rows = db
      .prepare(
        `SELECT s.*, u.name AS submitted_by_name FROM spots s
          LEFT JOIN users u ON u.id = s.submitted_by WHERE s.status='pending' ORDER BY s.id DESC`
      )
      .all();
  }
  const withReportsCount = rows.map((s) => ({
    ...s,
    created_at: toISO(s.created_at),
    reports_count: db.prepare('SELECT COUNT(*) c FROM reports WHERE spot_id=?').get(s.id).c,
  }));
  res.json({ spots: withReportsCount });
});

// ---------------------------------------------------------------------------
// Approve / reject a pending spot
// ---------------------------------------------------------------------------
router.post('/spots/:id/review', (req, res) => {
  const { action } = req.body || {};
  if (!['approved', 'rejected'].includes(action)) {
    return res.status(400).json({ error: 'action must be "approved" or "rejected".' });
  }
  const spot = db.prepare('SELECT * FROM spots WHERE id = ?').get(Number(req.params.id));
  if (!spot) return res.status(404).json({ error: 'Spot not found.' });
  db.prepare('UPDATE spots SET status = ? WHERE id = ?').run(action, spot.id);
  res.json({ ok: true, status: action });
});

// ---------------------------------------------------------------------------
// Edit a spot
// ---------------------------------------------------------------------------
router.put('/spots/:id', (req, res) => {
  const spot = db.prepare('SELECT * FROM spots WHERE id = ?').get(Number(req.params.id));
  if (!spot) return res.status(404).json({ error: 'Spot not found.' });

  const allowed = ['name', 'emoji', 'description', 'area', 'cuisine', 'price', 'veg', 'walk_minutes', 'opens_at', 'closes_at', 'status'];
  const sets = [];
  const args = [];
  for (const k of allowed) {
    if (req.body[k] !== undefined && req.body[k] !== null && req.body[k] !== '') {
      let v = req.body[k];
      if (k === 'price' || k === 'walk_minutes') v = Number(v);
      if (k === 'price' && ![1, 2, 3].includes(v)) return res.status(400).json({ error: 'price must be 1, 2 or 3' });
      if (k === 'veg' && !['veg', 'nonveg', 'both'].includes(v)) return res.status(400).json({ error: 'bad veg value' });
      if (k === 'status' && !['pending', 'approved', 'rejected'].includes(v)) return res.status(400).json({ error: 'bad status value' });
      sets.push(`${k} = ?`);
      args.push(v);
    }
  }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update.' });
  args.push(spot.id);
  db.prepare(`UPDATE spots SET ${sets.join(', ')} WHERE id = ?`).run(...args);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Delete a spot
// ---------------------------------------------------------------------------
router.delete('/spots/:id', (req, res) => {
  const info = db.prepare('DELETE FROM spots WHERE id = ?').run(Number(req.params.id));
  if (!info.changes) return res.status(404).json({ error: 'Spot not found.' });
  res.json({ ok: true });
});

export default router;
