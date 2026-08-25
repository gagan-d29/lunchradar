import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="page" style={{ textAlign: 'center', paddingTop: 80 }}>
      <div style={{ fontSize: 60 }}>🥣</div>
      <h1>404 — this page ran out of lunch</h1>
      <p className="sub">Nothing here. Head back and find a spot that's actually open.</p>
      <Link to="/" className="btn btn-primary">Back to LunchRadar</Link>
    </div>
  );
}
