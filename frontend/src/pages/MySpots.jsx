import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api, fmtAgo } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const STATUS_LABEL = {
  pending: { label: '⏳ Pending review', cls: 'chip-pending' },
  approved: { label: '✅ Live', cls: 'chip-open' },
  rejected: { label: '❌ Not approved', cls: 'chip-rejected' },
};

export default function MySpots() {
  const { user } = useAuth();
  const [subs, setSubs] = useState(null);

  useEffect(() => {
    if (!user) return;
    api('/me/submissions', { auth: true }).then((d) => setSubs(d.submissions)).catch(() => setSubs([]));
  }, [user]);

  if (!user) return <Navigate to="/login" replace />;
  if (!subs) return <div className="page"><div className="spinner" /></div>;

  return (
    <div className="page">
      <h1>My submissions</h1>
      <p className="sub">Track the spots you've added — they go live once an admin approves them.</p>

      {subs.length === 0 ? (
        <div className="empty">
          <span className="big-emoji">📝</span>
          You haven't added any spots yet.<br />
          <Link to="/submit" style={{ color: 'var(--primary)', fontWeight: 700 }}>Add your first spot →</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {subs.map((s) => {
            const st = STATUS_LABEL[s.status] || STATUS_LABEL.pending;
            return (
              <div key={s.id} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <strong>{s.name}</strong>
                  <div className="faint" style={{ fontSize: '0.84rem' }}>📍 {s.area} · submitted {fmtAgo(s.created_at)}</div>
                </div>
                <span className={`chip ${st.cls}`}>{st.label}</span>
                {s.status === 'approved' && <Link className="btn btn-sm" to={`/spots/${s.id}`}>View</Link>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
