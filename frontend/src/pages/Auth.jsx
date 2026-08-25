import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function AuthShell({ children, title, subtitle }) {
  return (
    <div className="page-narrow">
      <div className="card">
        <h1 style={{ textAlign: 'center' }}>{title}</h1>
        <p className="sub" style={{ textAlign: 'center' }}>{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

function AuthError({ msg }) {
  if (!msg) return null;
  return <div className="error-banner">⚠️ {msg}</div>;
}

export function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await login(email, password);
      nav('/');
    } catch (err) {
      setError(err.message);
    } finally { setBusy(false); }
  };

  return (
    <AuthShell title="Welcome back 👋" subtitle="Log in to report live status and add spots.">
      <AuthError msg={error} />
      <form onSubmit={submit}>
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@college.edu" required autoFocus />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
        </div>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
      <div style={{ marginTop: 16, background: 'var(--bg-soft)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: '0.84rem', color: 'var(--text-dim)' }}>
        <strong>Demo accounts</strong><br />
        Admin: <span className="mono">admin@lunchradar.app / admin123</span><br />
        Student: <span className="mono">asha@stu.lunchradar.app / student123</span>
      </div>
      <p className="muted" style={{ textAlign: 'center', marginBottom: 0 }}>New here? <Link to="/register" style={{ color: 'var(--primary)' }}>Create an account</Link></p>
    </AuthShell>
  );
}

export function Register() {
  const { user, register } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await register(name, email, password);
      nav('/');
    } catch (err) {
      setError(err.message);
    } finally { setBusy(false); }
  };

  return (
    <AuthShell title="Join LunchRadar 🍜" subtitle="Every report makes the next lunch break better for everyone.">
      <AuthError msg={error} />
      <form onSubmit={submit}>
        <div className="field">
          <label>Full name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required autoFocus />
        </div>
        <div className="field">
          <label>College / personal email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@college.edu" required />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" required minLength={6} />
        </div>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
      </form>
      <p className="muted" style={{ textAlign: 'center', marginBottom: 0 }}>Already have an account? <Link to="/login" style={{ color: 'var(--primary)' }}>Log in</Link></p>
    </AuthShell>
  );
}
