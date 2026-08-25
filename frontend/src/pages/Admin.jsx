import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api, fmtAgo, PRICE_LABEL, VEG_LABEL } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../App.jsx';

const STATUS_CHIP = {
  pending: ['chip-pending', '⏳ Pending'],
  approved: ['chip-open', '✅ Live'],
  rejected: ['chip-rejected', '❌ Rejected'],
};

function EditModal({ spot, cuisines, onClose, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: spot.name, emoji: spot.emoji, description: spot.description, area: spot.area,
    cuisine: spot.cuisine, price: String(spot.price), veg: spot.veg,
    walk_minutes: String(spot.walk_minutes), opens_at: spot.opens_at, closes_at: spot.closes_at,
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/admin/spots/${spot.id}`, {
        method: 'PUT', auth: true,
        body: { ...form, price: Number(form.price), walk_minutes: Number(form.walk_minutes) },
      });
      toast('Spot updated ✔');
      onSaved();
    } catch (err) {
      toast(err.message, 'error');
    } finally { setBusy(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Edit “{spot.name}”</h2>
        <form onSubmit={save}>
          <div className="field"><label>Name</label><input value={form.name} onChange={(e) => set('name', e.target.value)} required /></div>
          <div className="field-row">
            <div className="field"><label>Emoji</label><input value={form.emoji} onChange={(e) => set('emoji', e.target.value)} maxLength={4} /></div>
            <div className="field"><label>Area</label><input value={form.area} onChange={(e) => set('area', e.target.value)} required /></div>
          </div>
          <div className="field"><label>Description</label><textarea value={form.description} onChange={(e) => set('description', e.target.value)} maxLength={500} /></div>
          <div className="field-row-3">
            <div className="field"><label>Cuisine</label><input value={form.cuisine} onChange={(e) => set('cuisine', e.target.value)} required /></div>
            <div className="field"><label>Budget</label>
              <select value={form.price} onChange={(e) => set('price', e.target.value)}>
                <option value="1">₹</option><option value="2">₹₹</option><option value="3">₹₹₹</option>
              </select>
            </div>
            <div className="field"><label>Type</label>
              <select value={form.veg} onChange={(e) => set('veg', e.target.value)}>
                <option value="veg">Veg</option><option value="nonveg">Non-veg</option><option value="both">Both</option>
              </select>
            </div>
          </div>
          <div className="field-row-3">
            <div className="field"><label>Walk (min)</label><input type="number" min="1" max="180" value={form.walk_minutes} onChange={(e) => set('walk_minutes', e.target.value)} /></div>
            <div className="field"><label>Opens</label><input type="time" value={form.opens_at} onChange={(e) => set('opens_at', e.target.value)} /></div>
            <div className="field"><label>Closes</label><input type="time" value={form.closes_at} onChange={(e) => set('closes_at', e.target.value)} /></div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Admin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState(null);
  const [all, setAll] = useState(null);
  const [tab, setTab] = useState('pending');
  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    api('/admin/stats', { auth: true }).then(setStats).catch(() => {});
    api('/admin/spots', { auth: true }).then((d) => setPending(d.spots)).catch(() => {});
    api('/admin/spots?status=all', { auth: true }).then((d) => setAll(d.spots)).catch(() => {});
  }, []);

  useEffect(() => { if (user?.role === 'admin') load(); }, [user, load]);

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') {
    return <div className="page"><div className="error-banner">🙅 This page is for admins only.</div></div>;
  }
  if (!stats) return <div className="page"><div className="spinner" /></div>;

  const review = async (id, action) => {
    setBusyId(id);
    try {
      await api(`/admin/spots/${id}/review`, { method: 'POST', auth: true, body: { action } });
      toast(action === 'approved' ? 'Spot approved — it is now live! 🎉' : 'Spot rejected.');
      load();
    } catch (err) { toast(err.message, 'error'); } finally { setBusyId(null); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this spot and all its reports? This cannot be undone.')) return;
    setBusyId(id);
    try {
      await api(`/admin/spots/${id}`, { method: 'DELETE', auth: true });
      toast('Spot deleted.');
      load();
    } catch (err) { toast(err.message, 'error'); } finally { setBusyId(null); }
  };

  const rows = tab === 'pending' ? (pending || []) : (all || []);

  return (
    <div className="page">
      <h1>Admin dashboard 🛠️</h1>
      <p className="sub">Approve submissions, keep spot details accurate, and remove anything dodgy.</p>

      <div className="stat-strip">
        <div className="stat"><span className="num" style={{ color: 'var(--yellow)' }}>{stats.pending}</span> awaiting review</div>
        <div className="stat"><span className="num" style={{ color: 'var(--green)' }}>{stats.spots}</span> total spots</div>
        <div className="stat"><span className="num">{stats.reports24h}</span> reports (24h)</div>
        <div className="stat"><span className="num">{stats.users}</span> students</div>
      </div>

      <div className="seg-toggle" style={{ marginBottom: 16 }}>
        <button className={tab === 'pending' ? 'on' : ''} onClick={() => setTab('pending')}>
          Pending ({pending?.length ?? 0})
        </button>
        <button className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}>All spots</button>
      </div>

      <div className="card table-wrap" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Spot</th><th>Details</th><th>Submitted</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-faint)', padding: 30 }}>
                {tab === 'pending' ? '✨ Nothing pending — all caught up!' : 'No spots yet.'}
              </td></tr>
            )}
            {rows.map((s) => {
              const [cls, label] = STATUS_CHIP[s.status] || STATUS_CHIP.pending;
              return (
                <tr key={s.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 22 }}>{s.emoji}</span>
                      <div>
                        <strong>{s.name}</strong>
                        <div className="faint" style={{ fontSize: '0.8rem' }}>📍 {s.area} · {s.reports_count} reports</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="faint" style={{ fontSize: '0.83rem' }}>
                      {s.cuisine} · {VEG_LABEL[s.veg]} · {PRICE_LABEL[s.price]} · 🚶{s.walk_minutes} min
                    </div>
                  </td>
                  <td>
                    <div className="faint" style={{ fontSize: '0.83rem' }}>
                      {s.submitted_by_name || '—'}<br />{fmtAgo(s.created_at)}
                    </div>
                  </td>
                  <td><span className={`chip ${cls}`}>{label}</span></td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {s.status === 'pending' && (
                      <>
                        <button className="btn btn-green btn-sm" disabled={busyId === s.id} onClick={() => review(s.id, 'approved')}>✓ Approve</button>{' '}
                        <button className="btn btn-red btn-sm" disabled={busyId === s.id} onClick={() => review(s.id, 'rejected')}>✕ Reject</button>{' '}
                      </>
                    )}
                    <button className="btn btn-sm" disabled={busyId === s.id} onClick={() => setEditing(s)}>✎ Edit</button>{' '}
                    <Link className="btn btn-sm btn-ghost" to={`/spots/${s.id}`}>View</Link>{' '}
                    <button className="btn btn-sm btn-ghost" disabled={busyId === s.id} onClick={() => remove(s.id)} title="Delete">🗑</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditModal spot={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}
    </div>
  );
}
