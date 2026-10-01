import { useEffect, useState } from 'react';
import Lobby from './Lobby.jsx';
import Game from './Game.jsx';
import Local from './Local.jsx';
import { isMuted, setMuted, play, unlock } from './sound.js';

function SoundBtn() {
  const [m, setM] = useState(isMuted());
  return (
    <button className="icon" aria-label={m ? 'Turn sound on' : 'Turn sound off'} onClick={() => { unlock(); setMuted(!m); setM(!m); if (m) play('move'); }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor" />{m ? <path d="m16 9 5 6m0-6-5 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />}</svg>
    </button>
  );
}

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
        <div className="right"><SoundBtn /><button className="who" onClick={() => { localStorage.removeItem('chess_name'); setName(''); }} title="Change name">{name}</button></div>
      </header>
      <main className="content">
        {m ? <Game key={m[1]} id={m[1]} name={name} onLeave={() => go('/')} />
          : path === '/local' ? <Local onLeave={() => go('/')} />
          : <Lobby name={name} go={go} />}
      </main>
    </>
  );
}
