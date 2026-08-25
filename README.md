# 🍛 LunchRadar

**Find a lunch spot before your break ends.**

LunchRadar solves the student lunch-break problem: you have ~45 minutes, and the places you walk to are either **rushed, closed, or sold out**. LunchRadar shows every good spot near campus with its **live status** — open/closed, crowd level, and wait time — reported in real time by students like you.

---

## ✨ Features

### For students
- **Browse spots** with live open/closed + crowd level (🟢 not busy / 🟡 moderate / 🔴 packed) + wait time
- **Search & filters** — keyword, cuisine, budget (₹/₹₹/₹₹₹), veg/non-veg, max walk time, open-only
- **Smart sorting** — “Least crowded” first, closest, recently updated, A–Z
- **Report live status in 5 seconds** — is it open or closed? How crowded? How long is the wait?
- **Add new spots** — any student can submit; an admin reviews before it goes live
- **Track your submissions** — see pending / live / rejected

### For admins
- **Admin dashboard** — approval queue, stats (spots, students, reports in 24h)
- **Approve / reject** student submissions
- **Edit or delete** any spot
- Reports older than 90 minutes automatically fall back to opening hours (status shows "stale"), so the feed stays trustworthy

---

## 🛠 Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite, React Router, plain CSS (dark theme, no UI framework) |
| Backend | Node.js + Express 4 (REST API) |
| Database | SQLite via better-sqlite3 (file-based, zero setup) |
| Auth | JWT (7-day token) + bcrypt password hashing; roles `student` / `admin` |

**Project structure**

```
lunchradar/
├── backend/                  # Express API
│   ├── server.js             # app entry (also serves frontend/dist in prod mode)
│   ├── db.js                 # SQLite schema + live-status resolver
│   ├── auth.js               # JWT sign/verify, requireAuth, requireAdmin
│   ├── seed.js               # seed real Mangaluru eateries + demo accounts
│   ├── routes/
│   │   ├── auth.js           # register / login / me
│   │   ├── spots.js          # public list+detail, reports, submissions
│   │   └── admin.js          # dashboard stats, review, edit, delete
│   └── data/lunchradar.db    # SQLite database (auto-created)
└── frontend/                 # React app (Vite)
    └── src/
        ├── lib/api.js        # tiny API client + helpers
        ├── context/AuthContext.jsx
        ├── components/Badges.jsx   # status pills, crowd meter, chips
        └── pages/            # Home, SpotDetail, Auth, SubmitSpot, MySpots, Admin
```

---

## 🚀 Run it locally

Requires **Node.js 18+**.

### 1. Backend (API + DB)

```bash
cd backend
npm install
npm run seed      # creates lunchradar.db with real spots + demo accounts
npm start         # API on http://localhost:4000
```

### 2. Frontend (dev mode with hot reload)

```bash
cd frontend
npm install
npm run dev       # UI on http://localhost:5173, proxies /api → :4000
```

### Production mode (single port)

```bash
cd frontend && npm run build      # creates frontend/dist
cd ../backend && npm start        # Express serves API + built UI on :4000
```

> Environment variables: `PORT` (backend), `VITE_API_URL` (frontend API base), `JWT_SECRET` (backend — set this in production!).

**Which Node version?** Any recent LTS works (the app prefers **better-sqlite3**, an optional native module with prebuilt binaries). If that module can't be installed on your machine, the app **automatically falls back to Node's built-in SQLite driver** (`node:sqlite`, included in Node 23.4+/24) — no extra installs, nothing to configure. You'll just see a one-line notice in the backend terminal.

**Windows tip:** make sure you run `npm install` *inside* `lunchradar/backend` before `npm start` — a missing install shows up as `ERR_MODULE_NOT_FOUND`.


---

## 🔑 Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@lunchradar.app` | `admin123` |
| Student | `asha@stu.lunchradar.app` | `student123` |
| Student | `rohan@stu.lunchradar.app` | `student123` |
| Student | `meera@stu.lunchradar.app` | `student123` |

Reseed anytime with `node seed.js --force` (wipes and recreates the database).

---

## 🌏 Seed data

16 real, student-recommended eateries in **Mangaluru** (walk times are approximate from the St. Aloysius College area — edit `backend/seed.js` `walk_minutes` to match your campus):

