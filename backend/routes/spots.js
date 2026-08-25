import { Router } from 'express';
import { db, nowUTC, withStatus, toISO, resolveStatus } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

const SPOT_FIELDS = [
  'name', 'emoji', 'description', 'area', 'cuisine',
  'price', 'veg', 'walk_minutes', 'opens_at', 'closes_at',
];

function pickSpot(body, { partial = false } = {}) {
  const out = {};
  const required = ['name', 'area', 'cuisine', 'price', 'veg', 'walk_minutes', 'opens_at', 'closes_at'];
  for (const f of required) {
    if (body[f] === undefined || body[f] === null || body[f] === '') {
      if (!partial) return { error: `Missing field: ${f}` };
    } else {
      out[f] = body[f];
    }
  }
  for (const f of SPOT_FIELDS) {
    if (body[f] !== undefined && body[f] !== '') out[f] = body[f];
  }
  if (out.price !== undefined) out.price = Number(out.price);
  if (![1, 2, 3].includes(out.price)) return { error: 'price must be 1, 2 or 3' };
  if (out.veg !== undefined && !['veg', 'nonveg', 'both'].includes(out.veg)) {
    return { error: 'veg must be veg, nonveg or both' };
  }
  if (out.walk_minutes !== undefined) {
    out.walk_minutes = Number(out.walk_minutes);
    if (!(out.walk_minutes >= 1 && out.walk_minutes <= 180)) {
      return { error: 'walk_minutes must be between 1 and 180' };
    }
  }
  const hm = /^([01]\d|2[0-3]):[0-5]\d$/;
  for (const f of ['opens_at', 'closes_at']) {
    if (out[f] !== undefined && !hm.test(String(out[f]))) return { error: `${f} must be HH:MM (24h)` };
  }
  return { value: out };
}

// ---------------------------------------------------------------------------
// Public: list approved spots with live status + filters
// ---------------------------------------------------------------------------
router.get('/spots', (req, res) => {
  let sql = `SELECT s.*, u.name AS submitted_by_name FROM spots s LEFT JOIN users u ON u.id = s.submitted_by WHERE s.status = 'approved'`;
  const args = [];
  const { q, cuisine, price, veg, open_only, max_walk, sort } = req.query;

  if (q) {
    sql += ` AND (s.name LIKE ? OR s.area LIKE ? OR s.cuisine LIKE ? OR s.description LIKE ?)`;
    const like = `%${String(q).trim()}%`;
    args.push(like, like, like, like);
  }
  if (cuisine) { sql += ` AND s.cuisine = ?`; args.push(String(cuisine)); }
  if (price) { sql += ` AND s.price = ?`; args.push(Number(price)); }
  if (veg === 'veg') sql += ` AND s.veg IN ('veg','both')`;
  if (veg === 'nonveg') sql += ` AND s.veg IN ('nonveg','both')`;
  if (max_walk) { sql += ` AND s.walk_minutes <= ?`; args.push(Number(max_walk)); }

  const rows = db.prepare(sql).all(...args);
  let spots = withStatus(rows);

  if (open_only) spots = spots.filter((s) => s.status.open);

  const sortMap = {
    crowd: (a, b) => rankCrowd(a.status) - rankCrowd(b.status) || a.walk_minutes - b.walk_minutes,
    walk: (a, b) => a.walk_minutes - b.walk_minutes,
    name: (a, b) => a.name.localeCompare(b.name),
    updated: (a, b) => (Date.parse(b.status.updated_at) || 0) - (Date.parse(a.status.updated_at) || 0),
  };
  if (sortMap[sort]) spots.sort(sortMap[sort]);

  const cuisines = db
    .prepare(`SELECT DISTINCT cuisine FROM spots WHERE status='approved' ORDER BY cuisine`)
    .all()
    .map((r) => r.cuisine);

  res.json({
    spots,
    cuisines,
    counts: {
      total: spots.length,
      open_now: spots.filter((s) => s.status.open).length,
      low_crowd: spots.filter((s) => s.status.open && s.status.crowd === 'low').length,
    },
  });
});

function rankCrowd(st) {
  if (!st.open) return 3;      // closed spots last
  if (st.crowd === 'low') return 0;
  if (st.crowd === 'medium') return 1;
  if (st.crowd === 'high') return 2;
  return 1.5;                  // open but no live report
}

