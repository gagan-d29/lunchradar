import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { StatusPill, CrowdMeter, MetaChips, StatusFooter } from '../components/Badges.jsx';

const SORTS = [
  { id: 'crowd', label: '🪑 Least crowded' },
  { id: 'walk', label: '🚶 Closest' },
  { id: 'updated', label: '🕒 Recently updated' },
  { id: 'name', label: '🔤 A–Z' },
];

export default function Home() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [price, setPrice] = useState('');
  const [veg, setVeg] = useState('');
  const [maxWalk, setMaxWalk] = useState('');
  const [openOnly, setOpenOnly] = useState(false);
  const [sort, setSort] = useState('crowd');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setError(null);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (cuisine) params.set('cuisine', cuisine);
    if (price) params.set('price', price);
    if (veg) params.set('veg', veg);
    if (maxWalk) params.set('max_walk', maxWalk);
    if (openOnly) params.set('open_only', '1');
    if (sort) params.set('sort', sort);
    api(`/spots?${params.toString()}`)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [q, cuisine, price, veg, maxWalk, openOnly, sort, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="page">
      <h1>What's open for lunch right now? 🍴</h1>
      <p className="sub">Live crowd reports from students near campus — don't walk 15 minutes to a closed counter.</p>

      <div className="controls">
        <div className="controls-row">
          <div className="search-box">
            <span>🔍</span>
            <input
              placeholder="Search spots, areas, cuisines…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {q && <button className="btn btn-ghost btn-sm" onClick={() => setQ('')}>✕</button>}
          </div>
          <div className="seg-toggle">
            {SORTS.map((s) => (
              <button key={s.id} className={sort === s.id ? 'on' : ''} onClick={() => setSort(s.id)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="controls-row">
          <div className="select-wrap">
            <select value={cuisine} onChange={(e) => setCuisine(e.target.value)}>
              <option value="">All cuisines</option>
              {(data?.cuisines || []).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="select-wrap">
            <select value={price} onChange={(e) => setPrice(e.target.value)}>
              <option value="">Any budget</option>
              <option value="1">₹ Budget</option>
              <option value="2">₹₹ Mid</option>
              <option value="3">₹₹₹ Splurge</option>
            </select>
          </div>
          <div className="select-wrap">
            <select value={veg} onChange={(e) => setVeg(e.target.value)}>
              <option value="">Veg / Non-veg</option>
              <option value="veg">Vegetarian</option>
              <option value="nonveg">Non-veg</option>
            </select>
          </div>
          <div className="select-wrap">
            <select value={maxWalk} onChange={(e) => setMaxWalk(e.target.value)}>
              <option value="">Any walk time</option>
              <option value="10">≤ 10 min walk</option>
              <option value="15">≤ 15 min walk</option>
              <option value="20">≤ 20 min walk</option>
              <option value="30">≤ 30 min walk</option>
            </select>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} />
            Open only
          </label>
          <button className="btn btn-sm btn-ghost" onClick={refresh} title="Refresh live status">↻ Refresh</button>
        </div>
      </div>

      {error && <div className="error-banner">⚠️ {error}</div>}

      {!data && !error && <div className="spinner" />}

      {data && (
        <>
          <div className="stat-strip">
            <div className="stat"><span className="num" style={{ color: 'var(--green)' }}>{data.counts.open_now}</span> open now</div>
            <div className="stat"><span className="num" style={{ color: 'var(--primary)' }}>{data.counts.low_crowd}</span> not busy</div>
            <div className="stat"><span className="num">{data.counts.total}</span> match filters</div>
          </div>

          {data.spots.length === 0 ? (
            <div className="empty">
              <span className="big-emoji">🥲</span>
              No spots match these filters. <Link to="/submit" style={{ color: 'var(--primary)' }}>Add one?</Link>
            </div>
          ) : (
            <div className="spot-grid">
              {data.spots.map((s) => (
                <Link key={s.id} to={`/spots/${s.id}`} className="spot-card">
                  <div className="spot-top">
                    <div className="spot-emoji">{s.emoji}</div>
                    <div style={{ minWidth: 0 }}>
                      <div className="spot-title">{s.name}</div>
                      <div className="spot-area">📍 {s.area}</div>
                    </div>
                  </div>
                  <MetaChips spot={s} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <StatusPill status={s.status} />
                    <CrowdMeter crowd={s.status.crowd} live={s.status.live} />
                  </div>
                  {s.status.note && (
                    <div className="faint" style={{ fontSize: '0.84rem', fontStyle: 'italic' }}>
                      “{s.status.note}”
                    </div>
                  )}
                  <StatusFooter status={s.status} />
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