Shetty Lunch Home · Hotel Woodlands · Janata Deluxe · Hotel Taj Mahal · Chutney (Deepa Comforts) · Madhuvan Veg · Udupi Sri Krishna Bhavan · City Canteen · The Cochin Village · Hamburg · Darjeeling Momos · Machli · Guru Purnima Lunch Home · Pabbas · + 2 pending submissions to try out the admin flow.

Two spots are seeded as **pending** (Boon Relish, Kamath Food Express) so you can experience the approval flow immediately.

---

## 🗄 The database (no SQL software needed!)

LunchRadar uses **SQLite** — it is not a database *server*, it's a tiny engine embedded **inside the app itself**. There is nothing to install, nothing to configure, no username/password. The entire database is just **one file**:

```
backend/data/lunchradar.db    ← created automatically by `npm run seed` (or on first boot)
```

It holds 3 tables: `users` (accounts + roles), `spots` (eateries + status), `reports` (live crowd reports). Delete the `.db` file anytime to start fresh — the seed recreates it.

**Want to look inside it?** (optional — the app + admin dashboard already do everything, but it's great for debugging and viva demos)

| Tool | What it is |
|---|---|
| [DB Browser for SQLite](https://sqlitebrowser.org) — *recommended* | Free GUI. Open the `.db` file like Excel: browse tables, run `SELECT` queries, export CSV |
| VS Code extension "SQLite Viewer" | Open the `.db` file right inside VS Code (if you use it) |
| DBeaver Community | Free, heavier — only if you already use it |
| Node one-liner (no install) | `node -e "const {DatabaseSync}=require('node:sqlite');const d=new DatabaseSync('backend/data/lunchradar.db');console.log(d.prepare('SELECT * FROM spots LIMIT 5').all())"` |

> ⚠️ The `.db` file is **excluded from the zip** (it's recreated on first run). Also note: a SQLite file is locked while the backend is running — close the app or stop the server before opening it in a GUI tool.

### Export the data to any database

From `backend/`:

```bash
npm run export        # writes 4 files into the project root:
                      #   lunchradar.db            binary SQLite
                      #   lunchradar.sql           SQLite text dump
                      #   lunchradar-mysql.sql     MySQL / MariaDB dump
                      #   lunchradar-postgres.sql  PostgreSQL dump
```

**Import the MySQL dump** (create an empty database first):

```bash
mysql -u root -p lunchradar < lunchradar-mysql.sql
```

**Import the PostgreSQL dump:**

```bash
createdb lunchradar && psql lunchradar < lunchradar-postgres.sql
```

All dumps contain the same data: schema (CREATE TABLE) + all rows (INSERTs). Run these queries in any of them:

```sql
-- All approved spots, cheapest first
SELECT name, area, cuisine, price, walk_minutes FROM spots WHERE status='approved' ORDER BY price;
-- Crowd history
SELECT status, crowd, COUNT(*) AS reports FROM reports GROUP BY status, crowd;
-- Latest live reports with spot names
SELECT s.name, r.status, r.crowd, r.wait_minutes, r.created_at
FROM reports r JOIN spots s ON s.id = r.spot_id ORDER BY r.id DESC LIMIT 10;
```

---

## 📡 API reference (selected)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/spots` | – | List approved spots w/ live status. Query: `q, cuisine, price, veg, max_walk, open_only, sort(crowd\|walk\|updated\|name)` |
| GET | `/api/spots/:id` | – | Spot + status + last 15 reports |
| POST | `/api/spots/:id/report` | student | Report status: `{status: open\|closed, crowd?, wait_minutes?, note?}` |
| POST | `/api/spots` | student | Submit new spot (→ pending) |
| GET | `/api/me/submissions` | student | My submissions |
| POST | `/api/auth/register` / `login` | – | Returns `{token, user}` |
| GET | `/api/admin/stats` | admin | Dashboard stats |
| GET | `/api/admin/spots?status=all\|pending` | admin | Manage list |
| POST | `/api/admin/spots/:id/review` | admin | `{action: approved\|rejected}` |
| PUT / DELETE | `/api/admin/spots/:id` | admin | Edit / delete |

**How live status works:** the newest report per spot wins for **90 minutes** (`.stale report` flag after). Without a fresh report, the API falls back to the spot's opening hours. Every report is stored for history shown on the spot page.

---

## 🗺 Ideas for v2

- Map view (Leaflet) + real walking directions from campus
- Phone-based queue updates / notifications when a spot opens up
- Report streaks & karma badges for reliable reporters
- Photo uploads, menus, and per-dish recommendations
- Cafeteria vs. off-campus toggle, Friday-special filters