// ---------------------------------------------------------------------------
// Public: single spot + status history
// ---------------------------------------------------------------------------
router.get('/spots/:id', (req, res) => {
  const spot = db
    .prepare(`SELECT s.*, u.name AS submitted_by_name FROM spots s LEFT JOIN users u ON u.id = s.submitted_by WHERE s.id = ?`)
    .get(Number(req.params.id));
  if (!spot) return res.status(404).json({ error: 'Spot not found.' });

  const latest = db
    .prepare(
      `SELECT r.*, u.name AS user_name FROM reports r JOIN users u ON u.id = r.user_id
        WHERE r.spot_id = ? ORDER BY r.id DESC LIMIT 1`
    )
    .get(spot.id);

  const history = db
    .prepare(
      `SELECT r.*, u.name AS user_name FROM reports r JOIN users u ON u.id = r.user_id
        WHERE r.spot_id = ? ORDER BY r.id DESC LIMIT 15`
    )
    .all(spot.id)
    .map((r) => ({ ...r, created_at: toISO(r.created_at) }));

  res.json({ spot: { ...spot, status: spot.status === 'approved' ? requireStatus(spot, latest) : null }, history });
});

function requireStatus(spot, latest) {
  // reuse the same resolver as the list endpoint (latest report joined with user name)
  const joined = latest ? { ...latest, user_name: latest.user_name } : null;
  return resolveStatus(spot, joined);
}

// ---------------------------------------------------------------------------
// Auth: students report live status of a spot
// ---------------------------------------------------------------------------
router.post('/spots/:id/report', requireAuth, (req, res) => {
  const spot = db.prepare('SELECT * FROM spots WHERE id = ?').get(Number(req.params.id));
  if (!spot) return res.status(404).json({ error: 'Spot not found.' });
  if (spot.status !== 'approved') return res.status(400).json({ error: 'This spot is not live yet.' });

  const { status: st, crowd, wait_minutes, note } = req.body || {};
  if (!['open', 'closed'].includes(st)) return res.status(400).json({ error: 'status must be "open" or "closed".' });
  let crowdVal = null, waitVal = null;
  if (st === 'open') {
    if (!['low', 'medium', 'high'].includes(crowd)) {
      return res.status(400).json({ error: 'For an open spot, pick the crowd level (low/medium/high).' });
    }
    crowdVal = crowd;
    if (wait_minutes !== undefined && wait_minutes !== null && wait_minutes !== '') {
      waitVal = Number(wait_minutes);
      if (!(waitVal >= 0 && waitVal <= 240)) return res.status(400).json({ error: 'wait_minutes must be 0–240.' });
    }
  }
  const info = db
    .prepare('INSERT INTO reports (spot_id, user_id, status, crowd, wait_minutes, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(spot.id, req.user.id, st, crowdVal, waitVal, String(note || '').slice(0, 280) || null, nowUTC());

  res.status(201).json({
    ok: true,
    report: {
      id: info.lastInsertRowid,
      spot_id: spot.id,
      status: st,
      crowd: crowdVal,
      wait_minutes: waitVal,
      note: String(note || '').slice(0, 280) || null,
      created_at: toISO(nowUTC()),
    },
  });
});

// ---------------------------------------------------------------------------
// Auth: students submit a new spot (goes to pending → admin approval)
// ---------------------------------------------------------------------------
router.post('/spots', requireAuth, (req, res) => {
  const { value, error } = pickSpot(req.body || {});
  if (error) return res.status(400).json({ error });
  const info = db
    .prepare(
      `INSERT INTO spots (name, emoji, description, area, cuisine, price, veg, walk_minutes, opens_at, closes_at, status, submitted_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
    )
    .run(
      String(value.name).trim(),
      String(value.emoji || '🍽️'),
      String(value.description || '').slice(0, 500),
      String(value.area).trim(),
      String(value.cuisine).trim(),
      value.price,
      value.veg,
      value.walk_minutes,
      value.opens_at,
      value.closes_at,
      req.user.id
    );
  res.status(201).json({ ok: true, spot_id: info.lastInsertRowid });
});

// ---------------------------------------------------------------------------
// Auth: my submissions (so students can track approval)
// ---------------------------------------------------------------------------
router.get('/me/submissions', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT id, name, area, status, created_at FROM spots WHERE submitted_by = ? ORDER BY id DESC')
    .all(req.user.id)
    .map((r) => ({ ...r, created_at: toISO(r.created_at) }));
  res.json({ submissions: rows });
});

export default router;
