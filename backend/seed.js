// Seed LunchRadar with real Mangaluru student-favourite eateries + demo accounts.
//
//   CLI usage:     node seed.js              (seed only if DB is empty)
//                  node seed.js --force      (wipe + reseed)
//   Programmatic:  import { runSeed } from './seed.js'; runSeed({ force: true });
//
// Cloud hosts call this automatically from server.js when the DB is empty.
//
// The admin password is never hardcoded in source. Set ADMIN_PASSWORD to
// choose one, or omit it and a random password is generated and printed
// once — copy it somewhere safe, it isn't stored anywhere else.
import crypto from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import bcrypt from 'bcryptjs';
import { db } from './db.js';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url');
const STUDENT_PASSWORD = 'student123'; // dev/demo only — do not use in production

export function runSeed({ force = false } = {}) {
  if (force) {
    console.log('--force: wiping existing data…');
    db.exec('DELETE FROM reports; DELETE FROM spots; DELETE FROM users;');
    db.exec("DELETE FROM sqlite_sequence WHERE name IN ('reports','spots','users');");
  }

  const userCount = db.prepare('SELECT COUNT(*) c FROM users').get().c;
  const spotCount = db.prepare('SELECT COUNT(*) c FROM spots').get().c;
  if (userCount > 0 || spotCount > 0) {
    console.log('Database already has data — skipping seed. Use `node seed.js --force` to reseed.');
    return false;
  }

  // -------------------------------------------------------------------------
  // Users
  // -------------------------------------------------------------------------
  const hash = (pw) => bcrypt.hashSync(pw, 10);
  const insertUser = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)');

  const adminId = insertUser.run('Admin', 'admin@lunchradar.app', hash(ADMIN_PASSWORD), 'admin').lastInsertRowid;
  const ashaId = insertUser.run('Asha Shetty', 'asha@stu.lunchradar.app', hash(STUDENT_PASSWORD), 'student').lastInsertRowid;
  const rohanId = insertUser.run("Rohan D'Souza", 'rohan@stu.lunchradar.app', hash(STUDENT_PASSWORD), 'student').lastInsertRowid;
  const meeraId = insertUser.run('Meera Nair', 'meera@stu.lunchradar.app', hash(STUDENT_PASSWORD), 'student').lastInsertRowid;

  // -------------------------------------------------------------------------
  // Spots — real, student-recommended eateries in Mangaluru
  // (walk_minutes ≈ walk from the St. Aloysius College area — edit to fit your campus)
  // -------------------------------------------------------------------------
  const insertSpot = db.prepare(`
    INSERT INTO spots (name, emoji, description, area, cuisine, price, veg, walk_minutes, opens_at, closes_at, status, submitted_by)
    VALUES (@name, @emoji, @description, @area, @cuisine, @price, @veg, @walk_minutes, @opens_at, @closes_at, @status, @submitted_by)
  `);

  const spots = [
    {
      name: 'Shetty Lunch Home', emoji: '🐟', area: 'Hampankatta', cuisine: 'Seafood', price: 2, veg: 'both', walk_minutes: 15, opens_at: '11:30', closes_at: '15:30', status: 'approved', submitted_by: rohanId,
      description: 'Legendary kudla-style fish meals, neer dosa with ghee roast. Superb food — but expect a huge rush between 1 and 2 pm.'
    },
    {
      name: 'Hotel Woodlands', emoji: '🥞', area: 'K.S. Rao Road', cuisine: 'South Indian', price: 1, veg: 'veg', walk_minutes: 12, opens_at: '07:30', closes_at: '15:30', status: 'approved', submitted_by: ashaId,
      description: 'Old-school favourite — rava dosa, halwa and value-for-money veg meals. Fast service for short breaks.'
    },
    {
      name: 'Janata Deluxe', emoji: '🫓', area: 'Pathemudi', cuisine: 'South Indian', price: 1, veg: 'veg', walk_minutes: 16, opens_at: '08:00', closes_at: '15:00', status: 'approved', submitted_by: meeraId,
      description: 'Famous for buns and kadubu. Cheap, quick, and right next to the town bus stand.'
    },
    {
      name: 'Hotel Taj Mahal', emoji: '🫔', area: 'K.S. Rao Road', cuisine: 'North Indian', price: 2, veg: 'veg', walk_minutes: 12, opens_at: '11:00', closes_at: '16:00', status: 'approved', submitted_by: rohanId,
      description: 'Tandoori rotis, paneer curries and thalis. Reliable AC seating when you want a sit-down lunch.'
    },
    {
      name: 'Chutney (Deepa Comforts)', emoji: '🥗', area: 'PVS Junction', cuisine: 'South Indian', price: 1, veg: 'veg', walk_minutes: 15, opens_at: '10:30', closes_at: '15:30', status: 'approved', submitted_by: ashaId,
      description: 'Famous for chutney varieties and mini thalis. Super quick service — great for a 30-minute break.'
    },
    {
      name: 'Madhuvan Veg', emoji: '🍛', area: 'Bunts Hostel Road', cuisine: 'South Indian', price: 1, veg: 'veg', walk_minutes: 15, opens_at: '11:00', closes_at: '15:30', status: 'approved', submitted_by: meeraId,
      description: 'No-frills unlimited meals at pocket-friendly prices. Simple, homely and fast.'
    },
    {
      name: 'Udupi Sri Krishna Bhavan', emoji: '🍚', area: 'GHS Road', cuisine: 'Udupi', price: 1, veg: 'veg', walk_minutes: 13, opens_at: '07:00', closes_at: '15:00', status: 'approved', submitted_by: ashaId,
      description: 'Classic Udupi thali and snacks. Closes sharp after lunch — the thali often sells out by 12:45.'
    },
    {
      name: 'City Canteen', emoji: '🍵', area: 'Bejai', cuisine: 'Udupi', price: 1, veg: 'veg', walk_minutes: 30, opens_at: '08:00', closes_at: '15:00', status: 'approved', submitted_by: rohanId,
      description: 'Student-favourite budget canteen. Massive crowds at 1 pm — go early or go quiet.'
    },
    {
      name: 'The Cochin Village', emoji: '🥥', area: 'Valencia', cuisine: 'Kerala', price: 2, veg: 'both', walk_minutes: 18, opens_at: '11:30', closes_at: '15:30', status: 'approved', submitted_by: meeraId,
      description: 'Pocket-friendly Kerala meals with generous fish curry portions. A bit farther but worth it.'
    },
    {
      name: 'Hamburg', emoji: '🍔', area: 'Bendoorwell', cuisine: 'Fast Food', price: 1, veg: 'nonveg', walk_minutes: 17, opens_at: '11:00', closes_at: '21:00', status: 'approved', submitted_by: rohanId,
      description: 'Juicy burgers, fries and shakes at student prices. Open through the afternoon too.'
    },
    {
      name: 'Darjeeling Momos', emoji: '🥟', area: 'Lalbagh', cuisine: 'Street Food', price: 1, veg: 'both', walk_minutes: 12, opens_at: '12:00', closes_at: '20:00', status: 'approved', submitted_by: meeraId,
      description: 'Steaming momos with fiery chutney by the roadside. Quick, cheap, and often has a queue.'
    },
    {
      name: 'Machli', emoji: '🐟', area: 'Hampankatta', cuisine: 'Seafood', price: 2, veg: 'nonveg', walk_minutes: 15, opens_at: '11:30', closes_at: '15:00', status: 'approved', submitted_by: rohanId,
      description: 'Prawn ghee roast and bangda fry — great value fish meals. Basic seating, fantastic food.'
    },
    {
      name: 'Guru Purnima Lunch Home', emoji: '🍱', area: 'Dongerkery', cuisine: 'South Indian', price: 1, veg: 'veg', walk_minutes: 14, opens_at: '11:30', closes_at: '15:00', status: 'approved', submitted_by: ashaId,
      description: 'Simple, homely veg lunch home. Sells out most days by 1:30 — check the live status first!'
    },
    {
      name: 'Pabbas', emoji: '🍨', area: 'Hampankatta', cuisine: 'Dessert', price: 1, veg: 'veg', walk_minutes: 15, opens_at: '10:00', closes_at: '21:30', status: 'approved', submitted_by: meeraId,
      description: 'The iconic gudbud and ice-cream spot — the perfect way to end any lunch.'
    },
    {
      name: 'Boon Relish', emoji: '🥤', area: 'PVS Junction', cuisine: 'Café', price: 2, veg: 'veg', walk_minutes: 15, opens_at: '10:00', closes_at: '20:00', status: 'pending', submitted_by: ashaId,
      description: 'New fast-casual café — sandwiches, juices and shakes. Heard it is student-friendly.'
    },
    {
      name: 'Kamath Food Express', emoji: '🍱', area: 'Hampankatta', cuisine: 'South Indian', price: 1, veg: 'veg', walk_minutes: 15, opens_at: '11:00', closes_at: '15:30', status: 'pending', submitted_by: rohanId,
      description: 'Express counter meals for a quick lunch between classes.'
    },
  ];

  const insertedIds = {};
  for (const s of spots) {
    insertedIds[s.name] = insertSpot.run(s).lastInsertRowid;
  }

  // -------------------------------------------------------------------------
  // Live reports (recent, so the demo shows real value immediately)
  // -------------------------------------------------------------------------
  const insertReport = db.prepare(`
    INSERT INTO reports (spot_id, user_id, status, crowd, wait_minutes, note, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const ago = (mins) => new Date(Date.now() - mins * 60_000).toISOString().replace('T', ' ').slice(0, 19);

  const reports = [
    ['Shetty Lunch Home', rohanId, 'open', 'high', 25, 'Queue out the door — 20+ people already.', 8],
    ['Hotel Woodlands', ashaId, 'open', 'low', 0, 'Empty tables right now and meals are fresh. Go!', 5],
    ['Hotel Taj Mahal', meeraId, 'closed', null, null, 'Kitchen closed early today for lunch prep.', 12],
    ['Chutney (Deepa Comforts)', ashaId, 'open', 'medium', 10, 'Moving fast, about 10 minutes to a table.', 6],
    ['Udupi Sri Krishna Bhavan', meeraId, 'closed', null, null, 'Thali sold out by 12:45. Sad day.', 15],
    ['The Cochin Village', rohanId, 'open', 'low', 5, 'Quiet today, fish curry is on point.', 200],
    ['Darjeeling Momos', meeraId, 'open', 'high', 15, 'Long line but they roll fast.', 4],
    ['Guru Purnima Lunch Home', ashaId, 'closed', null, null, 'SOLD OUT. Dont bother coming.', 3],
    ['Machli', rohanId, 'open', 'medium', 10, 'Prawn ghee roast available, 3 tables free.', 40],
  ];

  for (const [name, uid, status, crowd, wait, note, mins] of reports) {
    insertReport.run(insertedIds[name], uid, status, crowd, wait, note, ago(mins));
  }

  console.log('✅ Seeded LunchRadar:');
  console.log(`   • ${spots.length} spots (${spots.filter(s => s.status === 'approved').length} approved, 2 pending)`);
  console.log('   • 3 students + 1 admin');
  console.log(`   • ${reports.length} live crowd reports`);
  console.log('');
  console.log('   Demo logins:');
  console.log(`   admin   → admin@lunchradar.app / ${ADMIN_PASSWORD}  (save this — it is not stored anywhere)`);
  console.log(`   student → asha@stu.lunchradar.app / ${STUDENT_PASSWORD}  (dev/demo only — do not use in production)`);
  return true;
}

// When run directly as `node seed.js`, execute the seed.
const isCLI =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isCLI) {
  runSeed({ force: process.argv.includes('--force') });
}