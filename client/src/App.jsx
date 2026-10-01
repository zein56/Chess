import { useEffect, useState } from 'react';
import Lobby from './Lobby.jsx';
import Game from './Game.jsx';
import Local from './Local.jsx';

const route = () => location.hash.replace(/^#/, '') || '/';

export default function App() {
  const [name, setName] = useState(() => localStorage.getItem('chess_name') || '');
  const [draft, setDraft] = useState('');
  const [path, setPath] = useState(route());
  useEffect(() => { const h = () => setPath(route()); addEventListener('hashchange', h); return () => removeEventListener('hashchange', h); }, []);
  const go = (p) => { location.hash = p; };

  if (!name) {
    const submit = (e) => { e.preventDefault(); const n = draft.trim().slice(0, 16); if (n) { localStorage.setItem('chess_name', n); setName(n); } };
    return (
      <main className="welcome">
        <div className="mark" aria-hidden="true">♞</div>
        <h1>Chess</h1>
        <p>Pick a name and play. No sign-up.</p>
        <form onSubmit={submit}>
          <input autoFocus maxLength={16} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Your name" aria-label="Your name" />
          <button className="btn primary" disabled={!draft.trim()}>Continue</button>
        </form>
      </main>
    );
  }

  const m = path.match(/^\/game\/(\w+)/);
  return (
    <>
      <header className="top">
        <button className="brand" onClick={() => go('/')}>♞ Chess</button>
        <button className="who" onClick={() => { localStorage.removeItem('chess_name'); setName(''); }} title="Change name">{name}</button>
      </header>
      <main className="content">
        {m ? <Game key={m[1]} id={m[1]} name={name} onLeave={() => go('/')} />
          : path === '/local' ? <Local onLeave={() => go('/')} />
          : <Lobby name={name} go={go} />}
      </main>
    </>
  );
}
