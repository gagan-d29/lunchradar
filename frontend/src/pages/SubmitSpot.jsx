import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../App.jsx';

const EMPTY = {
  name: '', emoji: '🍽️', description: '', area: '', cuisine: '',
  price: '1', veg: 'both', walk_minutes: '15', opens_at: '11:00', closes_at: '15:30',
};

const EMOJIS = ['🍽️', '🍛', '🍕', '🍔', '🥟', '🐟', '🍲', '🥗', '🍨', '🥤', '🌮', '🍜', '🥞', '☕', '🫓', '🍗'];

export default function SubmitSpot() {
  const { user } = useAuth();
  const { toast } = useToast();
  const nav = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!user) return <Navigate to="/login" replace />;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await api('/spots', { method: 'POST', auth: true, body: { ...form, price: Number(form.price), walk_minutes: Number(form.walk_minutes) } });
      toast('Spot submitted! An admin will review it shortly. 🎉');
      nav('/my-spots');
    } catch (err) {
      setError(err.message);
    } finally { setBusy(false); }
  };

  return (
    <div className="page page-narrow">
      <h1>Add a lunch spot 🆕</h1>
      <p className="sub">Know a hidden gem near campus? Submit it — an admin approves it before it goes live.</p>

      {error && <div className="error-banner">⚠️ {error}</div>}

      <form className="card" onSubmit={submit}>
        <div className="field">
          <label>Spot name *</label>
          <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Shetty Lunch Home" required maxLength={80} />
        </div>

        <div className="field">
          <label>Pick an icon</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {EMOJIS.map((em) => (
              <button key={em} type="button"
                onClick={() => set('emoji', em)}
                style={{
                  fontSize: 20, padding: '7px 10px', borderRadius: 10, border: form.emoji === em ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: form.emoji === em ? 'var(--primary-soft)' : 'var(--bg-soft)',
                }}>{em}</button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Description</label>
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)}
            placeholder="What's good here? Any student tips? Keep it under 500 characters…" maxLength={500} />
        </div>

        <div className="field-row">
          <div className="field">
            <label>Area / street *</label>
            <input value={form.area} onChange={(e) => set('area', e.target.value)} placeholder="e.g. Hampankatta" required maxLength={80} />
          </div>
          <div className="field">
            <label>Cuisine *</label>
            <input value={form.cuisine} onChange={(e) => set('cuisine', e.target.value)} placeholder="e.g. South Indian" required maxLength={40} list="cuisines" />
            <datalist id="cuisines">
              {['South Indian', 'Udupi', 'Seafood', 'North Indian', 'Fast Food', 'Street Food', 'Chinese', 'Kerala', 'Café', 'Dessert'].map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
        </div>

        <div className="field-row-3">
          <div className="field">
            <label>Budget *</label>
            <select value={form.price} onChange={(e) => set('price', e.target.value)}>
              <option value="1">₹ Budget</option>
              <option value="2">₹₹ Mid</option>
              <option value="3">₹₹₹ Splurge</option>
            </select>
          </div>
          <div className="field">
            <label>Type *</label>
            <select value={form.veg} onChange={(e) => set('veg', e.target.value)}>
              <option value="veg">Pure Veg</option>
              <option value="nonveg">Non-veg</option>
              <option value="both">Veg + Non-veg</option>
            </select>
          </div>
          <div className="field">
            <label>Walk from campus (min) *</label>
            <input type="number" min="1" max="180" value={form.walk_minutes} onChange={(e) => set('walk_minutes', e.target.value)} required />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label>Opens at *</label>
            <input type="time" value={form.opens_at} onChange={(e) => set('opens_at', e.target.value)} required />
          </div>
          <div className="field">
            <label>Closes at *</label>
            <input type="time" value={form.closes_at} onChange={(e) => set('closes_at', e.target.value)} required />
          </div>
        </div>
        <p className="hint" style={{ marginTop: -6 }}>Typical lunch-window hours! If it doesn't serve lunch, students won't find it useful.</p>

        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Submitting…' : 'Submit for admin review'}
        </button>
      </form>
    </div>
  );
}
