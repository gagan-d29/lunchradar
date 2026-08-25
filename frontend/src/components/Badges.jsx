import { CROWD, fmtAgo, PRICE_LABEL, VEG_LABEL } from '../lib/api.js';

export function StatusPill({ status }) {
  return (
    <span className={`status-pill ${status.open ? 'open' : 'closed'}`}>
      <span className={`dot ${status.open ? 'dot-open' : 'dot-closed'}`} />
      {status.open ? 'Open now' : 'Closed'}
      {status.live && status.open && status.crowd && (
        <span style={{ opacity: 0.75 }}>· {CROWD[status.crowd].label}</span>
      )}
    </span>
  );
}

export function CrowdMeter({ crowd, live }) {
  if (!live || !crowd) return <span className="faint" style={{ fontSize: '0.78rem' }}>No live report yet</span>;
  const order = ['low', 'medium', 'high'];
  const idx = order.indexOf(crowd);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 130 }}>
      <div className="crowd-meter">
        {order.map((c, i) => (
          <div key={c} className={`seg ${i <= idx ? `on-${c}` : ''}`} style={{ width: 26 }} />
        ))}
      </div>
      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: CROWD[crowd].color }}>{CROWD[crowd].label}</span>
    </div>
  );
}

export function MetaChips({ spot }) {
  return (
    <div className="spot-meta">
      <span className="chip chip-neutral">{spot.cuisine}</span>
      <span className="chip chip-neutral">{VEG_LABEL[spot.veg]}</span>
      <span className="chip chip-neutral">{PRICE_LABEL[spot.price]}</span>
      <span className="chip chip-neutral">🚶 {spot.walk_minutes} min</span>
      <span className="chip chip-neutral">🕐 {spot.opens_at}–{spot.closes_at}</span>
    </div>
  );
}

export function StatusFooter({ status }) {
  return (
    <div className="spot-foot">
      {status.live ? (
        <span className="live-tag">● LIVE {fmtAgo(status.updated_at)}</span>
      ) : status.source === 'stale-report' ? (
        <span className="stale-tag">◐ Stale report · {fmtAgo(status.updated_at)}</span>
      ) : null}
      <span className="updated">{status.live ? `by ${status.updated_by}` : 'Based on opening hours'}</span>
    </div>
  );
}
