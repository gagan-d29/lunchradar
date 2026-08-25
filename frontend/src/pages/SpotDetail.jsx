import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, CROWD, PRICE_LABEL, VEG_LABEL, fmtAgo, fmtTime } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../App.jsx';
import { StatusPill, CrowdMeter, MetaChips } from '../components/Badges.jsx';

export default function SpotDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ status: 'open', crowd: 'low', wait_minutes: '', note: '' });
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let alive = true;
    api(`/spots/${id}`)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [id, refreshKey]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api(`/spots/${id}/report`, {
        method: 'POST',
        auth: true,
        body: {
          status: form.status,
          crowd: form.status === 'open' ? form.crowd : undefined,
          wait_minutes: form.wait_minutes || undefined,
          note: form.note || undefined,
        },
      });
      toast('Status updated — thanks for helping others! ✌️');
      setForm({ status: 'open', crowd: 'low', wait_minutes: '', note: '' });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (error) return <div className="page"><div className="error-banner">⚠️ {error}</div></div>;
  if (!data) return <div className="page"><div className="spinner" /></div>;

  const { spot, history } = data;

  return (
    <div className="page">
      <Link to="/" className="faint" style={{ fontSize: '0.9rem' }}>← Back to all spots</Link>

      <div className="detail-head" style={{ marginTop: 8 }}>
        <div className="detail-emoji">{spot.emoji}</div>
        <div>
          <h1 style={{ margin: 0 }}>{spot.name}</h1>
          <div className="sub" style={{ margin: '4px 0 0' }}>📍 {spot.area} · {VEG_LABEL[spot.veg]} · {PRICE_LABEL[spot.price]} · 🚶 {spot.walk_minutes} min from campus</div>
        </div>
      </div>

      {spot.description && <p className="muted" style={{ marginTop: -8 }}>{spot.description}</p>}

      <div className="hero-status">
        <div className="big">
          <StatusPill status={spot.status} />
        </div>
        {spot.status.live ? (
          <span className="live-flag">● <span style={{ fontSize: '1.05rem', color: 'var(--green)' }}>LIVE</span> report {fmtAgo(spot.status.updated_at)} by {spot.status.updated_by}</span>
        ) : (
          <span className="faint" style={{ fontSize: '0.9rem' }}>{spot.status.source === 'stale-report' ? '◐ Last report is old — status based on timing.' : '◐ No live report — status based on opening hours.'}</span>
        )}
        <div style={{ marginLeft: 'auto' }}>
          {spot.status.open
            ? <CrowdMeter crowd={spot.status.crowd} live={spot.status.live} />
            : <span className="faint" style={{ fontSize: '0.9rem' }}>Opens {spot.opens_at} · Closes {spot.closes_at}</span>}
        </div>
      </div>

      {spot.status.note && (
        <div className="card" style={{ marginBottom: 18, padding: '13px 18px', fontStyle: 'italic' }}>
          💬 “{spot.status.note}”
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 18 }}>
        {/* Report form */}
        <form className="card" onSubmit={submit}>
          <h2>📢 Is it crowded right now?</h2>
          <p className="sub" style={{ marginBottom: 16, fontSize: '0.9rem' }}>
            {user ? 'Your 5-second update decides who else rushes here. Be honest!'
              : <><Link to="/login" style={{ color: 'var(--primary)' }}>Log in</Link> to report the live status of this spot.</>}
          </p>

          {user && (
            <>
              <div className="field-row" style={{ marginBottom: 14 }}>
                <div className="field" style={{ margin: 0 }}>
                  <label>Status</label>
                  <div className="seg-toggle" style={{ display: 'flex' }}>
                    <button type="button" className={form.status === 'open' ? 'on' : ''} onClick={() => setForm({ ...form, status: 'open' })}>🟢 Open</button>
                    <button type="button" className={form.status === 'closed' ? 'on' : ''} style={{ color: form.status === 'closed' ? 'var(--red)' : undefined, background: form.status === 'closed' ? 'var(--red-soft)' : undefined }} onClick={() => setForm({ ...form, status: 'closed' })}>🔴 Closed / Sold out</button>
                  </div>
                </div>
                {form.status === 'open' && (
                  <div className="field" style={{ margin: 0 }}>
                    <label>Crowd level</label>
                    <div className="seg-toggle" style={{ display: 'flex' }}>
                      {['low', 'medium', 'high'].map((c) => (
                        <button type="button" key={c} className={form.crowd === c ? 'on' : ''} onClick={() => setForm({ ...form, crowd: c })}>{CROWD[c].label}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="field-row" style={{ marginBottom: 14 }}>
                {form.status === 'open' && (
                  <div className="field" style={{ margin: 0 }}>
                    <label>Wait time (minutes)</label>
                    <input type="number" min="0" max="240" placeholder="e.g. 10"
                      value={form.wait_minutes}
                      onChange={(e) => setForm({ ...form, wait_minutes: e.target.value })} />
                  </div>
                )}
                <div className="field" style={{ margin: 0 }}>
                  <label>Quick note (optional)</label>
                  <input placeholder={form.status === 'open' ? 'e.g. fresh meals, 3 tables free…' : 'e.g. thali sold out, kitchen closed…'}
                    value={form.note} maxLength={280}
                    onChange={(e) => setForm({ ...form, note: e.target.value })} />
                </div>
              </div>
              <button className="btn btn-primary btn-block" disabled={saving}>
                {saving ? 'Posting…' : 'Update live status'}
              </button>
            </>
          )}
        </form>

        {/* History */}
        <div className="card">
          <h2>🕓 Latest reports</h2>
          {history.length === 0 ? (
            <p className="faint">No reports yet — be the first to report this spot!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {history.slice(0, 8).map((r) => (
                <div key={r.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '1.05rem' }}>{r.status === 'open' ? '🟢' : '🔴'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.92rem' }}>{r.status === 'open' ? 'Open' : 'Closed'}</strong>
                      {r.status === 'open' && r.crowd && <span className="chip" style={{ color: CROWD[r.crowd].color, background: `${CROWD[r.crowd].color}20` }}>{CROWD[r.crowd].label}</span>}
                      {r.wait_minutes != null && <span className="chip chip-neutral">⏱ ~{r.wait_minutes} min wait</span>}
                      <span className="faint" style={{ fontSize: '0.8rem' }}>{fmtTime(r.created_at)} · {fmtAgo(r.created_at)} · {r.user_name}</span>
                    </div>
                    {r.note && <div className="faint" style={{ fontSize: '0.86rem', marginTop: 3 }}>“{r.note}”</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
