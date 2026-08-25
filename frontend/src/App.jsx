import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Home from './pages/Home.jsx';
import SpotDetail from './pages/SpotDetail.jsx';
import { Login, Register } from './pages/Auth.jsx';
import SubmitSpot from './pages/SubmitSpot.jsx';
import MySpots from './pages/MySpots.jsx';
import Admin from './pages/Admin.jsx';
import NotFound from './pages/NotFound.jsx';

const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);

function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <nav className="nav">
      <div className="nav-inner">
        <NavLink to="/" className="brand"><span className="logo">🍛</span> LunchRadar</NavLink>
        {user ? (
          <>
            <div className="nav-links">
              <NavLink to="/" end>Find a spot</NavLink>
              <NavLink to="/submit">Add a spot</NavLink>
              <NavLink to="/my-spots">My submissions</NavLink>
              {user.role === 'admin' && <NavLink to="/admin">Admin dashboard</NavLink>}
            </div>
            <div className="nav-right">
              <span className="user-chip"><span className="avatar">{user.name?.[0]?.toUpperCase()}</span> {user.name}</span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { logout(); nav('/login'); }}
              >
                Log out
              </button>
            </div>
          </>
        ) : (
          <div className="nav-right">
            <NavLink to="/login" className="btn btn-ghost btn-sm">Log in</NavLink>
            <NavLink to="/register" className="btn btn-primary btn-sm">Sign up</NavLink>
          </div>
        )}
      </div>
    </nav>
  );
}

function Toasts() {
  const { toasts } = useContext(ToastCtx);
  if (!toasts.length) return null;
  return (
    <div className="toast-wrap">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type || ''}`}>{t.msg}</div>
      ))}
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const toast = useCallback((msg, type = 'success') => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  if (loading) return <div className="spinner" style={{ marginTop: 120 }} />;

  return (
    <ToastCtx.Provider value={{ toasts, toast }}>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Home />} />
        <Route path="/spots/:id" element={<SpotDetail />} />
        <Route path="/submit" element={<SubmitSpot />} />
        <Route path="/my-spots" element={<MySpots />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {user && <div className="footer">LunchRadar · Built for students who can't afford a wasted lunch break 🍛</div>}
      <Toasts />
    </ToastCtx.Provider>
  );
}
